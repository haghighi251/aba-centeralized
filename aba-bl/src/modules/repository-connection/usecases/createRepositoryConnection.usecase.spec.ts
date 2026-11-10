import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { RepositoryTriggerMode } from '@aba/database';
import { CreateRepositoryConnectionUseCase } from './createRepositoryConnection.usecase';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';

describe('CreateRepositoryConnectionUseCase', () => {
  let useCase: CreateRepositoryConnectionUseCase;
  let service: jest.Mocked<RepositoryConnectionService>;

  const mockReveal = {
    connection: {
      id: 1,
      triggerMode: RepositoryTriggerMode.INSTANT,
    } as any,
    webhookToken: 'plain-token',
    webhookSecret: 'plain-secret',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRepositoryConnectionUseCase,
        { provide: RepositoryConnectionService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(CreateRepositoryConnectionUseCase);
    service = module.get(RepositoryConnectionService);
  });

  it('returns the reveal payload on success', async () => {
    service.create.mockResolvedValue(ok(mockReveal));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 5,
      actingUserId: 3,
      dto: { owner: 'acme', name: 'billing-api', watchedBranch: 'main' },
    });

    expect(result).toBe(mockReveal);
    expect(service.create).toHaveBeenCalledWith(1, 1, 5, 3, {
      owner: 'acme',
      name: 'billing-api',
      watchedBranch: 'main',
    });
  });

  it('throws ConflictException when the service already has a connection', async () => {
    service.create.mockResolvedValue(err(new ConflictException('already connected')));

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 5,
        actingUserId: 3,
        dto: { owner: 'acme', name: 'billing-api', watchedBranch: 'main' },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when the service is not found', async () => {
    service.create.mockResolvedValue(err(new NotFoundException('not found')));

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        actingUserId: 3,
        dto: { owner: 'acme', name: 'billing-api', watchedBranch: 'main' },
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
