import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { RepositoryTriggerMode } from '@aba/database';
import { GetRepositoryConnectionUseCase } from './getRepositoryConnection.usecase';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';

describe('GetRepositoryConnectionUseCase', () => {
  let useCase: GetRepositoryConnectionUseCase;
  let service: jest.Mocked<RepositoryConnectionService>;

  const mockView = { id: 1, triggerMode: RepositoryTriggerMode.INSTANT } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRepositoryConnectionUseCase,
        { provide: RepositoryConnectionService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(GetRepositoryConnectionUseCase);
    service = module.get(RepositoryConnectionService);
  });

  it('returns the connection view on success', async () => {
    service.get.mockResolvedValue(ok(mockView));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 5,
    });

    expect(result).toBe(mockView);
    expect(service.get).toHaveBeenCalledWith(1, 1, 5);
  });

  it('returns null when no connection exists', async () => {
    service.get.mockResolvedValue(ok(null));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 5,
    });

    expect(result).toBeNull();
  });

  it('throws NotFoundException when the service is not found', async () => {
    service.get.mockResolvedValue(err(new NotFoundException('not found')));

    await expect(
      useCase.execute({ companyId: 1, environmentId: 1, serviceId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });
});
