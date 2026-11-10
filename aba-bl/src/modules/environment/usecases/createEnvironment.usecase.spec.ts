import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Environment, EnvironmentStatus, EnvironmentType } from '@aba/database';
import { CreateEnvironmentUseCase } from './createEnvironment.usecase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';

describe('CreateEnvironmentUseCase', () => {
  let useCase: CreateEnvironmentUseCase;
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
        CreateEnvironmentUseCase,
        {
          provide: EnvironmentService,
          useValue: { createEnvironment: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CreateEnvironmentUseCase);
    service = module.get(EnvironmentService);
  });

  it('returns the created environment on success', async () => {
    service.createEnvironment.mockResolvedValue(ok(mockEnvironment));

    const result = await useCase.execute({
      companyId: 1,
      dto: {
        name: 'Production',
        type: EnvironmentType.PRODUCTION,
        isProduction: true,
      },
    });

    expect(result).toBe(mockEnvironment);
    expect(service.createEnvironment).toHaveBeenCalledWith(1, {
      name: 'Production',
      type: EnvironmentType.PRODUCTION,
      isProduction: true,
    });
  });

  it('throws the error returned by the service', async () => {
    const error = new ConflictException('slug taken');
    service.createEnvironment.mockResolvedValue(err(error));

    await expect(
      useCase.execute({
        companyId: 1,
        dto: {
          name: 'Production',
          type: EnvironmentType.PRODUCTION,
          isProduction: true,
        },
      }),
    ).rejects.toThrow(ConflictException);
  });
});
