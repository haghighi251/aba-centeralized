import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import {
  ActivityEventType,
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
} from '@aba/database';
import { BitbucketWebhookController } from '@/modules/webhook/controllers/bitbucketWebhook.controller';
import { GithubWebhookController } from '@/modules/webhook/controllers/githubWebhook.controller';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  createRepositoryConnectionRepositoryMock,
  MockedRepositoryConnectionRepository,
} from '@test/__mocks__/repository-connection/repositories/repositoryConnection.repository.mock';

/**
 * E2E tests for POST /webhooks/bitbucket/:webhookToken — the public endpoint
 * Bitbucket Cloud calls. The app is created with rawBody: true exactly like
 * main.ts so the HMAC (X-Hub-Signature: sha256=...) is verified over the
 * real bytes on the wire. No AuthGuard: the signature is the only auth.
 */
describe('BitbucketWebhookController (e2e)', () => {
  let app: INestApplication;
  let connections: MockedRepositoryConnectionRepository;
  let serviceRepository: { findByIdWithActivePackages: jest.Mock };
  let scheduler: { publishScanForService: jest.Mock };
  let activityLog: { create: jest.Mock };

  const SECRET = 'plain-bitbucket-secret';
  const TOKEN = 'bb-live-token';

  const activeService = {
    id: 1,
    companyId: 1,
    environmentId: 1,
    activePackages: [
      { id: 100, ecosystem: 'NPM', name: 'lodash', version: '4.17.15' },
    ],
  };

  const sign = (body: string, secret = SECRET) =>
    'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  const branchChange = (name: string) => ({ new: { type: 'branch', name } });

  const pushBody = (...changes: unknown[]) => ({ push: { changes } });

  /** Sends a delivery the way Bitbucket Cloud does. */
  function deliver(
    eventKey: string | undefined,
    payload: Record<string, unknown>,
    options: { token?: string; signature?: string | null; body?: string } = {},
  ) {
    const body = options.body ?? JSON.stringify(payload);
    let req = request(app.getHttpServer())
      .post(`/webhooks/bitbucket/${options.token ?? TOKEN}`)
      .set('Content-Type', 'application/json');
    if (eventKey !== undefined) req = req.set('X-Event-Key', eventKey);
    if (options.signature !== null) {
      req = req.set('X-Hub-Signature', options.signature ?? sign(body));
    }
    return req.send(body);
  }

  const push = (branch = 'main') =>
    deliver('repo:push', pushBody(branchChange(branch)));

  const stored = () => [...connections.rows.values()][0];

  beforeEach(async () => {
    connections = createRepositoryConnectionRepositoryMock();
    connections.seed({
      provider: RepositoryProvider.BITBUCKET,
      serviceId: 1,
      webhookToken: TOKEN,
      webhookSecretEnc: `enc(${SECRET})`,
    });
    serviceRepository = {
      findByIdWithActivePackages: jest.fn().mockResolvedValue(activeService),
    };
    scheduler = { publishScanForService: jest.fn().mockResolvedValue(undefined) };
    activityLog = { create: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BitbucketWebhookController, GithubWebhookController],
      providers: [
        { provide: RepositoryConnectionRepository, useValue: connections },
        { provide: ServiceRepository, useValue: serviceRepository },
        { provide: PackageRescanSchedulerService, useValue: scheduler },
        { provide: ActivityLogRepository, useValue: activityLog },
        {
          provide: CryptoService,
          useValue: { decrypt: jest.fn((v: string) => v.slice(4, -1)) },
        },
      ],
    }).compile();

    app = module.createNestApplication({ rawBody: true });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('token handling', () => {
    it('returns 404 for an unknown token', async () => {
      await deliver('repo:push', pushBody(branchChange('main')), {
        token: 'nope',
      }).expect(HttpStatus.NOT_FOUND);

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('returns 404 for a paused connection', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        status: RepositoryConnectionStatus.PAUSED,
      });

      await push().expect(HttpStatus.NOT_FOUND);
    });

    it('answers unknown and paused tokens identically', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        status: RepositoryConnectionStatus.PAUSED,
      });

      const paused = await push();
      const unknown = await deliver('repo:push', pushBody(branchChange('main')), {
        token: 'nope',
      });

      expect(paused.status).toBe(unknown.status);
      expect(paused.body).toEqual(unknown.body);
    });

    it('checks the token before the signature', async () => {
      await deliver('repo:push', {}, { token: 'nope', signature: 'sha256=bad' }).expect(
        HttpStatus.NOT_FOUND,
      );
    });

    it('does not accept GET', async () => {
      await request(app.getHttpServer())
        .get(`/webhooks/bitbucket/${TOKEN}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('needs no Authorization header or CSRF token', async () => {
      await push().expect(HttpStatus.OK);
    });
  });

  describe('provider isolation', () => {
    it('a Bitbucket token is a 404 on the GitHub endpoint, even with a valid signature', async () => {
      const body = JSON.stringify({ ref: 'refs/heads/main' });

      await request(app.getHttpServer())
        .post(`/webhooks/github/${TOKEN}`)
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', sign(body))
        .send(body)
        .expect(HttpStatus.NOT_FOUND);

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('a GitHub token is a 404 on the Bitbucket endpoint, even with a valid signature', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        provider: RepositoryProvider.GITHUB,
      });

      await push().expect(HttpStatus.NOT_FOUND);

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('ignores GitHub-style headers sent to the Bitbucket endpoint', async () => {
      const body = JSON.stringify({ ref: 'refs/heads/main' });

      const res = await request(app.getHttpServer())
        .post(`/webhooks/bitbucket/${TOKEN}`)
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', sign(body))
        .send(body);

      // No X-Hub-Signature -> not authenticated.
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('signature verification', () => {
    it('returns 401 when the X-Hub-Signature header is missing', async () => {
      await deliver('repo:push', pushBody(branchChange('main')), {
        signature: null,
      }).expect(HttpStatus.UNAUTHORIZED);

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(connections.recordDelivery).not.toHaveBeenCalled();
    });

    it('returns 401 for a signature made with the wrong secret', async () => {
      const body = JSON.stringify(pushBody(branchChange('main')));

      await deliver('repo:push', {}, {
        body,
        signature: sign(body, 'other-secret'),
      }).expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 401 when the body was altered after signing', async () => {
      const signed = JSON.stringify(pushBody(branchChange('other')));
      const sent = JSON.stringify(pushBody(branchChange('main')));

      await deliver('repo:push', {}, { body: sent, signature: sign(signed) }).expect(
        HttpStatus.UNAUTHORIZED,
      );

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('returns 401 when only the JSON whitespace differs from what was signed', async () => {
      const compact = JSON.stringify(pushBody(branchChange('main')));
      const pretty = JSON.stringify(pushBody(branchChange('main')), null, 2);

      await deliver('repo:push', {}, { body: pretty, signature: sign(compact) }).expect(
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('accepts a pretty-printed body when the signature covers those bytes', async () => {
      const pretty = JSON.stringify(pushBody(branchChange('main')), null, 2);

      await deliver('repo:push', {}, { body: pretty }).expect(HttpStatus.OK);
    });

    it('returns 401 for a missing prefix, wrong case, other algorithm, truncation or non-hex', async () => {
      const body = JSON.stringify(pushBody(branchChange('main')));
      const hex = createHmac('sha256', SECRET).update(body).digest('hex');

      for (const signature of [
        hex,
        `SHA256=${hex}`,
        `sha1=${hex}`,
        '',
        `sha256=${hex.slice(0, -2)}`,
        'sha256=' + 'zz'.repeat(32),
      ]) {
        await deliver('repo:push', {}, { body, signature }).expect(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('verifies the signature before honouring a ping', async () => {
      await deliver('diagnostics:ping', {}, { signature: 'sha256=bad' }).expect(
        HttpStatus.UNAUTHORIZED,
      );

      expect(stored().lastPingedAt).toBeNull();
    });

    it('rejects the old secret after a rotation but accepts the new one', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        webhookSecretEnc: 'enc(rotated)',
      });
      const body = JSON.stringify(pushBody(branchChange('main')));

      await deliver('repo:push', {}, { body, signature: sign(body) }).expect(
        HttpStatus.UNAUTHORIZED,
      );
      await deliver('repo:push', {}, {
        body,
        signature: sign(body, 'rotated'),
      }).expect(HttpStatus.OK);
    });

    it('handles a large signed payload and multibyte characters', async () => {
      await deliver('repo:push', {
        push: {
          changes: [
            {
              ...branchChange('main'),
              commits: Array.from({ length: 300 }, (_, i) => ({
                hash: `h${i}`,
                message: 'Fix ✓ naïve – 日本語 🚀'.repeat(5),
              })),
            },
          ],
        },
      }).expect(HttpStatus.OK);
    });
  });

  describe('diagnostics:ping (Bitbucket "Test connection")', () => {
    it('returns 200 { triggered: false } and records lastPingedAt', async () => {
      const res = await deliver('diagnostics:ping', {}).expect(HttpStatus.OK);

      expect(res.body).toEqual({
        success: true,
        error: null,
        data: { triggered: false },
      });
      expect(stored().lastPingedAt).toBeInstanceOf(Date);
      expect(stored().lastTriggeredAt).toBeNull();
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('does not change the pending push counter', async () => {
      connections.rows.set(stored().id, { ...stored(), pendingPushCount: 3 });

      await deliver('diagnostics:ping', {}).expect(HttpStatus.OK);

      expect(stored().pendingPushCount).toBe(3);
    });
  });

  describe('event matching', () => {
    it('triggers a scan for a push to the watched branch', async () => {
      const res = await push().expect(HttpStatus.OK);

      expect(res.body.data).toEqual({ triggered: true });
      expect(serviceRepository.findByIdWithActivePackages).toHaveBeenCalledWith(1);
      expect(scheduler.publishScanForService).toHaveBeenCalledWith(activeService);
    });

    it('ignores a push to another branch but records the ping', async () => {
      const res = await push('feature/x').expect(HttpStatus.OK);

      expect(res.body.data).toEqual({ triggered: false });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(stored().lastPingedAt).toBeInstanceOf(Date);
    });

    it('follows a watched branch other than main, including slashes', async () => {
      connections.rows.set(stored().id, { ...stored(), watchedBranch: 'release/1.x' });

      expect((await push('main')).body.data.triggered).toBe(false);
      expect((await push('release/1.x')).body.data.triggered).toBe(true);
    });

    it('triggers when the watched branch is one of several refs updated in one push', async () => {
      const res = await deliver(
        'repo:push',
        pushBody(
          branchChange('feature/x'),
          { new: { type: 'tag', name: 'v1' } },
          branchChange('main'),
        ),
      ).expect(HttpStatus.OK);

      expect(res.body.data.triggered).toBe(true);
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
    });

    it('ignores tags, deleted branches, look-alike and different-case branch names', async () => {
      const ignored = [
        pushBody({ new: { type: 'tag', name: 'main' } }),
        pushBody({ new: null }),
        pushBody(branchChange('main-2')),
        pushBody(branchChange('Main')),
        pushBody(branchChange('mai')),
      ];
      for (const payload of ignored) {
        const res = await deliver('repo:push', payload).expect(HttpStatus.OK);
        expect(res.body.data.triggered).toBe(false);
      }
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('ignores empty or malformed push payloads', async () => {
      for (const payload of [{}, { push: {} }, { push: { changes: [] } }]) {
        const res = await deliver('repo:push', payload).expect(HttpStatus.OK);
        expect(res.body.data.triggered).toBe(false);
      }
    });

    it('ignores unrelated event keys and a missing X-Event-Key header', async () => {
      for (const key of [
        'pullrequest:fulfilled',
        'repo:fork',
        'repo:updated',
        'push',
        undefined,
      ]) {
        const res = await deliver(key, pushBody(branchChange('main'))).expect(
          HttpStatus.OK,
        );
        expect(res.body.data.triggered).toBe(false);
      }
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });
  });

  describe('INSTANT cadence', () => {
    it('scans on every matching push', async () => {
      await push().expect(HttpStatus.OK);
      await push().expect(HttpStatus.OK);
      await push().expect(HttpStatus.OK);

      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(3);
    });

    it('stamps lastTriggeredAt and keeps pendingPushCount at 0', async () => {
      await push().expect(HttpStatus.OK);

      expect(stored().lastTriggeredAt).toBeInstanceOf(Date);
      expect(stored().pendingPushCount).toBe(0);
    });

    it('logs REPOSITORY_SCAN_TRIGGERED naming Bitbucket', async () => {
      await push().expect(HttpStatus.OK);

      expect(activityLog.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        metadata: {
          provider: RepositoryProvider.BITBUCKET,
          via: 'repo:push',
          branch: 'main',
          triggerMode: RepositoryTriggerMode.INSTANT,
        },
      });
    });

    it('does not log activity for ignored deliveries', async () => {
      await push('other').expect(HttpStatus.OK);
      await deliver('diagnostics:ping', {}).expect(HttpStatus.OK);

      expect(activityLog.create).not.toHaveBeenCalled();
    });

    it('answers 200 triggered: true without publishing when the service was deleted', async () => {
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(null);

      const res = await push().expect(HttpStatus.OK);

      expect(res.body.data).toEqual({ triggered: true });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });
  });

  describe('PUSH_COUNT cadence', () => {
    function usePushCount(threshold: number | null, pending = 0) {
      connections.rows.set(stored().id, {
        ...stored(),
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: threshold,
        pendingPushCount: pending,
      });
    }

    it('batches pushes and fires exactly when the threshold is reached', async () => {
      usePushCount(3);

      expect((await push()).body.data.triggered).toBe(false);
      expect(stored().pendingPushCount).toBe(1);
      expect((await push()).body.data.triggered).toBe(false);
      expect(stored().pendingPushCount).toBe(2);
      expect((await push()).body.data.triggered).toBe(true);
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
    });

    it('resets the counter after firing and starts a new batch', async () => {
      usePushCount(2);

      await push();
      await push();
      expect(stored().pendingPushCount).toBe(0);

      expect((await push()).body.data.triggered).toBe(false);
      expect((await push()).body.data.triggered).toBe(true);
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(2);
    });

    it('does not count other branches, pings or ignored events', async () => {
      usePushCount(2);

      await push('other');
      await deliver('diagnostics:ping', {});
      await deliver('pullrequest:created', {});

      expect(stored().pendingPushCount).toBe(0);
    });

    it('fires on the first push for a threshold of 1 or a null threshold', async () => {
      usePushCount(1);
      expect((await push()).body.data.triggered).toBe(true);

      usePushCount(null);
      expect((await push()).body.data.triggered).toBe(true);
    });

    it('fires immediately when the threshold was lowered below the accumulated count', async () => {
      usePushCount(2, 8);

      expect((await push()).body.data.triggered).toBe(true);
      expect(stored().pendingPushCount).toBe(0);
    });

    it('does not count a rejected (badly signed) delivery', async () => {
      usePushCount(3);

      await deliver('repo:push', pushBody(branchChange('main')), {
        signature: 'sha256=bad',
      }).expect(HttpStatus.UNAUTHORIZED);

      expect(stored().pendingPushCount).toBe(0);
    });
  });

  describe('TIME_INTERVAL cadence', () => {
    beforeEach(() => {
      connections.rows.set(stored().id, {
        ...stored(),
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        intervalDays: 7,
      });
    });

    it('only accumulates — the webhook itself never scans', async () => {
      for (let i = 1; i <= 4; i++) {
        const res = await push().expect(HttpStatus.OK);
        expect(res.body.data.triggered).toBe(false);
        expect(stored().pendingPushCount).toBe(i);
      }

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(stored().lastTriggeredAt).toBeNull();
    });

    it('does not accumulate ignored events', async () => {
      await push('other');
      await deliver('diagnostics:ping', {});

      expect(stored().pendingPushCount).toBe(0);
    });

    it('leaves the connection visible to the daily sweep once something accumulated', async () => {
      await push();

      expect(await connections.findDueForTimeIntervalSweep()).toHaveLength(1);
    });
  });
});
