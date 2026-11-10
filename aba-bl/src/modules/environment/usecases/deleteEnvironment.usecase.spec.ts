import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Environment, EnvironmentStatus, EnvironmentType } from '@aba/database';
import { DeleteEnvironmentUseCase } from './deleteEnvironment.usecase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';

describe('DeleteEnvironmentUseCase', () => {
  let useCase: DeleteEnvironmentUseCase;
  let service: jest.Mocked<EnvironmentService>;

  const mockEnvironment: Environment = {
    id: 1,
    name: 'Production',
    slug: 'production',
    type: EnvironmentType.PRODUCTION,
    isProduction: true,
    order: 4,
    description: null,
    status: EnvironmentStatus.ACTIVE,
    companyId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Environment;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteEnvironmentUseCase,
        {
          provide: EnvironmentService,
          useValue: { deleteEnvironment: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteEnvironmentUseCase);
    service = module.get(EnvironmentService);
  });

  it('returns the deleted environment on success', async () => {
    service.deleteEnvironment.mockResolvedValue(ok(mockEnvironment));

    const result = await useCase.execute({ companyId: 1, environmentId: 1 });

    expect(result).toBe(mockEnvironment);
    expect(service.deleteEnvironment).toHaveBeenCalledWith(1, 1);
  });

  it('throws NotFoundException when the service reports it', async () => {
    service.deleteEnvironment.mockResolvedValue(
      err(new NotFoundException('Environment not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, environmentId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });
});
