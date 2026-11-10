import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Service, ServiceStatus, ServiceType } from '@aba/database';
import { DeleteServiceUseCase } from './deleteService.usecase';
import { ServiceService } from '@/modules/service/services/service.service';

describe('DeleteServiceUseCase', () => {
  let useCase: DeleteServiceUseCase;
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
        DeleteServiceUseCase,
        {
          provide: ServiceService,
          useValue: { deleteService: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteServiceUseCase);
    service = module.get(ServiceService);
  });

  it('returns the deleted service on success', async () => {
    service.deleteService.mockResolvedValue(ok(mockService));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
    });

    expect(result).toBe(mockService);
    expect(service.deleteService).toHaveBeenCalledWith(1, 1, 1);
  });

  it('throws NotFoundException when the service reports it', async () => {
    service.deleteService.mockResolvedValue(
      err(new NotFoundException('Service not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, environmentId: 1, serviceId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });
});
