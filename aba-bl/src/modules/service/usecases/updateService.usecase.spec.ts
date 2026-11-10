import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Service, ServiceStatus, ServiceType } from '@aba/database';
import { UpdateServiceUseCase } from './updateService.usecase';
import { ServiceService } from '@/modules/service/services/service.service';

describe('UpdateServiceUseCase', () => {
  let useCase: UpdateServiceUseCase;
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
        UpdateServiceUseCase,
        {
          provide: ServiceService,
          useValue: { updateService: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateServiceUseCase);
    service = module.get(ServiceService);
  });

  it('returns the updated service on success', async () => {
    const updated = { ...mockService, name: 'Payments API' };
    service.updateService.mockResolvedValue(ok(updated));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      dto: { name: 'Payments API' },
    });

    expect(result).toBe(updated);
    expect(service.updateService).toHaveBeenCalledWith(1, 1, 1, {
      name: 'Payments API',
    });
  });

  it('throws NotFoundException when the service reports it', async () => {
    service.updateService.mockResolvedValue(
      err(new NotFoundException('Service not found.')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        dto: { name: 'X' },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the service reports a slug collision', async () => {
    service.updateService.mockResolvedValue(
      err(new ConflictException('slug taken')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        dto: { slug: 'taken' },
      }),
    ).rejects.toThrow(ConflictException);
  });
});
