import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryProvider, RepositoryTriggerMode } from '@aba/database';
import { RepositoryConnectionController } from './repositoryConnection.controller';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { CreateRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/createRepositoryConnection.usecase';
import { GetRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/getRepositoryConnection.usecase';
import { RotateRepositoryConnectionSecretUseCase } from '@/modules/repository-connection/usecases/rotateRepositoryConnectionSecret.usecase';
import { UpdateRepositoryConnectionTriggerSettingsUseCase } from '@/modules/repository-connection/usecases/updateRepositoryConnectionTriggerSettings.usecase';
import { DeleteRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/deleteRepositoryConnection.usecase';

const mockReq = {
  user: { sub: 5 },
  protocol: 'https',
  get: jest.fn(),
} as any;

describe('RepositoryConnectionController', () => {
  let controller: RepositoryConnectionController;
  let createUseCase: jest.Mocked<CreateRepositoryConnectionUseCase>;
  let getUseCase: jest.Mocked<GetRepositoryConnectionUseCase>;
  let rotateUseCase: jest.Mocked<RotateRepositoryConnectionSecretUseCase>;
  let updateTriggerSettingsUseCase: jest.Mocked<UpdateRepositoryConnectionTriggerSettingsUseCase>;
  let deleteUseCase: jest.Mocked<DeleteRepositoryConnectionUseCase>;

  const mockConnectionView = {
    id: 1,
    provider: RepositoryProvider.GITHUB,
    owner: 'acme',
    name: 'billing-api',
    watchedBranch: 'main',
    triggerMode: RepositoryTriggerMode.INSTANT,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepositoryConnectionController],
      providers: [
        { provide: CreateRepositoryConnectionUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRepositoryConnectionUseCase, useValue: { execute: jest.fn() } },
        {
          provide: RotateRepositoryConnectionSecretUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateRepositoryConnectionTriggerSettingsUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: DeleteRepositoryConnectionUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyAccessGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyManagerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(RepositoryConnectionController);
    createUseCase = module.get(CreateRepositoryConnectionUseCase);
    getUseCase = module.get(GetRepositoryConnectionUseCase);
    rotateUseCase = module.get(RotateRepositoryConnectionSecretUseCase);
    updateTriggerSettingsUseCase = module.get(
      UpdateRepositoryConnectionTriggerSettingsUseCase,
    );
    deleteUseCase = module.get(DeleteRepositoryConnectionUseCase);

    // resetMocks:true in jest.config.ts clears mockReq.get's return value
    // between tests since it's declared at module scope — re-arm it here.
    mockReq.get.mockReturnValue('api.example.com');
  });

  describe('create', () => {
    it('builds the webhook URL from the request host and returns the reveal payload', async () => {
      createUseCase.execute.mockResolvedValue({
        connection: mockConnectionView,
        webhookToken: 'plain-token',
        webhookSecret: 'plain-secret',
      });

      const result = await controller.create(
        1,
        1,
        5,
        {
          provider: RepositoryProvider.GITHUB,
          owner: 'acme',
          name: 'billing-api',
          watchedBranch: 'main',
        },
        mockReq,
      );

      expect(createUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        actingUserId: 5,
        dto: {
          provider: RepositoryProvider.GITHUB,
          owner: 'acme',
          name: 'billing-api',
          watchedBranch: 'main',
        },
      });
      expect(result).toEqual({
        success: true,
        error: null,
        data: {
          connection: mockConnectionView,
          webhookUrl: 'https://api.example.com/webhooks/github/plain-token',
          webhookSecret: 'plain-secret',
        },
      });
    });
  });

  describe('get', () => {
    it('returns the connection view wrapped in the response envelope', async () => {
      getUseCase.execute.mockResolvedValue(mockConnectionView);

      const result = await controller.get(1, 1, 5);

      expect(getUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
      });
      expect(result).toEqual({ success: true, error: null, data: mockConnectionView });
    });

    it('returns null data when no connection exists', async () => {
      getUseCase.execute.mockResolvedValue(null);

      const result = await controller.get(1, 1, 5);

      expect(result.data).toBeNull();
    });
  });

  describe('rotateSecret', () => {
    it('builds the webhook URL and returns the new reveal payload', async () => {
      rotateUseCase.execute.mockResolvedValue({
        connection: mockConnectionView,
        webhookToken: 'new-token',
        webhookSecret: 'new-secret',
      });

      const result = await controller.rotateSecret(1, 1, 5, mockReq);

      expect(rotateUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        actingUserId: 5,
      });
      expect(result.data).toEqual({
        connection: mockConnectionView,
        webhookUrl: 'https://api.example.com/webhooks/github/new-token',
        webhookSecret: 'new-secret',
      });
    });
  });

  describe('updateTriggerSettings', () => {
    it('delegates to the usecase and returns the updated view', async () => {
      updateTriggerSettingsUseCase.execute.mockResolvedValue({
        ...mockConnectionView,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
      });

      const dto = {
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
      };

      const result = await controller.updateTriggerSettings(1, 1, 5, dto, mockReq);

      expect(updateTriggerSettingsUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        actingUserId: 5,
        dto,
      });
      expect(result.data.triggerMode).toBe(RepositoryTriggerMode.PUSH_COUNT);
    });
  });

  describe('remove', () => {
    it('returns a null-data success envelope', async () => {
      deleteUseCase.execute.mockResolvedValue(null);

      const result = await controller.remove(1, 1, 5, mockReq);

      expect(deleteUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        actingUserId: 5,
      });
      expect(result).toEqual({ success: true, error: null, data: null });
    });
  });

  describe('provider-specific webhook URLs', () => {
    const bitbucketView = {
      ...mockConnectionView,
      provider: RepositoryProvider.BITBUCKET,
    };

    it('create builds a /webhooks/bitbucket/ URL for a Bitbucket connection', async () => {
      createUseCase.execute.mockResolvedValue({
        connection: bitbucketView,
        webhookToken: 'bb-token',
        webhookSecret: 'bb-secret',
      });

      const result = await controller.create(
        1,
        1,
        5,
        {
          provider: RepositoryProvider.BITBUCKET,
          owner: 'acme',
          name: 'billing-api',
          watchedBranch: 'main',
        },
        mockReq,
      );

      expect(result.data.webhookUrl).toBe(
        'https://api.example.com/webhooks/bitbucket/bb-token',
      );
    });

    it('rotateSecret builds a /webhooks/bitbucket/ URL for a Bitbucket connection', async () => {
      rotateUseCase.execute.mockResolvedValue({
        connection: bitbucketView,
        webhookToken: 'bb-new',
        webhookSecret: 'bb-secret',
      });

      const result = await controller.rotateSecret(1, 1, 5, mockReq);

      expect(result.data.webhookUrl).toBe(
        'https://api.example.com/webhooks/bitbucket/bb-new',
      );
    });

    it('create still builds a /webhooks/github/ URL for a GitHub connection', async () => {
      createUseCase.execute.mockResolvedValue({
        connection: mockConnectionView,
        webhookToken: 'gh-token',
        webhookSecret: 'gh-secret',
      });

      const result = await controller.create(
        1,
        1,
        5,
        {
          provider: RepositoryProvider.GITHUB,
          owner: 'acme',
          name: 'billing-api',
          watchedBranch: 'main',
        },
        mockReq,
      );

      expect(result.data.webhookUrl).toBe(
        'https://api.example.com/webhooks/github/gh-token',
      );
    });
  });
});
