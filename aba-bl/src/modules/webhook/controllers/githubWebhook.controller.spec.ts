import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  ActivityEventType,
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
} from '@aba/database';
import { GithubWebhookController } from './githubWebhook.controller';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';

const SECRET = 'plain-secret';

function sign(body: string): string {
  return 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
}

function reqFor(bodyObj: Record<string, unknown>) {
  const bodyString = JSON.stringify(bodyObj);
  return {
    rawBody: Buffer.from(bodyString, 'utf8'),
    body: bodyObj,
  } as any;
}

describe('GithubWebhookController', () => {
  let controller: GithubWebhookController;
  let repositoryConnectionRepository: jest.Mocked<RepositoryConnectionRepository>;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let packageRescanSchedulerService: jest.Mocked<PackageRescanSchedulerService>;
  let activityLogRepository: jest.Mocked<ActivityLogRepository>;

  const mockService = {
    id: 5,
    companyId: 1,
    environmentId: 2,
    activePackages: [],
  };

  function connection(overrides: Record<string, unknown> = {}) {
    return {
      id: 10,
      owner: 'acme',
      name: 'billing-api',
      watchedBranch: 'main',
      webhookToken: 'token-1',
      webhookSecretEnc: 'enc(plain-secret)',
      status: RepositoryConnectionStatus.ACTIVE,
      triggerMode: RepositoryTriggerMode.INSTANT,
      pushCountThreshold: null,
      intervalDays: null,
      pendingPushCount: 0,
      serviceId: 5,
      ...overrides,
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubWebhookController],
      providers: [
        {
          provide: RepositoryConnectionRepository,
          useValue: {
            findByWebhookToken: jest.fn(),
            recordDelivery: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CryptoService,
          useValue: { decrypt: jest.fn().mockReturnValue(SECRET) },
        },
        {
          provide: ServiceRepository,
          useValue: { findByIdWithActivePackages: jest.fn() },
        },
        {
          provide: PackageRescanSchedulerService,
          useValue: { publishScanForService: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get(GithubWebhookController);
    repositoryConnectionRepository = module.get(RepositoryConnectionRepository);
    serviceRepository = module.get(ServiceRepository);
    packageRescanSchedulerService = module.get(PackageRescanSchedulerService);
    activityLogRepository = module.get(ActivityLogRepository);
  });

  it('throws NotFoundException when the token is unknown', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(null);

    await expect(
      controller.handle('bad-token', 'sha256=x', 'push', reqFor({})),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the connection is paused', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection({ status: RepositoryConnectionStatus.PAUSED }) as any,
    );

    await expect(
      controller.handle('token-1', 'sha256=x', 'push', reqFor({})),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws UnauthorizedException when the signature is invalid', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection() as any,
    );
    const req = reqFor({ ref: 'refs/heads/main' });

    await expect(
      controller.handle('token-1', 'sha256=wrong', 'push', req),
    ).rejects.toThrow(UnauthorizedException);
    expect(repositoryConnectionRepository.recordDelivery).not.toHaveBeenCalled();
  });

  it('acknowledges a ping event without triggering a scan', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection() as any,
    );
    const req = reqFor({ zen: 'hello' });
    const signature = sign(req.rawBody.toString('utf8'));

    const result = await controller.handle('token-1', signature, 'ping', req);

    expect(result).toEqual({ success: true, error: null, data: { triggered: false } });
    expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
      triggered: false,
    });
    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
  });

  it('does not trigger a push to a non-watched branch', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection() as any,
    );
    const req = reqFor({ ref: 'refs/heads/feature/x' });
    const signature = sign(req.rawBody.toString('utf8'));

    const result = await controller.handle('token-1', signature, 'push', req);

    expect(result.data).toEqual({ triggered: false });
    expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
      triggered: false,
    });
    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
  });

  it('does not trigger a release that was not published', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection() as any,
    );
    const req = reqFor({ action: 'created' });
    const signature = sign(req.rawBody.toString('utf8'));

    const result = await controller.handle('token-1', signature, 'release', req);

    expect(result.data).toEqual({ triggered: false });
    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
  });

  it('triggers immediately in INSTANT mode on a matching push', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection({ triggerMode: RepositoryTriggerMode.INSTANT }) as any,
    );
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);
    const req = reqFor({ ref: 'refs/heads/main' });
    const signature = sign(req.rawBody.toString('utf8'));

    const result = await controller.handle('token-1', signature, 'push', req);

    expect(result.data).toEqual({ triggered: true });
    expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalledWith(
      mockService,
    );
    expect(activityLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: mockService.companyId,
        environmentId: mockService.environmentId,
        serviceId: mockService.id,
      }),
    );
    expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
      triggered: true,
    });
  });

  it('triggers on a published release the same as a matching push', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection({ triggerMode: RepositoryTriggerMode.INSTANT }) as any,
    );
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);
    const req = reqFor({ action: 'published' });
    const signature = sign(req.rawBody.toString('utf8'));

    const result = await controller.handle('token-1', signature, 'release', req);

    expect(result.data).toEqual({ triggered: true });
    expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalled();
  });

  it('does not scan when the underlying service no longer exists, but still records the trigger', async () => {
    repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
      connection({ triggerMode: RepositoryTriggerMode.INSTANT }) as any,
    );
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(null);
    const req = reqFor({ ref: 'refs/heads/main' });
    const signature = sign(req.rawBody.toString('utf8'));

    const result = await controller.handle('token-1', signature, 'push', req);

    expect(result.data).toEqual({ triggered: true });
    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    expect(activityLogRepository.create).not.toHaveBeenCalled();
  });

  describe('PUSH_COUNT mode', () => {
    it('accumulates without triggering until the threshold is reached', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 3,
          pendingPushCount: 1,
        }) as any,
      );
      const req = reqFor({ ref: 'refs/heads/main' });
      const signature = sign(req.rawBody.toString('utf8'));

      const result = await controller.handle('token-1', signature, 'push', req);

      expect(result.data).toEqual({ triggered: false });
      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
        pendingPushCount: 2,
      });
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });

    it('triggers once the accumulated count reaches the threshold', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 3,
          pendingPushCount: 2,
        }) as any,
      );
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);
      const req = reqFor({ ref: 'refs/heads/main' });
      const signature = sign(req.rawBody.toString('utf8'));

      const result = await controller.handle('token-1', signature, 'push', req);

      expect(result.data).toEqual({ triggered: true });
      expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalled();
    });
  });

  describe('TIME_INTERVAL mode', () => {
    it('never triggers directly from the webhook, only accumulates', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection({
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          intervalDays: 7,
          pendingPushCount: 4,
        }) as any,
      );
      const req = reqFor({ ref: 'refs/heads/main' });
      const signature = sign(req.rawBody.toString('utf8'));

      const result = await controller.handle('token-1', signature, 'push', req);

      expect(result.data).toEqual({ triggered: false });
      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
        pendingPushCount: 5,
      });
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });
  });

  describe('request authentication edge cases', () => {
    it('rejects a delivery with no signature header', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection() as any,
      );

      await expect(
        controller.handle(
          'token-1',
          undefined,
          'push',
          reqFor({ ref: 'refs/heads/main' }),
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });

    it('rejects a delivery whose raw body is missing', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection() as any,
      );
      const req = { body: { ref: 'refs/heads/main' } } as any;

      await expect(
        controller.handle('token-1', 'sha256=abc', 'push', req),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a signature computed with a different secret (e.g. the pre-rotation secret)', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection() as any,
      );
      const req = reqFor({ ref: 'refs/heads/main' });
      const staleSignature =
        'sha256=' +
        createHmac('sha256', 'old-rotated-secret')
          .update(req.rawBody)
          .digest('hex');

      await expect(
        controller.handle('token-1', staleSignature, 'push', req),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('verifies the signature before acting on a ping event', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection() as any,
      );

      await expect(
        controller.handle('token-1', 'sha256=bad', 'ping', reqFor({ zen: 'x' })),
      ).rejects.toThrow(UnauthorizedException);
      expect(repositoryConnectionRepository.recordDelivery).not.toHaveBeenCalled();
    });

    it('does not look the service up for an unknown token', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(null);

      await expect(
        controller.handle('nope', undefined, undefined, reqFor({})),
      ).rejects.toThrow(NotFoundException);
      expect(serviceRepository.findByIdWithActivePackages).not.toHaveBeenCalled();
    });
  });

  describe('event matching edge cases', () => {
    async function deliver(
      event: string | undefined,
      body: Record<string, unknown>,
      overrides: Record<string, unknown> = {},
    ) {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection(overrides) as any,
      );
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);
      const req = reqFor(body);
      return controller.handle(
        'token-1',
        sign(req.rawBody.toString('utf8')),
        event,
        req,
      );
    }

    it('ignores a push to a tag ref', async () => {
      const result = await deliver('push', { ref: 'refs/tags/main' });
      expect(result.data).toEqual({ triggered: false });
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });

    it('matches branch names case-sensitively', async () => {
      const result = await deliver('push', { ref: 'refs/heads/Main' });
      expect(result.data).toEqual({ triggered: false });
    });

    it('does not treat a branch that merely starts with the watched name as a match', async () => {
      const result = await deliver('push', { ref: 'refs/heads/main-hotfix' });
      expect(result.data).toEqual({ triggered: false });
    });

    it('matches a watched branch containing slashes', async () => {
      const result = await deliver(
        'push',
        { ref: 'refs/heads/release/2024-q4' },
        { watchedBranch: 'release/2024-q4' },
      );
      expect(result.data).toEqual({ triggered: true });
    });

    it('ignores a push event with no ref in the payload', async () => {
      const result = await deliver('push', {});
      expect(result.data).toEqual({ triggered: false });
    });

    it('ignores release events that are not "published" (created, edited, deleted)', async () => {
      for (const action of ['created', 'edited', 'deleted', 'prereleased']) {
        const result = await deliver('release', { action });
        expect(result.data).toEqual({ triggered: false });
      }
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });

    it('triggers on a published release regardless of the watched branch', async () => {
      const result = await deliver(
        'release',
        { action: 'published' },
        { watchedBranch: 'some-other-branch' },
      );
      expect(result.data).toEqual({ triggered: true });
    });

    it('ignores unrelated event types (issues, pull_request) and a missing event header', async () => {
      for (const event of ['issues', 'pull_request', 'workflow_run', undefined]) {
        const result = await deliver(event, {
          ref: 'refs/heads/main',
          action: 'published',
        });
        expect(result.data).toEqual({ triggered: false });
      }
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });

    it('records the delivery (lastPingedAt) for non-matching events without touching pendingPushCount', async () => {
      await deliver('push', { ref: 'refs/heads/other' });
      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
      });
    });

    it('logs which event and branch triggered the scan', async () => {
      await deliver('push', { ref: 'refs/heads/main' });
      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
          serviceId: 5,
          metadata: {
            via: 'push',
            branch: 'main',
            triggerMode: RepositoryTriggerMode.INSTANT,
          },
        }),
      );
    });
  });

  describe('PUSH_COUNT edge cases', () => {
    async function deliverPush(overrides: Record<string, unknown>) {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          ...overrides,
        }) as any,
      );
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);
      const req = reqFor({ ref: 'refs/heads/main' });
      return controller.handle(
        'token-1',
        sign(req.rawBody.toString('utf8')),
        'push',
        req,
      );
    }

    it('triggers on the very first push when the threshold is 1', async () => {
      const result = await deliverPush({
        pushCountThreshold: 1,
        pendingPushCount: 0,
      });
      expect(result.data).toEqual({ triggered: true });
    });

    it('treats a missing threshold as 1 so the connection never gets stuck', async () => {
      const result = await deliverPush({
        pushCountThreshold: null,
        pendingPushCount: 0,
      });
      expect(result.data).toEqual({ triggered: true });
    });

    it('still triggers when the pending count already exceeds a lowered threshold', async () => {
      const result = await deliverPush({
        pushCountThreshold: 2,
        pendingPushCount: 9,
      });
      expect(result.data).toEqual({ triggered: true });
    });

    it('does not trigger one push short of the threshold', async () => {
      const result = await deliverPush({
        pushCountThreshold: 5,
        pendingPushCount: 3,
      });
      expect(result.data).toEqual({ triggered: false });
      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
        pendingPushCount: 4,
      });
    });

    it('records a triggered delivery (which resets the pending counter) once it fires', async () => {
      await deliverPush({ pushCountThreshold: 2, pendingPushCount: 1 });
      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: true,
      });
    });
  });

  describe('TIME_INTERVAL edge cases', () => {
    it('accumulates on a published release too, without triggering', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection({
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          intervalDays: 3,
          pendingPushCount: 0,
        }) as any,
      );
      const req = reqFor({ action: 'published' });

      const result = await controller.handle(
        'token-1',
        sign(req.rawBody.toString('utf8')),
        'release',
        req,
      );

      expect(result.data).toEqual({ triggered: false });
      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
        pendingPushCount: 1,
      });
    });
  });

  describe('provider isolation', () => {
    it('answers 404 for a token that belongs to a Bitbucket connection, even with a valid signature', async () => {
      repositoryConnectionRepository.findByWebhookToken.mockResolvedValue(
        connection({ provider: RepositoryProvider.BITBUCKET }) as any,
      );
      const req = reqFor({ ref: 'refs/heads/main' });

      await expect(
        controller.handle(
          'token-1',
          sign(req.rawBody.toString('utf8')),
          'push',
          req,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });
  });
});
