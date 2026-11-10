import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import {
  ActivityEventType,
  RepositoryConnectionStatus,
  RepositoryTriggerMode,
} from '@aba/database';
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
 * E2E tests for POST /webhooks/github/:webhookToken — the public endpoint
 * GitHub calls. The app is created with rawBody: true exactly like main.ts,
 * so the HMAC is verified over the real bytes supertest puts on the wire.
 * No AuthGuard is involved: the signature is the only authentication.
 */
describe('GithubWebhookController (e2e)', () => {
  let app: INestApplication;
  let connections: MockedRepositoryConnectionRepository;
  let serviceRepository: { findByIdWithActivePackages: jest.Mock };
  let scheduler: { publishScanForService: jest.Mock };
  let activityLog: { create: jest.Mock };

  const SECRET = 'plain-webhook-secret';
  const TOKEN = 'live-token';
  const URL = `/webhooks/github/${TOKEN}`;

  const activeService = {
    id: 1,
    companyId: 1,
    environmentId: 1,
    activePackages: [
      { id: 100, ecosystem: 'NPM', name: 'lodash', version: '4.17.15' },
    ],
  };

  function sign(body: string, secret = SECRET): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }

  /** Sends a delivery the way GitHub does: raw JSON bytes + signature. */
  function deliver(
    event: string | undefined,
    payload: Record<string, unknown>,
    options: { token?: string; signature?: string | null; body?: string } = {},
  ) {
    const body = options.body ?? JSON.stringify(payload);
    let req = request(app.getHttpServer())
      .post(`/webhooks/github/${options.token ?? TOKEN}`)
      .set('Content-Type', 'application/json');
    if (event !== undefined) req = req.set('X-GitHub-Event', event);
    if (options.signature !== null) {
      req = req.set('X-Hub-Signature-256', options.signature ?? sign(body));
    }
    return req.send(body);
  }

  const push = (branch = 'main') => deliver('push', { ref: `refs/heads/${branch}` });

  const stored = () => [...connections.rows.values()][0];

  beforeEach(async () => {
    connections = createRepositoryConnectionRepositoryMock();
    connections.seed({
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
      controllers: [GithubWebhookController],
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

  // ── routing / token handling ─────────────────────────────────────────────

  describe('token handling', () => {
    it('returns 404 for an unknown token', async () => {
      await deliver('push', { ref: 'refs/heads/main' }, { token: 'nope' }).expect(
        HttpStatus.NOT_FOUND,
      );

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('returns 404 for a paused connection', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        status: RepositoryConnectionStatus.PAUSED,
      });

      await push().expect(HttpStatus.NOT_FOUND);

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('answers unknown and paused tokens identically so callers cannot tell them apart', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        status: RepositoryConnectionStatus.PAUSED,
      });

      const paused = await push();
      const unknown = await deliver(
        'push',
        { ref: 'refs/heads/main' },
        { token: 'nope' },
      );

      expect(paused.status).toBe(unknown.status);
      expect(paused.body).toEqual(unknown.body);
    });

    it('checks the token before the signature (unknown token + bad signature is still 404)', async () => {
      await deliver(
        'push',
        { ref: 'refs/heads/main' },
        { token: 'nope', signature: 'sha256=bad' },
      ).expect(HttpStatus.NOT_FOUND);
    });

    it('does not accept GET', async () => {
      await request(app.getHttpServer()).get(URL).expect(HttpStatus.NOT_FOUND);
    });

    it('needs no Authorization header or CSRF token — GitHub cannot send one', async () => {
      await push().expect(HttpStatus.OK);
    });
  });

  // ── signature verification ───────────────────────────────────────────────

  describe('signature verification', () => {
    it('returns 401 when the signature header is missing', async () => {
      await deliver('push', { ref: 'refs/heads/main' }, { signature: null }).expect(
        HttpStatus.UNAUTHORIZED,
      );

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(connections.recordDelivery).not.toHaveBeenCalled();
    });

    it('returns 401 for a signature made with the wrong secret', async () => {
      const body = JSON.stringify({ ref: 'refs/heads/main' });

      await deliver('push', {}, {
        body,
        signature: sign(body, 'some-other-secret'),
      }).expect(HttpStatus.UNAUTHORIZED);

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('returns 401 when the body was altered after signing', async () => {
      const signed = JSON.stringify({ ref: 'refs/heads/other' });
      const sent = JSON.stringify({ ref: 'refs/heads/main' });

      await deliver('push', {}, { body: sent, signature: sign(signed) }).expect(
        HttpStatus.UNAUTHORIZED,
      );

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('returns 401 when only the whitespace of the JSON differs from what was signed', async () => {
      const compact = JSON.stringify({ ref: 'refs/heads/main' });
      const pretty = JSON.stringify({ ref: 'refs/heads/main' }, null, 2);

      await deliver('push', {}, { body: pretty, signature: sign(compact) }).expect(
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('accepts a pretty-printed body when the signature covers those exact bytes', async () => {
      const pretty = JSON.stringify({ ref: 'refs/heads/main' }, null, 2);

      await deliver('push', {}, { body: pretty }).expect(HttpStatus.OK);
    });

    it('returns 401 when the sha256= prefix is missing, wrong case, or the algorithm differs', async () => {
      const body = JSON.stringify({ ref: 'refs/heads/main' });
      const hex = createHmac('sha256', SECRET).update(body).digest('hex');

      for (const signature of [hex, `SHA256=${hex}`, `sha1=${hex}`, '']) {
        await deliver('push', {}, { body, signature }).expect(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('returns 401 for a truncated or non-hex signature', async () => {
      const body = JSON.stringify({ ref: 'refs/heads/main' });
      const good = sign(body);

      await deliver('push', {}, { body, signature: good.slice(0, -2) }).expect(
        HttpStatus.UNAUTHORIZED,
      );
      await deliver('push', {}, { body, signature: 'sha256=' + 'zz'.repeat(32) }).expect(
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('verifies the signature before honouring a ping', async () => {
      await deliver('ping', { zen: 'hi' }, { signature: 'sha256=bad' }).expect(
        HttpStatus.UNAUTHORIZED,
      );

      expect(stored().lastPingedAt).toBeNull();
    });

    it('rejects the old secret after a rotation but accepts the new one', async () => {
      connections.rows.set(stored().id, {
        ...stored(),
        webhookSecretEnc: 'enc(rotated-secret)',
      });
      const body = JSON.stringify({ ref: 'refs/heads/main' });

      await deliver('push', {}, { body, signature: sign(body, SECRET) }).expect(
        HttpStatus.UNAUTHORIZED,
      );
      await deliver('push', {}, {
        body,
        signature: sign(body, 'rotated-secret'),
      }).expect(HttpStatus.OK);
    });

    it('handles a large signed payload (GitHub push payloads can be big)', async () => {
      const payload = {
        ref: 'refs/heads/main',
        commits: Array.from({ length: 500 }, (_, i) => ({
          id: `commit-${i}`,
          message: 'x'.repeat(100),
        })),
      };

      await deliver('push', payload).expect(HttpStatus.OK);
    });

    it('handles a signed payload containing multibyte characters', async () => {
      await deliver('push', {
        ref: 'refs/heads/main',
        head_commit: { message: 'Fix ✓ naïve – 日本語 🚀' },
      }).expect(HttpStatus.OK);
    });
  });

  // ── ping ─────────────────────────────────────────────────────────────────

  describe('ping event (GitHub "Test delivery" button)', () => {
    it('returns 200 { triggered: false } and records lastPingedAt', async () => {
      const res = await deliver('ping', { zen: 'Keep it logically awesome.' }).expect(
        HttpStatus.OK,
      );

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

      await deliver('ping', { zen: 'x' }).expect(HttpStatus.OK);

      expect(stored().pendingPushCount).toBe(3);
    });
  });

  // ── event matching ───────────────────────────────────────────────────────

  describe('event matching', () => {
    it('triggers a scan for a push to the watched branch', async () => {
      const res = await push().expect(HttpStatus.OK);

      expect(res.body.data).toEqual({ triggered: true });
      expect(serviceRepository.findByIdWithActivePackages).toHaveBeenCalledWith(1);
      expect(scheduler.publishScanForService).toHaveBeenCalledWith(activeService);
    });

    it('ignores a push to another branch but still records the ping', async () => {
      const res = await push('feature/x').expect(HttpStatus.OK);

      expect(res.body.data).toEqual({ triggered: false });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(stored().lastPingedAt).toBeInstanceOf(Date);
    });

    it('follows the watched branch when it is something other than main', async () => {
      connections.rows.set(stored().id, { ...stored(), watchedBranch: 'release/1.x' });

      expect((await push('main')).body.data.triggered).toBe(false);
      expect((await push('release/1.x')).body.data.triggered).toBe(true);
    });

    it('ignores a tag push, a similarly named branch and a different-case branch', async () => {
      for (const ref of ['refs/tags/main', 'refs/heads/main-2', 'refs/heads/Main', 'main']) {
        const res = await deliver('push', { ref }).expect(HttpStatus.OK);
        expect(res.body.data.triggered).toBe(false);
      }
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('ignores a push payload with no ref', async () => {
      const res = await deliver('push', {}).expect(HttpStatus.OK);
      expect(res.body.data.triggered).toBe(false);
    });

    it('triggers on a published release', async () => {
      const res = await deliver('release', { action: 'published' }).expect(
        HttpStatus.OK,
      );

      expect(res.body.data.triggered).toBe(true);
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
    });

    it('ignores release actions other than published', async () => {
      for (const action of ['created', 'edited', 'deleted', 'unpublished', 'prereleased']) {
        const res = await deliver('release', { action }).expect(HttpStatus.OK);
        expect(res.body.data.triggered).toBe(false);
      }
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('ignores unrelated GitHub events and a missing X-GitHub-Event header', async () => {
      for (const event of ['issues', 'pull_request', 'workflow_run', 'star', undefined]) {
        const res = await deliver(event, {
          ref: 'refs/heads/main',
          action: 'published',
        }).expect(HttpStatus.OK);
        expect(res.body.data.triggered).toBe(false);
      }
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });
  });

  // ── INSTANT ──────────────────────────────────────────────────────────────

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

    it('logs a REPOSITORY_SCAN_TRIGGERED activity entry with the source event', async () => {
      await push().expect(HttpStatus.OK);

      expect(activityLog.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        metadata: {
          via: 'push',
          branch: 'main',
          triggerMode: RepositoryTriggerMode.INSTANT,
        },
      });
    });

    it('records via: release for a published release', async () => {
      await deliver('release', { action: 'published' }).expect(HttpStatus.OK);

      expect(activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ via: 'release' }),
        }),
      );
    });

    it('does not log an activity entry for ignored deliveries', async () => {
      await push('other').expect(HttpStatus.OK);
      await deliver('ping', { zen: 'x' }).expect(HttpStatus.OK);

      expect(activityLog.create).not.toHaveBeenCalled();
    });

    it('still answers 200 triggered: true when the service has been deleted, without publishing', async () => {
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(null);

      const res = await push().expect(HttpStatus.OK);

      expect(res.body.data).toEqual({ triggered: true });
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(activityLog.create).not.toHaveBeenCalled();
    });
  });

  // ── PUSH_COUNT ───────────────────────────────────────────────────────────

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
      expect(stored().pendingPushCount).toBe(1);
      expect((await push()).body.data.triggered).toBe(true);
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(2);
    });

    it('does not count pushes to other branches, pings or ignored events', async () => {
      usePushCount(2);

      await push('other');
      await deliver('ping', { zen: 'x' });
      await deliver('issues', { action: 'opened' });
      expect(stored().pendingPushCount).toBe(0);

      expect((await push()).body.data.triggered).toBe(false);
      expect(stored().pendingPushCount).toBe(1);
    });

    it('counts published releases towards the threshold', async () => {
      usePushCount(2);

      await push();
      const res = await deliver('release', { action: 'published' }).expect(
        HttpStatus.OK,
      );

      expect(res.body.data.triggered).toBe(true);
    });

    it('fires on the first push when the threshold is 1', async () => {
      usePushCount(1);

      expect((await push()).body.data.triggered).toBe(true);
    });

    it('treats a missing threshold as 1', async () => {
      usePushCount(null);

      expect((await push()).body.data.triggered).toBe(true);
    });

    it('fires immediately when the threshold was lowered below the accumulated count', async () => {
      usePushCount(2, 8);

      expect((await push()).body.data.triggered).toBe(true);
      expect(stored().pendingPushCount).toBe(0);
    });

    it('does not scan or log while accumulating', async () => {
      usePushCount(5);

      await push();

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
      expect(activityLog.create).not.toHaveBeenCalled();
    });

    it('does not lose a count when the signature is invalid (rejected deliveries are not counted)', async () => {
      usePushCount(3);

      await deliver('push', { ref: 'refs/heads/main' }, { signature: 'sha256=bad' }).expect(
        HttpStatus.UNAUTHORIZED,
      );

      expect(stored().pendingPushCount).toBe(0);
    });
  });

  // ── TIME_INTERVAL ────────────────────────────────────────────────────────

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

    it('accumulates published releases too', async () => {
      await deliver('release', { action: 'published' }).expect(HttpStatus.OK);

      expect(stored().pendingPushCount).toBe(1);
    });

    it('does not accumulate ignored events', async () => {
      await push('other');
      await deliver('ping', { zen: 'x' });

      expect(stored().pendingPushCount).toBe(0);
    });

    it('leaves the connection visible to the daily sweep once something accumulated', async () => {
      await push();

      expect(await connections.findDueForTimeIntervalSweep()).toHaveLength(1);
    });
  });
});
