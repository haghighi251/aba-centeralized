import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Service, ServiceStatus, ServiceType } from '@aba/database';
import { GetServiceByIdUseCase } from './getServiceById.usecase';
import { ServiceService } from '@/modules/service/services/service.service';

describe('GetServiceByIdUseCase', () => {
  let useCase: GetServiceByIdUseCase;
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
        GetServiceByIdUseCase,
        {
          provide: ServiceService,
          useValue: { getServiceById: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetServiceByIdUseCase);
    service = module.get(ServiceService);
  });

  it('returns the service on success', async () => {
    service.getServiceById.mockResolvedValue(ok(mockService));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
    });

    expect(result).toBe(mockService);
    expect(service.getServiceById).toHaveBeenCalledWith(1, 1, 1);
  });

  it('throws the error returned by the service', async () => {
    service.getServiceById.mockResolvedValue(
      err(new NotFoundException('Service not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, environmentId: 1, serviceId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });
});
