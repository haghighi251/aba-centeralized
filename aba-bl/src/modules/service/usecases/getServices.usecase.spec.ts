import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Service, ServiceStatus, ServiceType } from '@aba/database';
import { GetServicesUseCase } from './getServices.usecase';
import { ServiceService } from '@/modules/service/services/service.service';

describe('GetServicesUseCase', () => {
  let useCase: GetServicesUseCase;
  let service: jest.Mocked<ServiceService>;

  const mockService: Service = {
    id: 1,
    name: 'API Gateway',
    slug: 'api-gateway',
    type: ServiceType.API_GATEWAY,
    description: null,
    baseUrl: 'https://api.example.com',
    rateLimitConfig: null,
    status: ServiceStatus.ACTIVE,
    companyId: 1,
    environmentId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as unknown as Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetServicesUseCase,
        {
          provide: ServiceService,
          useValue: { getServices: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetServicesUseCase);
    service = module.get(ServiceService);
  });

  it('delegates to the service and returns its result', async () => {
    service.getServices.mockResolvedValue(
      ok({ data: [mockService], total: 1 }),
    );

    const filter = {
      companyId: 1,
      environmentId: 1,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
    };

    const result = await useCase.execute(filter);

    expect(result).toEqual({ data: [mockService], total: 1 });
    expect(service.getServices).toHaveBeenCalledWith(filter);
  });

  it('throws the error returned by the service', async () => {
    service.getServices.mockResolvedValue(
      err(new NotFoundException('Environment not found.')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 999,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
