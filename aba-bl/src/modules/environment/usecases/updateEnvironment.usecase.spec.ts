import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Environment, EnvironmentStatus, EnvironmentType } from '@aba/database';
import { UpdateEnvironmentUseCase } from './updateEnvironment.usecase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';

describe('UpdateEnvironmentUseCase', () => {
  let useCase: UpdateEnvironmentUseCase;
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
        UpdateEnvironmentUseCase,
        {
          provide: EnvironmentService,
          useValue: { updateEnvironment: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateEnvironmentUseCase);
    service = module.get(EnvironmentService);
  });

  it('returns the updated environment on success', async () => {
    const updated = { ...mockEnvironment, name: 'Prod EU' };
    service.updateEnvironment.mockResolvedValue(ok(updated));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      dto: { name: 'Prod EU' },
    });

    expect(result).toBe(updated);
    expect(service.updateEnvironment).toHaveBeenCalledWith(1, 1, {
      name: 'Prod EU',
    });
  });

  it('throws NotFoundException when the service reports it', async () => {
    service.updateEnvironment.mockResolvedValue(
      err(new NotFoundException('Environment not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, environmentId: 999, dto: { name: 'X' } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the service reports a slug collision', async () => {
    service.updateEnvironment.mockResolvedValue(
      err(new ConflictException('slug taken')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        dto: { slug: 'taken' },
      }),
    ).rejects.toThrow(ConflictException);
  });
});
