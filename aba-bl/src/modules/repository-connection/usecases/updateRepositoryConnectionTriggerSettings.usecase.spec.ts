import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { RepositoryTriggerMode } from '@aba/database';
import { UpdateRepositoryConnectionTriggerSettingsUseCase } from './updateRepositoryConnectionTriggerSettings.usecase';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';

describe('UpdateRepositoryConnectionTriggerSettingsUseCase', () => {
  let useCase: UpdateRepositoryConnectionTriggerSettingsUseCase;
  let service: jest.Mocked<RepositoryConnectionService>;

  const mockView = {
    id: 1,
    triggerMode: RepositoryTriggerMode.PUSH_COUNT,
    pushCountThreshold: 5,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateRepositoryConnectionTriggerSettingsUseCase,
        {
          provide: RepositoryConnectionService,
          useValue: { updateTriggerSettings: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateRepositoryConnectionTriggerSettingsUseCase);
    service = module.get(RepositoryConnectionService);
  });

  it('returns the updated connection view on success', async () => {
    service.updateTriggerSettings.mockResolvedValue(ok(mockView));

    const dto = {
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      pushCountThreshold: 5,
    };

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 5,
      actingUserId: 3,
      dto,
    });

    expect(result).toBe(mockView);
    expect(service.updateTriggerSettings).toHaveBeenCalledWith(1, 1, 5, 3, dto);
  });

  it('throws NotFoundException when no connection exists', async () => {
    service.updateTriggerSettings.mockResolvedValue(
      err(new NotFoundException('not found')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        actingUserId: 3,
        dto: { triggerMode: RepositoryTriggerMode.INSTANT },
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
