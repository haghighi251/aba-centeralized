import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { DeleteRepositoryConnectionUseCase } from './deleteRepositoryConnection.usecase';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';

describe('DeleteRepositoryConnectionUseCase', () => {
  let useCase: DeleteRepositoryConnectionUseCase;
  let service: jest.Mocked<RepositoryConnectionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteRepositoryConnectionUseCase,
        { provide: RepositoryConnectionService, useValue: { remove: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(DeleteRepositoryConnectionUseCase);
    service = module.get(RepositoryConnectionService);
  });

  it('returns null on success', async () => {
    service.remove.mockResolvedValue(ok(null));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 5,
      actingUserId: 3,
    });

    expect(result).toBeNull();
    expect(service.remove).toHaveBeenCalledWith(1, 1, 5, 3);
  });

  it('throws NotFoundException when no connection exists', async () => {
    service.remove.mockResolvedValue(err(new NotFoundException('not found')));

    await expect(
      useCase.execute({ companyId: 1, environmentId: 1, serviceId: 5, actingUserId: 3 }),
    ).rejects.toThrow(NotFoundException);
  });
});
