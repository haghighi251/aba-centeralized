import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { RepositoryConnectionController } from '@/modules/repository-connection/controllers/repositoryConnection.controller';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';
import { CreateRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/createRepositoryConnection.usecase';
import { GetRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/getRepositoryConnection.usecase';
import { RotateRepositoryConnectionSecretUseCase } from '@/modules/repository-connection/usecases/rotateRepositoryConnectionSecret.usecase';
import { UpdateRepositoryConnectionTriggerSettingsUseCase } from '@/modules/repository-connection/usecases/updateRepositoryConnectionTriggerSettings.usecase';
import { DeleteRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/deleteRepositoryConnection.usecase';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { GithubWebhookController } from '@/modules/webhook/controllers/githubWebhook.controller';
import { BitbucketWebhookController } from '@/modules/webhook/controllers/bitbucketWebhook.controller';
import { RepositoryTriggerSweepService } from '@/modules/scheduler/services/repositoryTriggerSweep.service';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import { AllowAuthGuardMock } from '@test/__mocks__/auth/guards/auth.guard.mock';
import {
  createRepositoryConnectionRepositoryMock,
  MockedRepositoryConnectionRepository,
} from '@test/__mocks__/repository-connection/repositories/repositoryConnection.repository.mock';
import {
  mockEnvironment,
  mockProductionEnvironment,
} from '@test/__mocks__/environment/fixtures/environment.fixtures';
import { mockService } from '@test/__mocks__/service-package/fixtures/servicePackage.fixtures';
import { mockOwnerJwtPayload } from '@test/__mocks__/company/fixtures/company.fixtures';

/**
 * Cross-feature e2e: the customer-facing management API, the public GitHub
 * webhook endpoint and the daily TIME_INTERVAL sweep all share one
 * in-memory connection store, proving that what the buttons do (connect,
 * regenerate secret, change cadence, disconnect) is what GitHub deliveries
 * actually experience afterwards.
 */
describe('Repository connection lifecycle (e2e)', () => {
  let app: INestApplication;
  let connections: MockedRepositoryConnectionRepository;
  let scheduler: { publishScanForService: jest.Mock };
  let sweep: RepositoryTriggerSweepService;
  let companyRepository: { findById: jest.Mock };

  const BASE = '/company/1/environments/1/services/1/repository-connection';
  const AUTH = 'Bearer valid-access-token';
  const DAY_MS = 24 * 60 * 60 * 1000;

  const activeService = {
    id: 1,
    companyId: 1,
    environmentId: 1,
    activePackages: [
      { id: 100, ecosystem: 'NPM', name: 'lodash', version: '4.17.15' },
    ],
  };

  type Credentials = { path: string; secret: string };

  function credentialsFrom(body: any): Credentials {
    const url = new URL(body.data.webhookUrl);
    return { path: url.pathname, secret: body.data.webhookSecret };
  }

  async function connect(
    body: Record<string, unknown> = { owner: 'acme', name: 'billing-api' },
    base = BASE,
  ): Promise<Credentials> {
    const res = await request(app.getHttpServer())
      .post(base)
      .set('Authorization', AUTH)
      .send(body)
      .expect(HttpStatus.CREATED);
    return credentialsFrom(res.body);
  }

  function githubDelivers(
    creds: Credentials,
    event: string,
    payload: Record<string, unknown>,
    secretOverride?: string,
  ) {
    const body = JSON.stringify(payload);
    const signature =
      'sha256=' +
      createHmac('sha256', secretOverride ?? creds.secret)
        .update(body)
        .digest('hex');
    return request(app.getHttpServer())
      .post(creds.path)
      .set('Content-Type', 'application/json')
      .set('X-GitHub-Event', event)
      .set('X-Hub-Signature-256', signature)
      .send(body);
  }

  const pushTo = (creds: Credentials, branch = 'main') =>
    githubDelivers(creds, 'push', { ref: `refs/heads/${branch}` });

  const stored = () => [...connections.rows.values()][0];

  beforeEach(async () => {
    connections = createRepositoryConnectionRepositoryMock(() => 1);
    scheduler = { publishScanForService: jest.fn().mockResolvedValue(undefined) };
    companyRepository = { findById: jest.fn() };
    companyRepository.findById.mockResolvedValue({
      id: 1,
      payAsYouGo: false,
      subscriptionPlan: {
        id: 2,
        name: 'Pro',
        monthlyPrice: 99,
        maxMonitoredBranches: null,
        defaultTriggerMode: null,
        defaultPushCountThreshold: null,
        defaultIntervalDays: null,
      },
    });

    const prodService = { ...mockService, id: 2, environmentId: 2 };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        RepositoryConnectionController,
        GithubWebhookController,
        BitbucketWebhookController,
      ],
      providers: [
        RepositoryConnectionService,
        CreateRepositoryConnectionUseCase,
        GetRepositoryConnectionUseCase,
        RotateRepositoryConnectionSecretUseCase,
        UpdateRepositoryConnectionTriggerSettingsUseCase,
        DeleteRepositoryConnectionUseCase,
        RepositoryTriggerSweepService,
        { provide: RepositoryConnectionRepository, useValue: connections },
        {
          provide: EnvironmentRepository,
          useValue: {
            findById: jest.fn(async (id: number) =>
              id === 1
                ? mockEnvironment
                : id === 2
                  ? mockProductionEnvironment
                  : null,
            ),
          },
        },
        {
          provide: ServiceRepository,
          useValue: {
            findById: jest.fn(async (id: number) =>
              id === 1 ? mockService : id === 2 ? prodService : null,
            ),
            findByIdWithActivePackages: jest.fn(async (id: number) =>
              id === 1 || id === 2 ? { ...activeService, id } : null,
            ),
          },
        },
        { provide: CompanyRepository, useValue: companyRepository },
        { provide: PackageRescanSchedulerService, useValue: scheduler },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CryptoService,
          useValue: {
            encrypt: jest.fn((v: string) => `enc(${v})`),
            decrypt: jest.fn((v: string) => v.slice(4, -1)),
          },
        },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(new AllowAuthGuardMock(mockOwnerJwtPayload))
      .compile();

    app = module.createNestApplication({ rawBody: true });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    sweep = module.get(RepositoryTriggerSweepService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('a freshly connected repo accepts a signed delivery using exactly the URL and secret the form displayed', async () => {
    const creds = await connect({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: 'INSTANT',
    });

    const res = await pushTo(creds).expect(HttpStatus.OK);

    expect(res.body.data.triggered).toBe(true);
    expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
  });

  it('the GitHub "Test delivery" ping right after connecting succeeds and updates the status panel', async () => {
    const creds = await connect();

    await githubDelivers(creds, 'ping', { zen: 'hi' }).expect(HttpStatus.OK);

    const status = await request(app.getHttpServer())
      .get(BASE)
      .set('Authorization', AUTH)
      .expect(HttpStatus.OK);
    expect(status.body.data.lastPingedAt).toEqual(expect.any(String));
    expect(status.body.data.lastTriggeredAt).toBeNull();
  });

  it('a delivery signed with a secret the customer mistyped is rejected', async () => {
    const creds = await connect();

    await githubDelivers(
      creds,
      'push',
      { ref: 'refs/heads/main' },
      creds.secret.slice(0, -1) + 'x',
    ).expect(HttpStatus.UNAUTHORIZED);
  });

  it('a delivery sent to a URL with a mistyped token gets 404', async () => {
    const creds = await connect();

    await pushTo({ ...creds, path: creds.path.slice(0, -1) + 'x' }).expect(
      HttpStatus.NOT_FOUND,
    );
  });

  it('the status panel shows lastTriggeredAt after a scan-triggering push', async () => {
    const creds = await connect({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: 'INSTANT',
    });
    await pushTo(creds).expect(HttpStatus.OK);

    const status = await request(app.getHttpServer())
      .get(BASE)
      .set('Authorization', AUTH)
      .expect(HttpStatus.OK);

    expect(status.body.data.lastTriggeredAt).toEqual(expect.any(String));
    expect(status.body.data.lastPingedAt).toEqual(expect.any(String));
  });

  describe('Regenerate secret button', () => {
    it('the old URL stops working immediately and the new one works', async () => {
      const oldCreds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'INSTANT',
      });

      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      const newCreds = credentialsFrom(rotated.body);

      await pushTo(oldCreds).expect(HttpStatus.NOT_FOUND);
      await pushTo(newCreds).expect(HttpStatus.OK);
    });

    it('if the customer updates only the secret in GitHub (keeps the old URL) the delivery is not accepted', async () => {
      const oldCreds = await connect();
      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH);

      await pushTo({
        path: oldCreds.path,
        secret: credentialsFrom(rotated.body).secret,
      }).expect(HttpStatus.NOT_FOUND);
    });

    it('if the customer updates only the URL in GitHub (keeps the old secret) the delivery is rejected', async () => {
      const oldCreds = await connect();
      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH);

      await pushTo({
        path: credentialsFrom(rotated.body).path,
        secret: oldCreds.secret,
      }).expect(HttpStatus.UNAUTHORIZED);
    });

    it('keeps the cadence and the batching progress across a rotation', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 3,
      });
      await pushTo(creds);
      await pushTo(creds);

      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH);
      const res = await pushTo(credentialsFrom(rotated.body)).expect(HttpStatus.OK);

      expect(res.body.data.triggered).toBe(true);
    });
  });

  describe('Disconnect button', () => {
    it('the webhook URL answers 404 afterwards and never triggers a scan', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'INSTANT',
      });

      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      await pushTo(creds).expect(HttpStatus.NOT_FOUND);
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('reconnecting issues a different URL and the previous one stays dead', async () => {
      const first = await connect();
      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      const second = await connect();

      expect(second.path).not.toBe(first.path);
      await pushTo(first).expect(HttpStatus.NOT_FOUND);
      await pushTo(second).expect(HttpStatus.OK);
    });
  });

  describe('Cadence form', () => {
    it('switching from INSTANT to PUSH_COUNT takes effect on the next delivery', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'INSTANT',
      });

      await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'PUSH_COUNT', pushCountThreshold: 2 })
        .expect(HttpStatus.OK);

      expect((await pushTo(creds)).body.data.triggered).toBe(false);
      expect((await pushTo(creds)).body.data.triggered).toBe(true);
    });

    it('switching from PUSH_COUNT to INSTANT scans on the next push even mid-batch', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 10,
      });
      await pushTo(creds);

      await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'INSTANT' })
        .expect(HttpStatus.OK);

      expect((await pushTo(creds)).body.data.triggered).toBe(true);
    });

    it('changing the cadence discards the half-filled batch', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 3,
      });
      await pushTo(creds);
      await pushTo(creds);
      expect(stored().pendingPushCount).toBe(2);

      await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'PUSH_COUNT', pushCountThreshold: 3 })
        .expect(HttpStatus.OK);

      expect(stored().pendingPushCount).toBe(0);
      expect((await pushTo(creds)).body.data.triggered).toBe(false);
    });

    it('a rejected (invalid) cadence submission leaves the working cadence untouched', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'INSTANT',
      });

      await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'PUSH_COUNT' })
        .expect(HttpStatus.BAD_REQUEST);

      expect((await pushTo(creds)).body.data.triggered).toBe(true);
    });
  });

  describe('default cadence by environment', () => {
    it('a production-environment connection with no choice scans on the very first push (INSTANT)', async () => {
      const creds = await connect(
        { owner: 'acme', name: 'billing-api' },
        '/company/1/environments/2/services/2/repository-connection',
      );

      expect((await pushTo(creds)).body.data.triggered).toBe(true);
    });

    it('a non-production connection with no choice batches pushes (PUSH_COUNT/5)', async () => {
      const creds = await connect();

      for (let i = 0; i < 4; i++) {
        expect((await pushTo(creds)).body.data.triggered).toBe(false);
      }
      expect((await pushTo(creds)).body.data.triggered).toBe(true);
    });
  });

  describe('TIME_INTERVAL: webhook accumulation + daily sweep', () => {
    it('webhook pushes accumulate, the sweep fires once the interval has elapsed, then it waits again', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 7,
      });

      await pushTo(creds);
      await pushTo(creds);
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();

      // never triggered before -> due on the first sweep
      await sweep.runOnce(new Date());
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
      expect(stored().pendingPushCount).toBe(0);
      expect(stored().lastTriggeredAt).toBeInstanceOf(Date);

      // a new push arrives, but only 1 day has passed -> not due
      await pushTo(creds);
      await sweep.runOnce(new Date(Date.now() + 1 * DAY_MS));
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);

      // 8 days later -> due again
      await sweep.runOnce(new Date(Date.now() + 8 * DAY_MS));
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(2);
    });

    it('the sweep never scans a TIME_INTERVAL connection that saw no pushes', async () => {
      await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 1,
      });

      await sweep.runOnce(new Date(Date.now() + 30 * DAY_MS));

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('the sweep ignores connections on other cadences even when pushes are pending', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 5,
      });
      await pushTo(creds);

      await sweep.runOnce(new Date(Date.now() + 30 * DAY_MS));

      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('switching to a longer interval postpones the sweep scan', async () => {
      const creds = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 1,
      });
      await pushTo(creds);
      await sweep.runOnce(new Date()); // first scan, stamps lastTriggeredAt
      await pushTo(creds);

      await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'TIME_INTERVAL', intervalDays: 30 })
        .expect(HttpStatus.OK);
      // the cadence change cleared the pending count, so the sweep has nothing to do
      await sweep.runOnce(new Date(Date.now() + 5 * DAY_MS));

      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bitbucket lifecycle', () => {
    const connectBitbucket = (
      extra: Record<string, unknown> = {},
      base = BASE,
    ) =>
      connect(
        { provider: 'BITBUCKET', owner: 'acme', name: 'billing-api', ...extra },
        base,
      );

    function bitbucketDelivers(
      creds: Credentials,
      eventKey: string,
      payload: Record<string, unknown>,
      secretOverride?: string,
    ) {
      const body = JSON.stringify(payload);
      const signature =
        'sha256=' +
        createHmac('sha256', secretOverride ?? creds.secret)
          .update(body)
          .digest('hex');
      return request(app.getHttpServer())
        .post(creds.path)
        .set('Content-Type', 'application/json')
        .set('X-Event-Key', eventKey)
        .set('X-Hub-Signature', signature)
        .send(body);
    }

    const bbPush = (creds: Credentials, branch = 'main') =>
      bitbucketDelivers(creds, 'repo:push', {
        push: { changes: [{ new: { type: 'branch', name: branch } }] },
      });

    it('the URL and secret the dialog displays are exactly what Bitbucket needs: a signed repo:push scans', async () => {
      const creds = await connectBitbucket({ triggerMode: 'INSTANT' });
      expect(creds.path).toMatch(/^\/webhooks\/bitbucket\//);

      const res = await bbPush(creds).expect(HttpStatus.OK);

      expect(res.body.data.triggered).toBe(true);
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
    });

    it('Bitbucket "Test connection" (diagnostics:ping) succeeds and updates the status panel', async () => {
      const creds = await connectBitbucket();

      await bitbucketDelivers(creds, 'diagnostics:ping', {}).expect(HttpStatus.OK);

      const status = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      expect(status.body.data.provider).toBe('BITBUCKET');
      expect(status.body.data.lastPingedAt).toEqual(expect.any(String));
      expect(status.body.data.lastTriggeredAt).toBeNull();
    });

    it('a mistyped secret is rejected and a mistyped token is a 404', async () => {
      const creds = await connectBitbucket();

      await bitbucketDelivers(
        creds,
        'repo:push',
        { push: { changes: [{ new: { type: 'branch', name: 'main' } }] } },
        creds.secret.slice(0, -1) + 'x',
      ).expect(HttpStatus.UNAUTHORIZED);
      await bbPush({ ...creds, path: creds.path.slice(0, -1) + 'x' }).expect(
        HttpStatus.NOT_FOUND,
      );
    });

    it('the Bitbucket URL does not work on the GitHub endpoint and vice versa', async () => {
      const bb = await connectBitbucket({ triggerMode: 'INSTANT' });

      const asGithubPath = { ...bb, path: bb.path.replace('/bitbucket/', '/github/') };
      await githubDelivers(asGithubPath, 'push', {
        ref: 'refs/heads/main',
      }).expect(HttpStatus.NOT_FOUND);
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();
    });

    it('Regenerate secret kills the old Bitbucket URL immediately and the new one works', async () => {
      const oldCreds = await connectBitbucket({ triggerMode: 'INSTANT' });
      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      const newCreds = credentialsFrom(rotated.body);

      expect(newCreds.path).toMatch(/^\/webhooks\/bitbucket\//);
      await bbPush(oldCreds).expect(HttpStatus.NOT_FOUND);
      await bbPush(newCreds).expect(HttpStatus.OK);
    });

    it('Disconnect turns the URL into a 404, and reconnecting issues a new live one', async () => {
      const first = await connectBitbucket({ triggerMode: 'INSTANT' });
      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      await bbPush(first).expect(HttpStatus.NOT_FOUND);

      const second = await connectBitbucket({ triggerMode: 'INSTANT' });

      expect(second.path).not.toBe(first.path);
      await bbPush(second).expect(HttpStatus.OK);
    });

    it('a cadence change takes effect on the next Bitbucket push and discards the half-filled batch', async () => {
      const creds = await connectBitbucket({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 3,
      });
      await bbPush(creds);
      await bbPush(creds);
      expect(stored().pendingPushCount).toBe(2);

      await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'INSTANT' })
        .expect(HttpStatus.OK);

      expect(stored().pendingPushCount).toBe(0);
      expect((await bbPush(creds)).body.data.triggered).toBe(true);
    });

    it('pushes to other branches never count towards the batch', async () => {
      const creds = await connectBitbucket({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 2,
      });

      await bbPush(creds, 'feature/x');
      await bbPush(creds, 'develop');

      expect(stored().pendingPushCount).toBe(0);
    });

    it('a production-environment Bitbucket connection with no choice scans on the first push', async () => {
      const creds = await connectBitbucket(
        {},
        '/company/1/environments/2/services/2/repository-connection',
      );

      expect((await bbPush(creds)).body.data.triggered).toBe(true);
    });

    it('TIME_INTERVAL: pushes accumulate and the daily sweep scans once the interval elapsed', async () => {
      const creds = await connectBitbucket({
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 7,
      });

      await bbPush(creds);
      await bbPush(creds);
      expect(scheduler.publishScanForService).not.toHaveBeenCalled();

      await sweep.runOnce(new Date());
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);
      expect(stored().pendingPushCount).toBe(0);

      await bbPush(creds);
      await sweep.runOnce(new Date(Date.now() + 1 * DAY_MS));
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(1);

      await sweep.runOnce(new Date(Date.now() + 8 * DAY_MS));
      expect(scheduler.publishScanForService).toHaveBeenCalledTimes(2);
    });

    it('a service can switch providers: disconnect GitHub, connect Bitbucket', async () => {
      const gh = await connect({
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'INSTANT',
      });
      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      const bb = await connectBitbucket({ triggerMode: 'INSTANT' });

      await pushTo(gh).expect(HttpStatus.NOT_FOUND);
      await bbPush(bb).expect(HttpStatus.OK);
    });
  });
});
