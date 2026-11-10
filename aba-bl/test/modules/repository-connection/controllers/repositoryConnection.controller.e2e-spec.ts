import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import {
  ActivityEventType,
  RepositoryConnectionStatus,
  RepositoryTriggerMode,
} from '@aba/database';
import { RepositoryConnectionController } from '@/modules/repository-connection/controllers/repositoryConnection.controller';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';
import { CreateRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/createRepositoryConnection.usecase';
import { GetRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/getRepositoryConnection.usecase';
import { RotateRepositoryConnectionSecretUseCase } from '@/modules/repository-connection/usecases/rotateRepositoryConnectionSecret.usecase';
import { UpdateRepositoryConnectionTriggerSettingsUseCase } from '@/modules/repository-connection/usecases/updateRepositoryConnectionTriggerSettings.usecase';
import { DeleteRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/deleteRepositoryConnection.usecase';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  AllowAuthGuardMock,
  DenyAuthGuardMock,
} from '@test/__mocks__/auth/guards/auth.guard.mock';
import {
  createRepositoryConnectionRepositoryMock,
  MockedRepositoryConnectionRepository,
} from '@test/__mocks__/repository-connection/repositories/repositoryConnection.repository.mock';
import {
  createEnvironmentRepositoryMock,
  MockedEnvironmentRepository,
} from '@test/__mocks__/environment/repositories/environment.repository.mock';
import {
  createServiceRepositoryMock,
  MockedServiceRepository,
} from '@test/__mocks__/service-package/repositories/service.repository.mock';
import {
  mockEnvironment,
  mockProductionEnvironment,
  mockOtherCompanyEnvironment,
} from '@test/__mocks__/environment/fixtures/environment.fixtures';
import {
  mockService,
  mockOtherCompanyService,
} from '@test/__mocks__/service-package/fixtures/servicePackage.fixtures';
import {
  mockOwnerJwtPayload,
  mockAdminJwtPayload,
  mockMemberJwtPayload,
  mockOtherCompanyOwnerJwtPayload,
} from '@test/__mocks__/company/fixtures/company.fixtures';

/**
 * E2E tests for every route and every form/button scenario of the GitHub
 * repository connection feature:
 *   POST   /company/:id/environments/:envId/services/:serviceId/repository-connection
 *   GET    .../repository-connection
 *   POST   .../repository-connection/rotate-secret
 *   PUT    .../repository-connection/trigger-settings
 *   DELETE .../repository-connection
 *
 * Nothing touches PostgreSQL/Kafka: the connection repository is a stateful
 * in-memory fake, the other repositories are mocked, and crypto is a
 * reversible stub. The controller, use cases, service, Zod validation pipe,
 * CompanyAccessGuard and CompanyManagerGuard all run for real.
 */
describe('RepositoryConnectionController (e2e)', () => {
  let app: INestApplication;
  let connections: MockedRepositoryConnectionRepository;
  let environmentRepository: MockedEnvironmentRepository;
  let serviceRepository: MockedServiceRepository;
  let companyRepository: { findById: jest.Mock };
  let activityLogRepository: { create: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };

  const BASE = '/company/1/environments/1/services/1/repository-connection';
  const AUTH = 'Bearer valid-access-token';

  const prodService = { ...mockService, id: 2, environmentId: 2 };

  const paidPlan = {
    id: 2,
    name: 'Pro',
    monthlyPrice: 99,
    maxMonitoredBranches: null,
    defaultTriggerMode: null,
    defaultPushCountThreshold: null,
    defaultIntervalDays: null,
  };
  const freePlan = { ...paidPlan, id: 1, name: 'Free', monthlyPrice: 0 };

  function company(
    plan: Record<string, unknown> | null,
    overrides: Record<string, unknown> = {},
  ) {
    return { id: 1, payAsYouGo: false, subscriptionPlan: plan, ...overrides };
  }

  async function buildApp(authGuard?: {
    canActivate: (...args: unknown[]) => unknown;
  }): Promise<INestApplication> {
    let builder = Test.createTestingModule({
      controllers: [RepositoryConnectionController],
      providers: [
        RepositoryConnectionService,
        CreateRepositoryConnectionUseCase,
        GetRepositoryConnectionUseCase,
        RotateRepositoryConnectionSecretUseCase,
        UpdateRepositoryConnectionTriggerSettingsUseCase,
        DeleteRepositoryConnectionUseCase,
        { provide: RepositoryConnectionRepository, useValue: connections },
        { provide: EnvironmentRepository, useValue: environmentRepository },
        { provide: ServiceRepository, useValue: serviceRepository },
        { provide: CompanyRepository, useValue: companyRepository },
        { provide: ActivityLogRepository, useValue: activityLogRepository },
        {
          provide: CryptoService,
          useValue: {
            encrypt: jest.fn((v: string) => `enc(${v})`),
            decrypt: jest.fn((v: string) => v.slice(4, -1)),
          },
        },
        { provide: JwtService, useValue: jwtService },
      ],
    });

    if (authGuard) {
      builder = builder.overrideGuard(AuthGuard).useValue(authGuard);
    }

    const module: TestingModule = await builder.compile();
    const testApp = module.createNestApplication();
    testApp.useGlobalFilters(new GlobalExceptionFilter());
    await testApp.init();
    return testApp;
  }

  async function rebuildAs(payload: Record<string, unknown>) {
    await app.close();
    app = await buildApp(new AllowAuthGuardMock(payload));
  }

  const post = (body: Record<string, unknown> = { owner: 'acme', name: 'billing-api' }) =>
    request(app.getHttpServer()).post(BASE).set('Authorization', AUTH).send(body);

  beforeEach(async () => {
    connections = createRepositoryConnectionRepositoryMock(() => 1);
    environmentRepository = createEnvironmentRepositoryMock();
    serviceRepository = createServiceRepositoryMock();
    companyRepository = { findById: jest.fn() };
    activityLogRepository = { create: jest.fn().mockResolvedValue(undefined) };
    jwtService = { verifyAsync: jest.fn() };

    const environments = {
      [mockEnvironment.id]: mockEnvironment,
      [mockProductionEnvironment.id]: mockProductionEnvironment,
      [mockOtherCompanyEnvironment.id]: mockOtherCompanyEnvironment,
    };
    const services = {
      [mockService.id]: mockService,
      [prodService.id]: prodService,
      [mockOtherCompanyService.id]: mockOtherCompanyService,
    };
    environmentRepository.findById.mockImplementation(
      async (id: number) => environments[id] ?? null,
    );
    serviceRepository.findById.mockImplementation(
      async (id: number) => services[id] ?? null,
    );
    companyRepository.findById.mockResolvedValue(company(paidPlan));

    app = await buildApp(new AllowAuthGuardMock(mockOwnerJwtPayload));
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST (Connect repository form) ───────────────────────────────────────

  describe('POST /repository-connection — connect form', () => {
    it('returns 201 with the connection, webhook URL and one-time secret for a BUSINESS_OWNER', async () => {
      const res = await post().expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.error).toBeNull();
      expect(res.body.data.connection).toMatchObject({
        provider: 'GITHUB',
        owner: 'acme',
        name: 'billing-api',
        watchedBranch: 'main',
        status: RepositoryConnectionStatus.ACTIVE,
        serviceId: 1,
        connectedById: mockOwnerJwtPayload.sub,
        pendingPushCount: 0,
      });
      expect(res.body.data.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.data.webhookUrl).toMatch(
        /^http:\/\/[^/]+\/webhooks\/github\/[0-9a-f-]{36}$/,
      );
    });

    it('returns 201 for a BUSINESS_ADMIN', async () => {
      await rebuildAs(mockAdminJwtPayload);

      await post().expect(HttpStatus.CREATED);
    });

    it('never leaks the token or encrypted secret on the connection object', async () => {
      const res = await post().expect(HttpStatus.CREATED);

      expect(res.body.data.connection).not.toHaveProperty('webhookToken');
      expect(res.body.data.connection).not.toHaveProperty('webhookSecretEnc');
      expect(JSON.stringify(res.body)).not.toContain('enc(');
    });

    it('stores the secret encrypted, never in plaintext', async () => {
      const res = await post().expect(HttpStatus.CREATED);

      const stored = [...connections.rows.values()][0];
      expect(stored.webhookSecretEnc).toBe(`enc(${res.body.data.webhookSecret})`);
    });

    it('puts the generated token (same one stored) in the webhook URL', async () => {
      const res = await post().expect(HttpStatus.CREATED);

      const stored = [...connections.rows.values()][0];
      expect(res.body.data.webhookUrl.endsWith(`/webhooks/github/${stored.webhookToken}`)).toBe(true);
    });

    it('builds the webhook URL from the request protocol and Host header', async () => {
      const res = await post()
        .set('Host', 'api.acme.test')
        .expect(HttpStatus.CREATED);

      expect(res.body.data.webhookUrl).toMatch(
        /^http:\/\/api\.acme\.test\/webhooks\/github\//,
      );
    });

    it('uses the default branch "main" when watchedBranch is left blank (omitted)', async () => {
      const res = await post({ owner: 'acme', name: 'billing-api' }).expect(
        HttpStatus.CREATED,
      );
      expect(res.body.data.connection.watchedBranch).toBe('main');
    });

    it('stores a custom branch, including one with slashes', async () => {
      const res = await post({
        owner: 'acme',
        name: 'billing-api',
        watchedBranch: 'release/2026-q1',
      }).expect(HttpStatus.CREATED);
      expect(res.body.data.connection.watchedBranch).toBe('release/2026-q1');
    });

    it('logs a REPOSITORY_CONNECTED activity entry for the acting user', async () => {
      await post().expect(HttpStatus.CREATED);

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_CONNECTED,
          actorUserId: mockOwnerJwtPayload.sub,
          companyId: 1,
          serviceId: 1,
        }),
      );
    });

    // ── cadence defaults ──
    describe('cadence defaults (no triggerMode chosen)', () => {
      it('non-production branch on a paid plan with no plan defaults -> PUSH_COUNT/5/7', async () => {
        const res = await post().expect(HttpStatus.CREATED);
        expect(res.body.data.connection).toMatchObject({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 5,
          intervalDays: 7,
        });
      });

      it('non-production branch uses the plan\'s configured default', async () => {
        companyRepository.findById.mockResolvedValue(
          company({
            ...paidPlan,
            defaultTriggerMode: RepositoryTriggerMode.TIME_INTERVAL,
            defaultPushCountThreshold: null,
            defaultIntervalDays: 3,
          }),
        );

        const res = await post().expect(HttpStatus.CREATED);

        expect(res.body.data.connection).toMatchObject({
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          intervalDays: 3,
        });
      });

      it('production environment on a paid plan -> INSTANT', async () => {
        const res = await request(app.getHttpServer())
          .post('/company/1/environments/2/services/2/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.CREATED);

        expect(res.body.data.connection.triggerMode).toBe(
          RepositoryTriggerMode.INSTANT,
        );
      });

      it('production environment on the free tier does NOT default to INSTANT', async () => {
        companyRepository.findById.mockResolvedValue(company(freePlan));

        const res = await request(app.getHttpServer())
          .post('/company/1/environments/2/services/2/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.CREATED);

        expect(res.body.data.connection.triggerMode).toBe(
          RepositoryTriggerMode.PUSH_COUNT,
        );
      });

      it('a company with no plan at all gets the system default', async () => {
        companyRepository.findById.mockResolvedValue(company(null));

        const res = await post().expect(HttpStatus.CREATED);

        expect(res.body.data.connection).toMatchObject({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 5,
        });
      });
    });

    // ── explicit cadence ──
    describe('explicit cadence chosen in the form', () => {
      it('INSTANT', async () => {
        const res = await post({
          owner: 'acme',
          name: 'billing-api',
          triggerMode: 'INSTANT',
        }).expect(HttpStatus.CREATED);
        expect(res.body.data.connection.triggerMode).toBe('INSTANT');
      });

      it('PUSH_COUNT with a threshold', async () => {
        const res = await post({
          owner: 'acme',
          name: 'billing-api',
          triggerMode: 'PUSH_COUNT',
          pushCountThreshold: 12,
        }).expect(HttpStatus.CREATED);
        expect(res.body.data.connection).toMatchObject({
          triggerMode: 'PUSH_COUNT',
          pushCountThreshold: 12,
          intervalDays: null,
        });
      });

      it('TIME_INTERVAL with an interval', async () => {
        const res = await post({
          owner: 'acme',
          name: 'billing-api',
          triggerMode: 'TIME_INTERVAL',
          intervalDays: 30,
        }).expect(HttpStatus.CREATED);
        expect(res.body.data.connection).toMatchObject({
          triggerMode: 'TIME_INTERVAL',
          intervalDays: 30,
          pushCountThreshold: null,
        });
      });

      it('an explicit choice beats the production INSTANT default', async () => {
        const res = await request(app.getHttpServer())
          .post('/company/1/environments/2/services/2/repository-connection')
          .set('Authorization', AUTH)
          .send({
            owner: 'acme',
            name: 'billing-api',
            triggerMode: 'PUSH_COUNT',
            pushCountThreshold: 3,
          })
          .expect(HttpStatus.CREATED);

        expect(res.body.data.connection.triggerMode).toBe('PUSH_COUNT');
      });
    });

    // ── validation ──
    describe('form validation (400)', () => {
      const invalid: [string, Record<string, unknown>][] = [
        ['an empty body', {}],
        ['a missing owner', { name: 'billing-api' }],
        ['a missing repository name', { owner: 'acme' }],
        ['an empty owner', { owner: '', name: 'billing-api' }],
        ['an empty repository name', { owner: 'acme', name: '' }],
        ['an owner longer than 255 characters', { owner: 'a'.repeat(256), name: 'x' }],
        ['a repository name longer than 255 characters', { owner: 'a', name: 'x'.repeat(256) }],
        ['an empty branch', { owner: 'a', name: 'x', watchedBranch: '' }],
        ['a branch longer than 255 characters', { owner: 'a', name: 'x', watchedBranch: 'b'.repeat(256) }],
        ['a non-string owner', { owner: 123, name: 'x' }],
        ['an unknown triggerMode', { owner: 'a', name: 'x', triggerMode: 'WEEKLY' }],
        ['a lowercase triggerMode', { owner: 'a', name: 'x', triggerMode: 'instant' }],
        ['PUSH_COUNT without a threshold', { owner: 'a', name: 'x', triggerMode: 'PUSH_COUNT' }],
        ['PUSH_COUNT with a zero threshold', { owner: 'a', name: 'x', triggerMode: 'PUSH_COUNT', pushCountThreshold: 0 }],
        ['PUSH_COUNT with a negative threshold', { owner: 'a', name: 'x', triggerMode: 'PUSH_COUNT', pushCountThreshold: -2 }],
        ['PUSH_COUNT with a fractional threshold', { owner: 'a', name: 'x', triggerMode: 'PUSH_COUNT', pushCountThreshold: 2.5 }],
        ['PUSH_COUNT with a numeric-string threshold', { owner: 'a', name: 'x', triggerMode: 'PUSH_COUNT', pushCountThreshold: '5' }],
        ['TIME_INTERVAL without an interval', { owner: 'a', name: 'x', triggerMode: 'TIME_INTERVAL' }],
        ['TIME_INTERVAL with a zero interval', { owner: 'a', name: 'x', triggerMode: 'TIME_INTERVAL', intervalDays: 0 }],
        ['TIME_INTERVAL with a negative interval', { owner: 'a', name: 'x', triggerMode: 'TIME_INTERVAL', intervalDays: -7 }],
        ['TIME_INTERVAL with a fractional interval', { owner: 'a', name: 'x', triggerMode: 'TIME_INTERVAL', intervalDays: 1.5 }],
      ];

      it.each(invalid)('rejects %s', async (_label, body) => {
        const res = await post(body).expect(HttpStatus.BAD_REQUEST);

        expect(res.body.success).toBe(false);
        expect(connections.create).not.toHaveBeenCalled();
        expect(activityLogRepository.create).not.toHaveBeenCalled();
      });
    });

    it('ignores client-supplied token/secret/status fields', async () => {
      const res = await post({
        owner: 'acme',
        name: 'billing-api',
        webhookToken: 'attacker-token',
        webhookSecret: 'attacker-secret',
        status: 'PAUSED',
        serviceId: 999,
      }).expect(HttpStatus.CREATED);

      const stored = [...connections.rows.values()][0];
      expect(stored.webhookToken).not.toBe('attacker-token');
      expect(res.body.data.webhookSecret).not.toBe('attacker-secret');
      expect(stored.status).toBe(RepositoryConnectionStatus.ACTIVE);
      expect(stored.serviceId).toBe(1);
    });

    // ── auth / permissions ──
    describe('authentication and permissions', () => {
      it('returns 401 when no Authorization header is sent (real AuthGuard)', async () => {
        await app.close();
        app = await buildApp();

        await request(app.getHttpServer())
          .post(BASE)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.UNAUTHORIZED);

        expect(connections.create).not.toHaveBeenCalled();
      });

      it('returns 401 when the token is rejected', async () => {
        await app.close();
        app = await buildApp(new DenyAuthGuardMock());

        await post().expect(HttpStatus.UNAUTHORIZED);
      });

      it('returns 403 for a BUSINESS_MEMBER (managers only)', async () => {
        await rebuildAs(mockMemberJwtPayload);

        await post().expect(HttpStatus.FORBIDDEN);

        expect(connections.create).not.toHaveBeenCalled();
      });

      it('returns 403 when the caller belongs to a different company', async () => {
        await rebuildAs(mockOtherCompanyOwnerJwtPayload);

        await post().expect(HttpStatus.FORBIDDEN);
      });

      it('returns 403 for a non-numeric company id', async () => {
        await request(app.getHttpServer())
          .post('/company/abc/environments/1/services/1/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.FORBIDDEN);
      });

      it('returns 400 for a non-numeric environment or service id', async () => {
        await request(app.getHttpServer())
          .post('/company/1/environments/abc/services/1/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.BAD_REQUEST);
        await request(app.getHttpServer())
          .post('/company/1/environments/1/services/abc/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    // ── not found / conflict / plan limits ──
    describe('resource and business-rule errors', () => {
      it('returns 404 when the environment does not exist', async () => {
        await request(app.getHttpServer())
          .post('/company/1/environments/404/services/1/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.NOT_FOUND);
      });

      it('returns 404 when the environment belongs to another company', async () => {
        await request(app.getHttpServer())
          .post('/company/1/environments/3/services/1/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.NOT_FOUND);
      });

      it('returns 404 when the service does not exist', async () => {
        await request(app.getHttpServer())
          .post('/company/1/environments/1/services/404/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.NOT_FOUND);
      });

      it('returns 404 when the service lives in a different environment', async () => {
        await request(app.getHttpServer())
          .post('/company/1/environments/1/services/2/repository-connection')
          .set('Authorization', AUTH)
          .send({ owner: 'acme', name: 'billing-api' })
          .expect(HttpStatus.NOT_FOUND);
      });

      it('returns 409 when the service already has a connected repository', async () => {
        await post().expect(HttpStatus.CREATED);

        const res = await post({ owner: 'other', name: 'repo' }).expect(
          HttpStatus.CONFLICT,
        );

        expect(res.body.error).toContain('already has a connected repository');
        expect(connections.rows.size).toBe(1);
      });

      it('returns 403 when the plan\'s monitored-branch limit is reached', async () => {
        companyRepository.findById.mockResolvedValue(
          company({ ...paidPlan, name: 'Starter', maxMonitoredBranches: 1 }),
        );
        connections.seed({ serviceId: 2 }); // another service already uses the single slot

        const res = await post().expect(HttpStatus.FORBIDDEN);

        expect(res.body.error).toContain('Starter');
        expect(res.body.error).toContain('1 monitored branch');
        expect(connections.rows.size).toBe(1);
      });

      it('allows the connection that exactly fills the plan limit', async () => {
        companyRepository.findById.mockResolvedValue(
          company({ ...paidPlan, maxMonitoredBranches: 2 }),
        );
        connections.seed({ serviceId: 2 });

        await post().expect(HttpStatus.CREATED);
      });

      it('lets a pay-as-you-go company exceed the plan limit', async () => {
        companyRepository.findById.mockResolvedValue(
          company(
            { ...paidPlan, maxMonitoredBranches: 1 },
            { payAsYouGo: true },
          ),
        );
        connections.seed({ serviceId: 2 });

        await post().expect(HttpStatus.CREATED);
      });

      it('treats a null limit as unlimited', async () => {
        connections.seed({ serviceId: 2 });
        connections.seed({ serviceId: 3 });

        await post().expect(HttpStatus.CREATED);
      });
    });
  });

  // ── GET (Connection status panel) ────────────────────────────────────────

  describe('GET /repository-connection — status panel', () => {
    it('returns 200 with the connection status', async () => {
      connections.seed({
        serviceId: 1,
        lastPingedAt: new Date('2026-02-01T00:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data).toMatchObject({
        owner: 'acme',
        name: 'billing-api',
        watchedBranch: 'main',
        lastPingedAt: '2026-02-01T00:00:00.000Z',
        lastTriggeredAt: null,
        status: 'ACTIVE',
      });
    });

    it('returns 200 with data: null when nothing is connected (empty state)', async () => {
      const res = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({ success: true, error: null, data: null });
    });

    it('never exposes the webhook token or secret', async () => {
      connections.seed({ serviceId: 1 });

      const res = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data).not.toHaveProperty('webhookToken');
      expect(res.body.data).not.toHaveProperty('webhookSecretEnc');
      expect(res.body.data).not.toHaveProperty('webhookSecret');
    });

    it('shows the pending push count for a batching cadence', async () => {
      connections.seed({
        serviceId: 1,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
        pendingPushCount: 3,
      });

      const res = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data).toMatchObject({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 5,
        pendingPushCount: 3,
      });
    });

    it('is readable by a BUSINESS_MEMBER (read-only for any company member)', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockMemberJwtPayload);

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
    });

    it('is readable by a BUSINESS_ADMIN', async () => {
      await rebuildAs(mockAdminJwtPayload);

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
    });

    it('returns 401 when no Authorization header is sent', async () => {
      await app.close();
      app = await buildApp();

      await request(app.getHttpServer()).get(BASE).expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      await rebuildAs(mockOtherCompanyOwnerJwtPayload);

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 404 for an unknown environment, an unknown service, or a mismatched pair', async () => {
      for (const path of [
        '/company/1/environments/404/services/1/repository-connection',
        '/company/1/environments/1/services/404/repository-connection',
        '/company/1/environments/1/services/2/repository-connection',
        '/company/1/environments/3/services/1/repository-connection',
      ]) {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', AUTH)
          .expect(HttpStatus.NOT_FOUND);
      }
    });
  });

  // ── POST rotate-secret (Regenerate secret button) ────────────────────────

  describe('POST /repository-connection/rotate-secret — regenerate button', () => {
    const ROTATE = `${BASE}/rotate-secret`;

    it('returns 200 with a brand-new webhook URL and secret', async () => {
      const original = connections.seed({
        serviceId: 1,
        webhookToken: 'old-token',
        webhookSecretEnc: 'enc(old-secret)',
      });

      const res = await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.data.webhookSecret).not.toBe('old-secret');
      expect(res.body.data.webhookUrl).not.toContain('old-token');
      expect(res.body.data.webhookUrl).toMatch(/\/webhooks\/github\/[0-9a-f-]{36}$/);
      expect(res.body.data.connection.id).toBe(original.id);
    });

    it('invalidates the old token immediately (lookup by old token no longer finds the row)', async () => {
      connections.seed({ serviceId: 1, webhookToken: 'old-token' });

      await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(await connections.findByWebhookToken('old-token')).toBeNull();
    });

    it('stores the new secret encrypted and never exposes stored values on the view', async () => {
      connections.seed({ serviceId: 1 });

      const res = await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      const stored = [...connections.rows.values()][0];
      expect(stored.webhookSecretEnc).toBe(`enc(${res.body.data.webhookSecret})`);
      expect(res.body.data.connection).not.toHaveProperty('webhookToken');
      expect(res.body.data.connection).not.toHaveProperty('webhookSecretEnc');
    });

    it('produces different credentials on every click', async () => {
      connections.seed({ serviceId: 1 });

      const first = await request(app.getHttpServer()).post(ROTATE).set('Authorization', AUTH);
      const second = await request(app.getHttpServer()).post(ROTATE).set('Authorization', AUTH);

      expect(first.body.data.webhookSecret).not.toBe(second.body.data.webhookSecret);
      expect(first.body.data.webhookUrl).not.toBe(second.body.data.webhookUrl);
    });

    it('records who rotated it and logs REPOSITORY_SECRET_ROTATED', async () => {
      connections.seed({ serviceId: 1, connectedById: 999 });
      await rebuildAs(mockAdminJwtPayload);

      await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect([...connections.rows.values()][0].connectedById).toBe(
        mockAdminJwtPayload.sub,
      );
      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_SECRET_ROTATED,
          actorUserId: mockAdminJwtPayload.sub,
        }),
      );
    });

    it('keeps the cadence and watched branch untouched', async () => {
      connections.seed({
        serviceId: 1,
        watchedBranch: 'develop',
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 4,
        pendingPushCount: 2,
      });

      const res = await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data.connection).toMatchObject({
        watchedBranch: 'develop',
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 4,
        pendingPushCount: 2,
      });
    });

    it('returns 404 when no repository is connected', async () => {
      await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.NOT_FOUND);

      expect(connections.rotateSecret).not.toHaveBeenCalled();
    });

    it('returns 404 when the service/environment cannot be resolved', async () => {
      await request(app.getHttpServer())
        .post('/company/1/environments/1/services/2/repository-connection/rotate-secret')
        .set('Authorization', AUTH)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 for a BUSINESS_MEMBER', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockMemberJwtPayload);

      await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.FORBIDDEN);

      expect(connections.rotateSecret).not.toHaveBeenCalled();
    });

    it('returns 403 for a different company', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockOtherCompanyOwnerJwtPayload);

      await request(app.getHttpServer())
        .post(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 401 without a token', async () => {
      await app.close();
      app = await buildApp();

      await request(app.getHttpServer()).post(ROTATE).expect(HttpStatus.UNAUTHORIZED);
    });

    it('is not available over GET', async () => {
      await request(app.getHttpServer())
        .get(ROTATE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── PUT trigger-settings (Cadence form) ──────────────────────────────────

  describe('PUT /repository-connection/trigger-settings — cadence form', () => {
    const SETTINGS = `${BASE}/trigger-settings`;
    const put = (body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .put(SETTINGS)
        .set('Authorization', AUTH)
        .send(body);

    it('switches to INSTANT and clears the other fields', async () => {
      connections.seed({
        serviceId: 1,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
        intervalDays: 7,
      });

      const res = await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.OK);

      expect(res.body.data).toMatchObject({
        triggerMode: 'INSTANT',
        pushCountThreshold: null,
        intervalDays: null,
      });
    });

    it('switches to PUSH_COUNT with a threshold', async () => {
      connections.seed({ serviceId: 1 });

      const res = await put({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 10,
      }).expect(HttpStatus.OK);

      expect(res.body.data).toMatchObject({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 10,
        intervalDays: null,
      });
    });

    it('switches to TIME_INTERVAL with an interval', async () => {
      connections.seed({ serviceId: 1 });

      const res = await put({
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 14,
      }).expect(HttpStatus.OK);

      expect(res.body.data).toMatchObject({
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 14,
        pushCountThreshold: null,
      });
    });

    it('accepts INSTANT with leftover threshold/interval values and still saves INSTANT', async () => {
      connections.seed({ serviceId: 1 });

      const res = await put({
        triggerMode: 'INSTANT',
        pushCountThreshold: 3,
        intervalDays: 2,
      }).expect(HttpStatus.OK);

      // The webhook ignores threshold/interval when the mode is INSTANT, so
      // the leftovers are harmless.
      expect(res.body.data.triggerMode).toBe('INSTANT');
    });

    it('resets the pending push counter (fresh batching window)', async () => {
      connections.seed({
        serviceId: 1,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
        pendingPushCount: 4,
      });

      const res = await put({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 2,
      }).expect(HttpStatus.OK);

      expect(res.body.data.pendingPushCount).toBe(0);
    });

    it('does not touch the branch, owner, repo or secret', async () => {
      const row = connections.seed({
        serviceId: 1,
        watchedBranch: 'develop',
      });

      await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.OK);

      const stored = connections.rows.get(row.id)!;
      expect(stored.watchedBranch).toBe('develop');
      expect(stored.webhookToken).toBe(row.webhookToken);
      expect(stored.webhookSecretEnc).toBe(row.webhookSecretEnc);
    });

    it('is allowed on the free tier (the plan only pre-fills defaults)', async () => {
      companyRepository.findById.mockResolvedValue(company(freePlan));
      connections.seed({ serviceId: 1 });

      await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.OK);
    });

    it('is allowed for a BUSINESS_ADMIN', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockAdminJwtPayload);

      await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.OK);
    });

    it('logs REPOSITORY_TRIGGER_SETTINGS_UPDATED with the new settings', async () => {
      connections.seed({ serviceId: 1 });

      await put({ triggerMode: 'TIME_INTERVAL', intervalDays: 5 }).expect(
        HttpStatus.OK,
      );

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_TRIGGER_SETTINGS_UPDATED,
          metadata: {
            triggerMode: 'TIME_INTERVAL',
            pushCountThreshold: null,
            intervalDays: 5,
          },
        }),
      );
    });

    it('never exposes the token or secret on the response', async () => {
      connections.seed({ serviceId: 1 });

      const res = await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.OK);

      expect(res.body.data).not.toHaveProperty('webhookToken');
      expect(res.body.data).not.toHaveProperty('webhookSecretEnc');
    });

    describe('form validation (400)', () => {
      const invalid: [string, Record<string, unknown>][] = [
        ['an empty body', {}],
        ['a missing triggerMode', { pushCountThreshold: 5 }],
        ['an unknown triggerMode', { triggerMode: 'HOURLY' }],
        ['a lowercase triggerMode', { triggerMode: 'push_count', pushCountThreshold: 5 }],
        ['PUSH_COUNT without a threshold', { triggerMode: 'PUSH_COUNT' }],
        ['PUSH_COUNT with a zero threshold', { triggerMode: 'PUSH_COUNT', pushCountThreshold: 0 }],
        ['PUSH_COUNT with a negative threshold', { triggerMode: 'PUSH_COUNT', pushCountThreshold: -1 }],
        ['PUSH_COUNT with a fractional threshold', { triggerMode: 'PUSH_COUNT', pushCountThreshold: 1.5 }],
        ['PUSH_COUNT with a string threshold', { triggerMode: 'PUSH_COUNT', pushCountThreshold: 'five' }],
        ['TIME_INTERVAL without an interval', { triggerMode: 'TIME_INTERVAL' }],
        ['TIME_INTERVAL with a zero interval', { triggerMode: 'TIME_INTERVAL', intervalDays: 0 }],
        ['TIME_INTERVAL with a negative interval', { triggerMode: 'TIME_INTERVAL', intervalDays: -1 }],
        ['TIME_INTERVAL with a fractional interval', { triggerMode: 'TIME_INTERVAL', intervalDays: 0.5 }],
      ];

      it.each(invalid)('rejects %s', async (_label, body) => {
        const row = connections.seed({ serviceId: 1 });

        const res = await put(body).expect(HttpStatus.BAD_REQUEST);

        expect(res.body.success).toBe(false);
        expect(connections.updateTriggerSettings).not.toHaveBeenCalled();
        expect(connections.rows.get(row.id)!.triggerMode).toBe(
          RepositoryTriggerMode.INSTANT,
        );
      });
    });

    it('returns 404 when no repository is connected', async () => {
      await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when the service/environment cannot be resolved', async () => {
      await request(app.getHttpServer())
        .put('/company/1/environments/1/services/2/repository-connection/trigger-settings')
        .set('Authorization', AUTH)
        .send({ triggerMode: 'INSTANT' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 for a BUSINESS_MEMBER', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockMemberJwtPayload);

      await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.FORBIDDEN);

      expect(connections.updateTriggerSettings).not.toHaveBeenCalled();
    });

    it('returns 403 for a different company', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockOtherCompanyOwnerJwtPayload);

      await put({ triggerMode: 'INSTANT' }).expect(HttpStatus.FORBIDDEN);
    });

    it('returns 401 without a token', async () => {
      await app.close();
      app = await buildApp();

      await request(app.getHttpServer())
        .put(SETTINGS)
        .send({ triggerMode: 'INSTANT' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('is not available over PATCH', async () => {
      connections.seed({ serviceId: 1 });

      await request(app.getHttpServer())
        .patch(SETTINGS)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'INSTANT' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── DELETE (Disconnect button) ───────────────────────────────────────────

  describe('DELETE /repository-connection — disconnect button', () => {
    const del = () =>
      request(app.getHttpServer()).delete(BASE).set('Authorization', AUTH);

    it('returns 200 with a null-data envelope and removes the connection', async () => {
      connections.seed({ serviceId: 1 });

      const res = await del().expect(HttpStatus.OK);

      expect(res.body).toEqual({ success: true, error: null, data: null });
      expect(connections.rows.size).toBe(0);
    });

    it('works for a BUSINESS_ADMIN', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockAdminJwtPayload);

      await del().expect(HttpStatus.OK);
    });

    it('logs REPOSITORY_DISCONNECTED with the owner and repo name', async () => {
      connections.seed({ serviceId: 1, owner: 'octo', name: 'widgets' });

      await del().expect(HttpStatus.OK);

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_DISCONNECTED,
          actorUserId: mockOwnerJwtPayload.sub,
          metadata: { owner: 'octo', name: 'widgets' },
        }),
      );
    });

    it('turns the old webhook URL into a 404 (token lookup finds nothing)', async () => {
      const row = connections.seed({ serviceId: 1, webhookToken: 'live-token' });

      await del().expect(HttpStatus.OK);

      expect(await connections.findByWebhookToken(row.webhookToken)).toBeNull();
    });

    it('a second click returns 404 (already disconnected)', async () => {
      connections.seed({ serviceId: 1 });

      await del().expect(HttpStatus.OK);
      await del().expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when nothing was ever connected', async () => {
      await del().expect(HttpStatus.NOT_FOUND);
      expect(connections.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when the service/environment cannot be resolved', async () => {
      await request(app.getHttpServer())
        .delete('/company/1/environments/1/services/2/repository-connection')
        .set('Authorization', AUTH)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 for a BUSINESS_MEMBER and leaves the connection intact', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockMemberJwtPayload);

      await del().expect(HttpStatus.FORBIDDEN);

      expect(connections.rows.size).toBe(1);
    });

    it('returns 403 for a different company and leaves the connection intact', async () => {
      connections.seed({ serviceId: 1 });
      await rebuildAs(mockOtherCompanyOwnerJwtPayload);

      await del().expect(HttpStatus.FORBIDDEN);

      expect(connections.rows.size).toBe(1);
    });

    it('returns 401 without a token', async () => {
      connections.seed({ serviceId: 1 });
      await app.close();
      app = await buildApp();

      await request(app.getHttpServer()).delete(BASE).expect(HttpStatus.UNAUTHORIZED);

      expect(connections.rows.size).toBe(1);
    });
  });

  // ── full user journeys across the buttons ────────────────────────────────

  describe('end-to-end journeys', () => {
    it('connect -> status -> change cadence -> regenerate secret -> disconnect -> status shows empty', async () => {
      const created = await post().expect(HttpStatus.CREATED);
      expect(created.body.data.connection.triggerMode).toBe('PUSH_COUNT');

      const status = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      expect(status.body.data.owner).toBe('acme');

      const updated = await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'INSTANT' })
        .expect(HttpStatus.OK);
      expect(updated.body.data.triggerMode).toBe('INSTANT');

      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      expect(rotated.body.data.webhookUrl).not.toBe(created.body.data.webhookUrl);
      expect(rotated.body.data.webhookSecret).not.toBe(
        created.body.data.webhookSecret,
      );

      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      const after = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);
      expect(after.body.data).toBeNull();

      expect(
        activityLogRepository.create.mock.calls.map((c) => c[0].eventType),
      ).toEqual([
        ActivityEventType.REPOSITORY_CONNECTED,
        ActivityEventType.REPOSITORY_TRIGGER_SETTINGS_UPDATED,
        ActivityEventType.REPOSITORY_SECRET_ROTATED,
        ActivityEventType.REPOSITORY_DISCONNECTED,
      ]);
    });

    it('can reconnect a different repository after disconnecting', async () => {
      await post().expect(HttpStatus.CREATED);
      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      const res = await post({ owner: 'octo', name: 'widgets' }).expect(
        HttpStatus.CREATED,
      );

      expect(res.body.data.connection).toMatchObject({
        owner: 'octo',
        name: 'widgets',
      });
    });

    it('frees the plan slot after a disconnect', async () => {
      companyRepository.findById.mockResolvedValue(
        company({ ...paidPlan, maxMonitoredBranches: 1 }),
      );
      await post().expect(HttpStatus.CREATED);
      await request(app.getHttpServer())
        .post('/company/1/environments/2/services/2/repository-connection')
        .set('Authorization', AUTH)
        .send({ owner: 'acme', name: 'second' })
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/company/1/environments/2/services/2/repository-connection')
        .set('Authorization', AUTH)
        .send({ owner: 'acme', name: 'second' })
        .expect(HttpStatus.CREATED);
    });

    it('keeps two services in the same company independent', async () => {
      await post().expect(HttpStatus.CREATED);

      const other = await request(app.getHttpServer())
        .get('/company/1/environments/2/services/2/repository-connection')
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(other.body.data).toBeNull();
    });
  });

  // ── provider selection (GitHub / Bitbucket) ──────────────────────────────

  describe('provider selection in the connect form', () => {
    it('defaults to GITHUB with a /webhooks/github/ URL when no provider is sent', async () => {
      const res = await post().expect(HttpStatus.CREATED);

      expect(res.body.data.connection.provider).toBe('GITHUB');
      expect(res.body.data.webhookUrl).toContain('/webhooks/github/');
      expect([...connections.rows.values()][0].provider).toBe('GITHUB');
    });

    it('creates a BITBUCKET connection with a /webhooks/bitbucket/ URL and one-time secret', async () => {
      const res = await post({
        provider: 'BITBUCKET',
        owner: 'acme-workspace',
        name: 'billing-api',
      }).expect(HttpStatus.CREATED);

      expect(res.body.data.connection).toMatchObject({
        provider: 'BITBUCKET',
        owner: 'acme-workspace',
        name: 'billing-api',
        watchedBranch: 'main',
        status: 'ACTIVE',
      });
      expect(res.body.data.webhookUrl).toMatch(
        /^http:\/\/[^/]+\/webhooks\/bitbucket\/[0-9a-f-]{36}$/,
      );
      expect(res.body.data.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
      expect([...connections.rows.values()][0].provider).toBe('BITBUCKET');
    });

    it('never leaks the token or encrypted secret for a Bitbucket connection', async () => {
      const res = await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
      }).expect(HttpStatus.CREATED);

      expect(res.body.data.connection).not.toHaveProperty('webhookToken');
      expect(res.body.data.connection).not.toHaveProperty('webhookSecretEnc');
    });

    it('applies the same cadence defaults and explicit choices to Bitbucket', async () => {
      const dflt = await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
      }).expect(HttpStatus.CREATED);
      expect(dflt.body.data.connection).toMatchObject({
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 5,
      });

      connections.rows.clear();
      const explicit = await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 14,
      }).expect(HttpStatus.CREATED);
      expect(explicit.body.data.connection).toMatchObject({
        triggerMode: 'TIME_INTERVAL',
        intervalDays: 14,
      });
    });

    it('defaults a production-environment Bitbucket connection to INSTANT on a paid plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/company/1/environments/2/services/2/repository-connection')
        .set('Authorization', AUTH)
        .send({ provider: 'BITBUCKET', owner: 'acme', name: 'billing-api' })
        .expect(HttpStatus.CREATED);

      expect(res.body.data.connection.triggerMode).toBe('INSTANT');
    });

    it.each([
      ['an unsupported provider', { provider: 'GITLAB' }],
      ['a lowercase provider', { provider: 'bitbucket' }],
      ['an empty provider', { provider: '' }],
      ['a null provider', { provider: null }],
      ['a numeric provider', { provider: 1 }],
    ])('rejects %s with 400', async (_label, extra) => {
      const res = await post({
        owner: 'acme',
        name: 'billing-api',
        ...extra,
      }).expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(connections.create).not.toHaveBeenCalled();
    });

    it('still validates cadence fields for Bitbucket (PUSH_COUNT needs a threshold)', async () => {
      await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
        triggerMode: 'PUSH_COUNT',
      }).expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 409 when a service with a GitHub connection is given a Bitbucket one', async () => {
      await post().expect(HttpStatus.CREATED);

      await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
      }).expect(HttpStatus.CONFLICT);

      expect(connections.rows.size).toBe(1);
      expect([...connections.rows.values()][0].provider).toBe('GITHUB');
    });

    it('returns 403 for a BUSINESS_MEMBER trying to connect Bitbucket', async () => {
      await rebuildAs(mockMemberJwtPayload);

      await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
      }).expect(HttpStatus.FORBIDDEN);
    });

    it('counts a Bitbucket connection towards the plan monitored-branch limit', async () => {
      companyRepository.findById.mockResolvedValue(
        company({ ...paidPlan, name: 'Starter', maxMonitoredBranches: 1 }),
      );
      connections.seed({ serviceId: 2, provider: 'BITBUCKET' as any });

      await post().expect(HttpStatus.FORBIDDEN);
    });

    it('logs the provider in the REPOSITORY_CONNECTED activity entry', async () => {
      await post({
        provider: 'BITBUCKET',
        owner: 'acme',
        name: 'billing-api',
      }).expect(HttpStatus.CREATED);

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_CONNECTED,
          metadata: expect.objectContaining({ provider: 'BITBUCKET' }),
        }),
      );
    });
  });

  describe('Bitbucket connection: status, regenerate, cadence, disconnect', () => {
    const bitbucket = () =>
      connections.seed({
        serviceId: 1,
        provider: 'BITBUCKET' as any,
        owner: 'acme-workspace',
        name: 'billing-api',
      });

    it('the status panel reports provider BITBUCKET', async () => {
      bitbucket();

      const res = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data.provider).toBe('BITBUCKET');
    });

    it('Regenerate secret returns a /webhooks/bitbucket/ URL and keeps the provider', async () => {
      bitbucket();

      const res = await request(app.getHttpServer())
        .post(`${BASE}/rotate-secret`)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      expect(res.body.data.webhookUrl).toMatch(/\/webhooks\/bitbucket\/[0-9a-f-]{36}$/);
      expect(res.body.data.connection.provider).toBe('BITBUCKET');
      expect(res.body.data.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
    });

    it('the cadence form works and keeps the provider', async () => {
      bitbucket();

      const res = await request(app.getHttpServer())
        .put(`${BASE}/trigger-settings`)
        .set('Authorization', AUTH)
        .send({ triggerMode: 'PUSH_COUNT', pushCountThreshold: 4 })
        .expect(HttpStatus.OK);

      expect(res.body.data).toMatchObject({
        provider: 'BITBUCKET',
        triggerMode: 'PUSH_COUNT',
        pushCountThreshold: 4,
      });
    });

    it('Disconnect removes it, and a GitHub repo can then be connected instead', async () => {
      bitbucket();

      await request(app.getHttpServer())
        .delete(BASE)
        .set('Authorization', AUTH)
        .expect(HttpStatus.OK);

      const res = await post().expect(HttpStatus.CREATED);
      expect(res.body.data.connection.provider).toBe('GITHUB');
    });
  });
});
