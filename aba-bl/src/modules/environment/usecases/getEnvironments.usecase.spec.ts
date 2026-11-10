import { Test, TestingModule } from '@nestjs/testing';
import { Environment, EnvironmentStatus, EnvironmentType } from '@aba/database';
import { GetEnvironmentsUseCase } from './getEnvironments.usecase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';

describe('GetEnvironmentsUseCase', () => {
  let useCase: GetEnvironmentsUseCase;
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
        GetEnvironmentsUseCase,
        {
          provide: EnvironmentService,
          useValue: { getEnvironments: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetEnvironmentsUseCase);
    service = module.get(EnvironmentService);
  });

  it('delegates to the service and returns its result', async () => {
    service.getEnvironments.mockResolvedValue({
      data: [mockEnvironment],
      total: 1,
    });

    const filter = {
      companyId: 1,
      sortBy: 'order' as const,
      sortOrder: 'asc' as const,
    };

    const result = await useCase.execute(filter);

    expect(result).toEqual({ data: [mockEnvironment], total: 1 });
    expect(service.getEnvironments).toHaveBeenCalledWith(filter);
  });
});
