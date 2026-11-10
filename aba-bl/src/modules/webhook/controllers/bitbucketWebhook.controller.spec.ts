import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  ActivityEventType,
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
} from '@aba/database';
import { BitbucketWebhookController } from './bitbucketWebhook.controller';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';

const SECRET = 'plain-secret';

function sign(body: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

function reqFor(bodyObj: Record<string, unknown>) {
  return {
    rawBody: Buffer.from(JSON.stringify(bodyObj), 'utf8'),
    body: bodyObj,
  } as any;
}

/** Builds a Bitbucket Cloud repo:push payload. */
function pushPayload(
  ...changes: ({ type: string; name: string } | null)[]
): Record<string, unknown> {
  return { push: { changes: changes.map((c) => ({ new: c })) } };
}

const branch = (name: string) => ({ type: 'branch', name });

describe('BitbucketWebhookController', () => {
  let controller: BitbucketWebhookController;
  let connections: jest.Mocked<RepositoryConnectionRepository>;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let scheduler: jest.Mocked<PackageRescanSchedulerService>;
  let activityLog: jest.Mocked<ActivityLogRepository>;

  const mockService = {
    id: 5,
    companyId: 1,
    environmentId: 2,
    activePackages: [],
  };

  function connection(overrides: Record<string, unknown> = {}) {
    return {
      id: 10,
      provider: RepositoryProvider.BITBUCKET,
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
    } as any;
  }

  async function deliver(
    eventKey: string | undefined,
    payload: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
  ) {
    connections.findByWebhookToken.mockResolvedValue(connection(overrides));
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);
    const req = reqFor(payload);
    return controller.handle(
      'token-1',
      sign(req.rawBody.toString('utf8')),
      eventKey,
      req,
    );
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BitbucketWebhookController],
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
          useValue: {
            publishScanForService: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get(BitbucketWebhookController);
    connections = module.get(RepositoryConnectionRepository);
    serviceRepository = module.get(ServiceRepository);
    scheduler = module.get(PackageRescanSchedulerService);
    activityLog = module.get(ActivityLogRepository);
  });

  describe('token and provider handling', () => {
    it('throws NotFoundException when the token is unknown', async () => {
      connections.findByWebhookToken.mockResolvedValue(null);

      await expect(
        controller.handle('bad', 'sha256=x', 'repo:push', reqFor({})),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the connection is paused', async () => {
      connections.findByWebhookToken.mockResolvedValue(
        connection({ status: RepositoryConnectionStatus.PAUSED }),
      );

      await expect(
        controller.handle('token-1', 'sha256=x', 'repo:push', reqFor({})),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the token belongs to a GitHub connection', async () => {
      connections.findByWebhookToken.mockResolvedValue(
        connection({ provider: RepositoryProvider.GITHUB }),
      );
      const req = reqFor(pushPayload(branch('main')));

      await expect(
        controller.handle(
          'token-1',
          sign(req.rawBody.toString('utf8')),
          'repo:push',
          req,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });
  });

  describe('signature verification', () => {
    beforeEach(() => {
      connections.findByWebhookToken.mockResolvedValue(connection());
    });

    it('rejects an invalid signature without recording a delivery', async () => {
      await expect(
        controller.handle(
          'token-1',
          'sha256=wrong',
          'repo:push',
          reqFor(pushPayload(branch('main'))),
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(connections.recordDelivery).not.toHaveBeenCalled();
    });

    it('rejects a missing signature header', async () => {
      await expect(
        controller.handle(
          'token-1',
          undefined,
          'repo:push',
          reqFor(pushPayload(branch('main'))),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a missing raw body', async () => {
      await expect(
        controller.handle('token-1', 'sha256=abc', 'repo:push', {
          body: pushPayload(branch('main')),
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a signature made with another secret (e.g. before rotation)', async () => {
      const req = reqFor(pushPayload(branch('main')));

      await expect(
        controller.handle(
          'token-1',
          sign(req.rawBody.toString('utf8'), 'old-secret'),
          'repo:push',
          req,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('verifies the signature before acting on a ping', async () => {
      await expect(
        controller.handle('token-1', 'sha256=bad', 'diagnostics:ping', reqFor({})),
      ).rejects.toThrow(UnauthorizedException);
      expect(connections.recordDelivery).not.toHaveBeenCalled();
    });
  });

  describe('ping', () => {
    it('acknowledges diagnostics:ping without triggering a scan', async () => {
      const result = await deliver('diagnostics:ping', {});

      expect(result.data).toEqual({ triggered: false });
      expect(connections.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
      });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });
  });

  describe('event matching', () => {
    it('triggers on a push to the watched branch', async () => {
      const result = await deliver('repo:push', pushPayload(branch('main')));

      expect(result.data).toEqual({ triggered: true });
      expect(serviceRepository.findByIdWithActivePackages).toHaveBeenCalledWith(5);
      expect(scheduler.publishScanForService).toHaveBeenCalledWith(mockService);
      expect(connections.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: true,
      });
    });

    it('triggers when the watched branch is one of several refs updated in one push', async () => {
      const result = await deliver(
        'repo:push',
        pushPayload(branch('feature/x'), { type: 'tag', name: 'v1' }, branch('main')),
      );

      expect(result.data).toEqual({ triggered: true });
    });

    it('ignores a push to a different branch', async () => {
      const result = await deliver('repo:push', pushPayload(branch('develop')));

      expect(result.data).toEqual({ triggered: false });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(connections.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
      });
    });

    it('ignores a tag whose name equals the watched branch', async () => {
      const result = await deliver(
        'repo:push',
        pushPayload({ type: 'tag', name: 'main' }),
      );

      expect(result.data).toEqual({ triggered: false });
    });

    it('ignores a branch deletion (new is null)', async () => {
      const result = await deliver('repo:push', pushPayload(null));

      expect(result.data).toEqual({ triggered: false });
    });

    it('matches branch names case-sensitively and exactly', async () => {
      for (const name of ['Main', 'main-hotfix', 'mai']) {
        const result = await deliver('repo:push', pushPayload(branch(name)));
        expect(result.data).toEqual({ triggered: false });
      }
    });

    it('matches a watched branch that contains slashes', async () => {
      const result = await deliver(
        'repo:push',
        pushPayload(branch('release/2026-q1')),
        { watchedBranch: 'release/2026-q1' },
      );

      expect(result.data).toEqual({ triggered: true });
    });

    it('ignores a push payload with no changes, or with no push key at all', async () => {
      for (const payload of [{}, { push: {} }, { push: { changes: [] } }]) {
        const result = await deliver('repo:push', payload);
        expect(result.data).toEqual({ triggered: false });
      }
    });

    it('ignores unrelated events and a missing X-Event-Key', async () => {
      for (const key of [
        'pullrequest:created',
        'repo:fork',
        'repo:commit_status_updated',
        undefined,
      ]) {
        const result = await deliver(key, pushPayload(branch('main')));
        expect(result.data).toEqual({ triggered: false });
      }
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('does not treat GitHub-style events as Bitbucket events', async () => {
      const result = await deliver('push', { ref: 'refs/heads/main' });

      expect(result.data).toEqual({ triggered: false });
    });
  });

  describe('INSTANT mode', () => {
    it('logs a REPOSITORY_SCAN_TRIGGERED entry that names Bitbucket', async () => {
      await deliver('repo:push', pushPayload(branch('main')));

      expect(activityLog.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: 1,
        environmentId: 2,
        serviceId: 5,
        metadata: {
          provider: RepositoryProvider.BITBUCKET,
          via: 'repo:push',
          branch: 'main',
          triggerMode: RepositoryTriggerMode.INSTANT,
        },
      });
    });

    it('still records the trigger but does not scan when the service no longer exists', async () => {
      connections.findByWebhookToken.mockResolvedValue(connection());
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(null);
      const req = reqFor(pushPayload(branch('main')));

      const result = await controller.handle(
        'token-1',
        sign(req.rawBody.toString('utf8')),
        'repo:push',
        req,
      );

      expect(result.data).toEqual({ triggered: true });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(activityLog.create).not.toHaveBeenCalled();
      expect(connections.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: true,
      });
    });

    it('does not log activity for ignored deliveries', async () => {
      await deliver('repo:push', pushPayload(branch('other')));
      await deliver('diagnostics:ping', {});

      expect(activityLog.create).not.toHaveBeenCalled();
    });
  });

  describe('PUSH_COUNT mode', () => {
    const pushCount = (threshold: number | null, pending: number) => ({
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      pushCountThreshold: threshold,
      pendingPushCount: pending,
    });

    it('accumulates below the threshold', async () => {
      const result = await deliver(
        'repo:push',
        pushPayload(branch('main')),
        pushCount(3, 1),
      );

      expect(result.data).toEqual({ triggered: false });
      expect(connections.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
        pendingPushCount: 2,
      });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('fires when the count reaches the threshold', async () => {
      const result = await deliver(
        'repo:push',
        pushPayload(branch('main')),
        pushCount(3, 2),
      );

      expect(result.data).toEqual({ triggered: true });
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
    });

    it('fires immediately for a threshold of 1, a null threshold, or an already-exceeded count', async () => {
      for (const overrides of [pushCount(1, 0), pushCount(null, 0), pushCount(2, 9)]) {
        const result = await deliver(
          'repo:push',
          pushPayload(branch('main')),
          overrides,
        );
        expect(result.data).toEqual({ triggered: true });
      }
    });
  });

  describe('TIME_INTERVAL mode', () => {
    it('only accumulates and never scans from the webhook', async () => {
      const result = await deliver('repo:push', pushPayload(branch('main')), {
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        intervalDays: 7,
        pendingPushCount: 4,
      });

      expect(result.data).toEqual({ triggered: false });
      expect(connections.recordDelivery).toHaveBeenCalledWith(10, {
        triggered: false,
        pendingPushCount: 5,
      });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });
  });
});
