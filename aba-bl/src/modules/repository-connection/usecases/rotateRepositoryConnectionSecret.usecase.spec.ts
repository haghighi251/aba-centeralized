import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { RepositoryTriggerMode } from '@aba/database';
import { RotateRepositoryConnectionSecretUseCase } from './rotateRepositoryConnectionSecret.usecase';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';

describe('RotateRepositoryConnectionSecretUseCase', () => {
  let useCase: RotateRepositoryConnectionSecretUseCase;
  let service: jest.Mocked<RepositoryConnectionService>;

  const mockReveal = {
    connection: { id: 1, triggerMode: RepositoryTriggerMode.INSTANT } as any,
    webhookToken: 'new-token',
    webhookSecret: 'new-secret',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RotateRepositoryConnectionSecretUseCase,
        { provide: RepositoryConnectionService, useValue: { rotateSecret: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(RotateRepositoryConnectionSecretUseCase);
    service = module.get(RepositoryConnectionService);
  });

  it('returns the reveal payload on success', async () => {
    service.rotateSecret.mockResolvedValue(ok(mockReveal));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 5,
      actingUserId: 3,
    });

    expect(result).toBe(mockReveal);
    expect(service.rotateSecret).toHaveBeenCalledWith(1, 1, 5, 3);
  });

  it('throws NotFoundException when no connection exists', async () => {
    service.rotateSecret.mockResolvedValue(err(new NotFoundException('not found')));

    await expect(
      useCase.execute({ companyId: 1, environmentId: 1, serviceId: 5, actingUserId: 3 }),
    ).rejects.toThrow(NotFoundException);
  });
});
