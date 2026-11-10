import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityEventType,
  Environment,
  EnvironmentStatus,
  EnvironmentType,
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
  Service,
  ServiceStatus,
  ServiceType,
} from '@aba/database';
import { RepositoryConnectionService } from './repositoryConnection.service';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { CreateRepositoryConnectionDtoSchema } from '@/modules/repository-connection/dtos/CreateRepositoryConnectionDto';

describe('RepositoryConnectionService', () => {
  let service: RepositoryConnectionService;
  let repositoryConnectionRepository: jest.Mocked<RepositoryConnectionRepository>;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let environmentRepository: jest.Mocked<EnvironmentRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let activityLogRepository: jest.Mocked<ActivityLogRepository>;
  let cryptoService: jest.Mocked<CryptoService>;

  const mockEnvironment: Environment = {
    id: 1,
    name: 'dev',
    slug: 'dev',
    type: EnvironmentType.DEVELOPMENT,
    isProduction: false,
    order: 1,
    description: null,
    status: EnvironmentStatus.ACTIVE,
    companyId: 1,
    teamId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Environment;

  const mockService: Service = {
    id: 5,
    name: 'billing-api',
    slug: 'billing-api',
    type: ServiceType.API_GATEWAY,
    description: null,
    baseUrl: 'https://api.example.com',
    rateLimitConfig: null,
    status: ServiceStatus.ACTIVE,
    companyId: 1,
    environmentId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as unknown as Service;

  const mockConnection = {
    id: 10,
    provider: RepositoryProvider.GITHUB,
    owner: 'acme',
    name: 'billing-api',
    watchedBranch: 'main',
    webhookToken: 'plain-token',
    webhookSecretEnc: 'enc-secret',
    status: RepositoryConnectionStatus.ACTIVE,
    lastPingedAt: null,
    lastTriggeredAt: null,
    triggerMode: RepositoryTriggerMode.INSTANT,
    pushCountThreshold: null,
    intervalDays: null,
    pendingPushCount: 0,
    serviceId: 5,
    connectedById: 3,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const baseDto: CreateRepositoryConnectionDtoSchema = {
    provider: RepositoryProvider.GITHUB,
    owner: 'acme',
    name: 'billing-api',
    watchedBranch: 'main',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoryConnectionService,
        {
          provide: RepositoryConnectionRepository,
          useValue: {
            findByServiceId: jest.fn(),
            countForCompany: jest.fn(),
            create: jest.fn(),
            rotateSecret: jest.fn(),
            updateTriggerSettings: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ServiceRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: EnvironmentRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: CompanyRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CryptoService,
          useValue: {
            encrypt: jest.fn((v: string) => `enc(${v})`),
            decrypt: jest.fn((v: string) => v),
          },
        },
      ],
    }).compile();

    service = module.get(RepositoryConnectionService);
    repositoryConnectionRepository = module.get(RepositoryConnectionRepository);
    serviceRepository = module.get(ServiceRepository);
    environmentRepository = module.get(EnvironmentRepository);
    companyRepository = module.get(CompanyRepository);
    activityLogRepository = module.get(ActivityLogRepository);
    cryptoService = module.get(CryptoService);
  });

  function seedValidServiceLookup(
    environmentOverrides: Partial<Environment> = {},
  ) {
    environmentRepository.findById.mockResolvedValue({
      ...mockEnvironment,
      ...environmentOverrides,
    });
    serviceRepository.findById.mockResolvedValue(mockService);
  }

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns NotFoundException when the environment does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });

    it('returns NotFoundException when the environment belongs to another company', async () => {
      environmentRepository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 99,
      });

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the service does not belong to the environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      serviceRepository.findById.mockResolvedValue({
        ...mockService,
        environmentId: 99,
      });

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });

    it('returns ConflictException when the service already has a connection', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(ConflictException);
      expect(repositoryConnectionRepository.create).not.toHaveBeenCalled();
    });

    it('returns ForbiddenException when the plan monitored-branch limit is reached', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: false,
        subscriptionPlan: { name: 'Professional', maxMonitoredBranches: 2 },
      } as any);
      repositoryConnectionRepository.countForCompany.mockResolvedValue(2);

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenException);
        expect(result.error.message).toContain('Professional');
      }
      expect(repositoryConnectionRepository.create).not.toHaveBeenCalled();
    });

    it('bypasses the plan limit when payAsYouGo is enabled', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: true,
        subscriptionPlan: { name: 'Professional', maxMonitoredBranches: 1 },
      } as any);
      repositoryConnectionRepository.countForCompany.mockResolvedValue(5);
      repositoryConnectionRepository.create.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isOk()).toBe(true);
      expect(repositoryConnectionRepository.create).toHaveBeenCalled();
    });

    it('allows creation when maxMonitoredBranches is null (unlimited)', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: false,
        subscriptionPlan: { name: 'Enterprise', maxMonitoredBranches: null },
      } as any);
      repositoryConnectionRepository.create.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isOk()).toBe(true);
      expect(repositoryConnectionRepository.countForCompany).not.toHaveBeenCalled();
    });

    it('encrypts the generated secret and returns the plaintext exactly once', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue(null);
      repositoryConnectionRepository.create.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.webhookToken).toEqual(expect.any(String));
        expect(result.value.webhookSecret).toEqual(expect.any(String));
        expect(result.value.connection).not.toHaveProperty('webhookToken');
        expect(result.value.connection).not.toHaveProperty('webhookSecretEnc');
      }
      expect(cryptoService.encrypt).toHaveBeenCalledWith(
        expect.any(String),
      );
      const createCall = repositoryConnectionRepository.create.mock.calls[0][0];
      expect(createCall.webhookSecretEnc).toBe(
        cryptoService.encrypt.mock.results[0].value,
      );
    });

    it('logs a REPOSITORY_CONNECTED activity entry', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue(null);
      repositoryConnectionRepository.create.mockResolvedValue(
        mockConnection as any,
      );

      await service.create(1, 1, 5, 3, baseDto);

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_CONNECTED,
          actorUserId: 3,
          companyId: 1,
          environmentId: 1,
          serviceId: 5,
        }),
      );
    });

    // ── cadence resolution ─────────────────────────────────────────────────

    describe('cadence resolution', () => {
      it('uses the explicit triggerMode from the dto when provided', async () => {
        seedValidServiceLookup({ isProduction: true });
        repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
        companyRepository.findById.mockResolvedValue({
          payAsYouGo: false,
          subscriptionPlan: { name: 'Starter', monthlyPrice: 0 },
        } as any);
        repositoryConnectionRepository.create.mockResolvedValue(
          mockConnection as any,
        );

        await service.create(1, 1, 5, 3, {
          ...baseDto,
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 9,
        });

        expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerMode: RepositoryTriggerMode.PUSH_COUNT,
            pushCountThreshold: 9,
            intervalDays: null,
          }),
        );
      });

      it('defaults a production-environment connection to INSTANT on a paid plan', async () => {
        seedValidServiceLookup({ isProduction: true });
        repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
        companyRepository.findById.mockResolvedValue({
          payAsYouGo: false,
          subscriptionPlan: { name: 'Professional', monthlyPrice: 380 },
        } as any);
        repositoryConnectionRepository.create.mockResolvedValue(
          mockConnection as any,
        );

        await service.create(1, 1, 5, 3, baseDto);

        expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerMode: RepositoryTriggerMode.INSTANT,
            pushCountThreshold: null,
            intervalDays: null,
          }),
        );
      });

      it('does not default a production-environment connection to INSTANT on the free tier', async () => {
        seedValidServiceLookup({ isProduction: true });
        repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
        companyRepository.findById.mockResolvedValue({
          payAsYouGo: false,
          subscriptionPlan: { name: 'Starter', monthlyPrice: 0 },
        } as any);
        repositoryConnectionRepository.create.mockResolvedValue(
          mockConnection as any,
        );

        await service.create(1, 1, 5, 3, baseDto);

        expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ triggerMode: RepositoryTriggerMode.PUSH_COUNT }),
        );
      });

      it('does not default to INSTANT when there is no plan at all, even on a production environment', async () => {
        seedValidServiceLookup({ isProduction: true });
        repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
        companyRepository.findById.mockResolvedValue(null);
        repositoryConnectionRepository.create.mockResolvedValue(
          mockConnection as any,
        );

        await service.create(1, 1, 5, 3, baseDto);

        expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerMode: RepositoryTriggerMode.PUSH_COUNT,
            pushCountThreshold: 5,
            intervalDays: 7,
          }),
        );
      });

      it('uses the plan default cadence for a non-production environment', async () => {
        seedValidServiceLookup({ isProduction: false });
        repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
        companyRepository.findById.mockResolvedValue({
          payAsYouGo: false,
          subscriptionPlan: {
            name: 'Professional',
            monthlyPrice: 380,
            defaultTriggerMode: RepositoryTriggerMode.TIME_INTERVAL,
            defaultIntervalDays: 14,
          },
        } as any);
        repositoryConnectionRepository.create.mockResolvedValue(
          mockConnection as any,
        );

        await service.create(1, 1, 5, 3, baseDto);

        expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
            intervalDays: 14,
          }),
        );
      });

      it('falls back to the system default (PUSH_COUNT/5/7) when the plan has no defaults configured', async () => {
        seedValidServiceLookup({ isProduction: false });
        repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
        companyRepository.findById.mockResolvedValue({
          payAsYouGo: false,
          subscriptionPlan: {
            name: 'Basic',
            monthlyPrice: 69,
            defaultTriggerMode: null,
            defaultPushCountThreshold: null,
            defaultIntervalDays: null,
          },
        } as any);
        repositoryConnectionRepository.create.mockResolvedValue(
          mockConnection as any,
        );

        await service.create(1, 1, 5, 3, baseDto);

        expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerMode: RepositoryTriggerMode.PUSH_COUNT,
            pushCountThreshold: 5,
            intervalDays: 7,
          }),
        );
      });
    });
  });

  // ── get ─────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the redacted connection when one exists', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.get(1, 1, 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).not.toHaveProperty('webhookToken');
        expect(result.value).not.toHaveProperty('webhookSecretEnc');
      }
    });

    it('returns null when no connection exists', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      const result = await service.get(1, 1, 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBeNull();
    });

    it('returns NotFoundException when the service/environment cannot be resolved', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.get(1, 1, 5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });
  });

  // ── rotateSecret ──────────────────────────────────────────────────────────

  describe('rotateSecret', () => {
    it('rotates the token and secret and logs the activity', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );
      repositoryConnectionRepository.rotateSecret.mockResolvedValue({
        ...mockConnection,
        webhookToken: 'new-token',
      } as any);

      const result = await service.rotateSecret(1, 1, 5, 3);

      expect(result.isOk()).toBe(true);
      expect(repositoryConnectionRepository.rotateSecret).toHaveBeenCalledWith(
        mockConnection.id,
        expect.any(String),
        expect.any(String),
        3,
      );
      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_SECRET_ROTATED,
        }),
      );
    });

    it('returns NotFoundException when no connection exists to rotate', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      const result = await service.rotateSecret(1, 1, 5, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the service/environment cannot be resolved', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.rotateSecret(1, 1, 5, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });
  });

  // ── updateTriggerSettings ─────────────────────────────────────────────────

  describe('updateTriggerSettings', () => {
    it('updates the cadence and logs the activity', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );
      repositoryConnectionRepository.updateTriggerSettings.mockResolvedValue({
        ...mockConnection,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
      } as any);

      const result = await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
      });

      expect(result.isOk()).toBe(true);
      expect(
        repositoryConnectionRepository.updateTriggerSettings,
      ).toHaveBeenCalledWith(mockConnection.id, {
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
        intervalDays: null,
      });
      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_TRIGGER_SETTINGS_UPDATED,
        }),
      );
    });

    it('returns NotFoundException when no connection exists', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      const result = await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.INSTANT,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the service/environment cannot be resolved', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.INSTANT,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the connection and logs the activity', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.remove(1, 1, 5, 3);

      expect(result.isOk()).toBe(true);
      expect(repositoryConnectionRepository.delete).toHaveBeenCalledWith(
        mockConnection.id,
      );
      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_DISCONNECTED,
        }),
      );
    });

    it('returns NotFoundException when no connection exists', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      const result = await service.remove(1, 1, 5, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
      expect(repositoryConnectionRepository.delete).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the service/environment cannot be resolved', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.remove(1, 1, 5, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundException);
    });
  });

  // ── form / button scenario edge cases ────────────────────────────────────────

  describe('create — extra scenarios', () => {
    function seedCreate(
      plan: Record<string, unknown> | null = null,
      companyOverrides: Record<string, unknown> = {},
      environmentOverrides: Partial<Environment> = {},
    ) {
      seedValidServiceLookup(environmentOverrides);
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: false,
        subscriptionPlan: plan,
        ...companyOverrides,
      } as any);
      repositoryConnectionRepository.countForCompany.mockResolvedValue(0);
      repositoryConnectionRepository.create.mockImplementation(
        async (data: any) => ({ ...mockConnection, ...data }) as any,
      );
    }

    it('never exposes the webhook token or encrypted secret on the returned connection view', async () => {
      seedCreate();

      const result = await service.create(1, 1, 5, 3, baseDto);

      const { connection, webhookToken, webhookSecret } = result._unsafeUnwrap();
      expect(connection).not.toHaveProperty('webhookToken');
      expect(connection).not.toHaveProperty('webhookSecretEnc');
      expect(webhookToken).toEqual(expect.any(String));
      expect(webhookSecret).toEqual(expect.any(String));
    });

    it('generates a UUID token and a 64-hex-char secret', async () => {
      seedCreate();

      const { webhookToken, webhookSecret } = (
        await service.create(1, 1, 5, 3, baseDto)
      )._unsafeUnwrap();

      expect(webhookToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(webhookSecret).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates different credentials on every call', async () => {
      seedCreate();

      const first = (await service.create(1, 1, 5, 3, baseDto))._unsafeUnwrap();
      const second = (await service.create(1, 1, 5, 3, baseDto))._unsafeUnwrap();

      expect(first.webhookToken).not.toBe(second.webhookToken);
      expect(first.webhookSecret).not.toBe(second.webhookSecret);
    });

    it('persists the plaintext secret only in encrypted form', async () => {
      seedCreate();

      const { webhookSecret } = (
        await service.create(1, 1, 5, 3, baseDto)
      )._unsafeUnwrap();

      const saved = repositoryConnectionRepository.create.mock.calls[0][0] as any;
      expect(saved.webhookSecretEnc).toBe(`enc(${webhookSecret})`);
      expect(JSON.stringify(saved)).not.toContain(`"${webhookSecret}"`);
    });

    it('stores the owner, repo, branch, service and acting user on the connection', async () => {
      seedCreate();

      await service.create(1, 1, 5, 42, {
        owner: 'octo',
        name: 'widgets',
        watchedBranch: 'develop',
      });

      expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'octo',
          name: 'widgets',
          watchedBranch: 'develop',
          serviceId: 5,
          connectedById: 42,
        }),
      );
    });

    it('allows the connection that stays exactly one below the plan limit', async () => {
      seedCreate({ name: 'Starter', maxMonitoredBranches: 3, monthlyPrice: 10 });
      repositoryConnectionRepository.countForCompany.mockResolvedValue(2);

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isOk()).toBe(true);
    });

    it('rejects when the company is already above the plan limit', async () => {
      seedCreate({ name: 'Starter', maxMonitoredBranches: 1, monthlyPrice: 10 });
      repositoryConnectionRepository.countForCompany.mockResolvedValue(4);

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenException);
    });

    it('names the plan and the limit in the plan-limit error message', async () => {
      seedCreate({ name: 'Starter', maxMonitoredBranches: 1, monthlyPrice: 10 });
      repositoryConnectionRepository.countForCompany.mockResolvedValue(1);

      const error = (await service.create(1, 1, 5, 3, baseDto))._unsafeUnwrapErr();

      expect(error.message).toContain('Starter');
      expect(error.message).toContain('1 monitored branch');
    });

    it('does not count connections when the company has no plan at all', async () => {
      seedCreate(null);

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isOk()).toBe(true);
      expect(repositoryConnectionRepository.countForCompany).not.toHaveBeenCalled();
    });

    it('does not count connections for a pay-as-you-go company', async () => {
      seedCreate(
        { name: 'Starter', maxMonitoredBranches: 1, monthlyPrice: 10 },
        { payAsYouGo: true },
      );

      await service.create(1, 1, 5, 3, baseDto);

      expect(repositoryConnectionRepository.countForCompany).not.toHaveBeenCalled();
    });

    it('does not persist or log anything when the service already has a connection', async () => {
      seedCreate();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictException);
      expect(repositoryConnectionRepository.create).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
      expect(cryptoService.encrypt).not.toHaveBeenCalled();
    });

    it('does not persist or log anything when the plan limit is reached', async () => {
      seedCreate({ name: 'Starter', maxMonitoredBranches: 1, monthlyPrice: 10 });
      repositoryConnectionRepository.countForCompany.mockResolvedValue(1);

      await service.create(1, 1, 5, 3, baseDto);

      expect(repositoryConnectionRepository.create).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
    });

    it('checks the duplicate-connection conflict before the plan limit', async () => {
      seedCreate({ name: 'Starter', maxMonitoredBranches: 1, monthlyPrice: 10 });
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );
      repositoryConnectionRepository.countForCompany.mockResolvedValue(5);

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictException);
    });

    it('stores an explicit PUSH_COUNT choice with its threshold and no interval', async () => {
      seedCreate();

      await service.create(1, 1, 5, 3, {
        ...baseDto,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 8,
      });

      expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 8,
          intervalDays: null,
        }),
      );
    });

    it('stores an explicit TIME_INTERVAL choice with its interval and no threshold', async () => {
      seedCreate();

      await service.create(1, 1, 5, 3, {
        ...baseDto,
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        intervalDays: 14,
      });

      expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          pushCountThreshold: null,
          intervalDays: 14,
        }),
      );
    });

    it('lets an explicit cadence override the INSTANT default on a production branch', async () => {
      seedCreate(
        { name: 'Pro', monthlyPrice: 99, maxMonitoredBranches: null },
        {},
        { isProduction: true },
      );

      await service.create(1, 1, 5, 3, {
        ...baseDto,
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        intervalDays: 3,
      });

      expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          intervalDays: 3,
        }),
      );
    });

    it('records owner, repo and branch in the REPOSITORY_CONNECTED activity metadata', async () => {
      seedCreate();

      await service.create(1, 1, 5, 42, baseDto);

      expect(activityLogRepository.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.REPOSITORY_CONNECTED,
        actorUserId: 42,
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        metadata: {
          provider: RepositoryProvider.GITHUB,
          owner: 'acme',
          name: 'billing-api',
          branch: 'main',
        },
      });
    });
  });

  describe('get — extra scenarios', () => {
    it('never exposes the webhook token or encrypted secret', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      const view = (await service.get(1, 1, 5))._unsafeUnwrap();

      expect(view).not.toHaveProperty('webhookToken');
      expect(view).not.toHaveProperty('webhookSecretEnc');
      expect(view).toMatchObject({ owner: 'acme', name: 'billing-api' });
    });

    it('does not query the connection when the service is not in that environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      serviceRepository.findById.mockResolvedValue({
        ...mockService,
        environmentId: 99,
      } as Service);

      const result = await service.get(1, 1, 5);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
      expect(repositoryConnectionRepository.findByServiceId).not.toHaveBeenCalled();
    });

    it('does not reveal a connection that belongs to another company', async () => {
      environmentRepository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 999,
      });

      const result = await service.get(1, 1, 5);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
      expect(repositoryConnectionRepository.findByServiceId).not.toHaveBeenCalled();
    });
  });

  describe('rotateSecret — extra scenarios', () => {
    function seedRotate() {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );
      repositoryConnectionRepository.rotateSecret.mockImplementation(
        async (_id: number, token: string, enc: string) =>
          ({ ...mockConnection, webhookToken: token, webhookSecretEnc: enc }) as any,
      );
    }

    it('issues a new token and secret different from the existing ones', async () => {
      seedRotate();

      const result = (await service.rotateSecret(1, 1, 5, 3))._unsafeUnwrap();

      expect(result.webhookToken).not.toBe(mockConnection.webhookToken);
      expect(result.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
    });

    it('stores only the encrypted form of the new secret', async () => {
      seedRotate();

      const { webhookSecret } = (
        await service.rotateSecret(1, 1, 5, 3)
      )._unsafeUnwrap();

      expect(repositoryConnectionRepository.rotateSecret).toHaveBeenCalledWith(
        mockConnection.id,
        expect.any(String),
        `enc(${webhookSecret})`,
        3,
      );
    });

    it('never exposes the stored token or encrypted secret on the connection view', async () => {
      seedRotate();

      const { connection } = (
        await service.rotateSecret(1, 1, 5, 3)
      )._unsafeUnwrap();

      expect(connection).not.toHaveProperty('webhookToken');
      expect(connection).not.toHaveProperty('webhookSecretEnc');
    });

    it('is not subject to the monitored-branch plan limit', async () => {
      seedRotate();

      await service.rotateSecret(1, 1, 5, 3);

      expect(companyRepository.findById).not.toHaveBeenCalled();
      expect(repositoryConnectionRepository.countForCompany).not.toHaveBeenCalled();
    });

    it('does not log or rotate when there is nothing to rotate', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      await service.rotateSecret(1, 1, 5, 3);

      expect(repositoryConnectionRepository.rotateSecret).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTriggerSettings — extra scenarios', () => {
    function seedUpdate() {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );
      repositoryConnectionRepository.updateTriggerSettings.mockImplementation(
        async (_id: number, settings: any) =>
          ({ ...mockConnection, ...settings }) as any,
      );
    }

    it('clears the threshold and interval when switching to INSTANT', async () => {
      seedUpdate();

      await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.INSTANT,
      });

      expect(
        repositoryConnectionRepository.updateTriggerSettings,
      ).toHaveBeenCalledWith(mockConnection.id, {
        triggerMode: RepositoryTriggerMode.INSTANT,
        pushCountThreshold: null,
        intervalDays: null,
      });
    });

    it('saves an interval for TIME_INTERVAL and logs the new settings', async () => {
      seedUpdate();

      await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        intervalDays: 14,
      });

      expect(
        repositoryConnectionRepository.updateTriggerSettings,
      ).toHaveBeenCalledWith(mockConnection.id, {
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        pushCountThreshold: null,
        intervalDays: 14,
      });
      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_TRIGGER_SETTINGS_UPDATED,
          actorUserId: 3,
          metadata: {
            triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
            pushCountThreshold: null,
            intervalDays: 14,
          },
        }),
      );
    });

    it('is available on the free tier — it never consults the plan or company', async () => {
      seedUpdate();

      const result = await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.INSTANT,
      });

      expect(result.isOk()).toBe(true);
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it('returns a view without the webhook token or encrypted secret', async () => {
      seedUpdate();

      const view = (
        await service.updateTriggerSettings(1, 1, 5, 3, {
          triggerMode: RepositoryTriggerMode.INSTANT,
        })
      )._unsafeUnwrap();

      expect(view).not.toHaveProperty('webhookToken');
      expect(view).not.toHaveProperty('webhookSecretEnc');
    });

    it('does not write or log anything when there is no connection', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      await service.updateTriggerSettings(1, 1, 5, 3, {
        triggerMode: RepositoryTriggerMode.INSTANT,
      });

      expect(
        repositoryConnectionRepository.updateTriggerSettings,
      ).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('remove — extra scenarios', () => {
    it('does not delete or log when the service is not found', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      await service.remove(1, 1, 5, 3);

      expect(repositoryConnectionRepository.delete).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
    });

    it('does not delete or log when no connection exists', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);

      await service.remove(1, 1, 5, 3);

      expect(repositoryConnectionRepository.delete).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
    });

    it('logs the disconnected owner and repo name', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      await service.remove(1, 1, 5, 7);

      expect(activityLogRepository.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.REPOSITORY_DISCONNECTED,
        actorUserId: 7,
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        metadata: { owner: 'acme', name: 'billing-api' },
      });
    });

    it('allows reconnecting right after a disconnect (no lingering conflict)', async () => {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValueOnce(
        mockConnection as any,
      );
      await service.remove(1, 1, 5, 3);

      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: false,
        subscriptionPlan: null,
      } as any);
      repositoryConnectionRepository.create.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, baseDto);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Bitbucket provider', () => {
    function seedCreate() {
      seedValidServiceLookup();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(null);
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: false,
        subscriptionPlan: null,
      } as any);
      repositoryConnectionRepository.create.mockImplementation(
        async (data: any) => ({ ...mockConnection, ...data }) as any,
      );
    }

    it('persists the BITBUCKET provider on the new connection', async () => {
      seedCreate();

      const result = await service.create(1, 1, 5, 3, {
        ...baseDto,
        provider: RepositoryProvider.BITBUCKET,
      });

      expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ provider: RepositoryProvider.BITBUCKET }),
      );
      expect(result._unsafeUnwrap().connection.provider).toBe(
        RepositoryProvider.BITBUCKET,
      );
    });

    it('persists GITHUB when the provider is GITHUB', async () => {
      seedCreate();

      await service.create(1, 1, 5, 3, baseDto);

      expect(repositoryConnectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ provider: RepositoryProvider.GITHUB }),
      );
    });

    it('records the provider in the REPOSITORY_CONNECTED activity metadata', async () => {
      seedCreate();

      await service.create(1, 1, 5, 3, {
        ...baseDto,
        provider: RepositoryProvider.BITBUCKET,
      });

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_CONNECTED,
          metadata: expect.objectContaining({
            provider: RepositoryProvider.BITBUCKET,
          }),
        }),
      );
    });

    it('rejects a second connection regardless of provider (one connection per service)', async () => {
      seedCreate();
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        mockConnection as any,
      );

      const result = await service.create(1, 1, 5, 3, {
        ...baseDto,
        provider: RepositoryProvider.BITBUCKET,
      });

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictException);
    });

    it('counts Bitbucket connections towards the plan monitored-branch limit', async () => {
      seedCreate();
      companyRepository.findById.mockResolvedValue({
        id: 1,
        payAsYouGo: false,
        subscriptionPlan: {
          name: 'Starter',
          monthlyPrice: 10,
          maxMonitoredBranches: 1,
        },
      } as any);
      repositoryConnectionRepository.countForCompany.mockResolvedValue(1);

      const result = await service.create(1, 1, 5, 3, {
        ...baseDto,
        provider: RepositoryProvider.BITBUCKET,
      });

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenException);
    });

    it('keeps the provider unchanged when rotating the secret', async () => {
      seedValidServiceLookup();
      const bitbucket = {
        ...mockConnection,
        provider: RepositoryProvider.BITBUCKET,
      };
      repositoryConnectionRepository.findByServiceId.mockResolvedValue(
        bitbucket as any,
      );
      repositoryConnectionRepository.rotateSecret.mockResolvedValue(
        bitbucket as any,
      );

      const result = await service.rotateSecret(1, 1, 5, 3);

      expect(result._unsafeUnwrap().connection.provider).toBe(
        RepositoryProvider.BITBUCKET,
      );
    });
  });
});
