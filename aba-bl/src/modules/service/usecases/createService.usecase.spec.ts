import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Service, ServiceStatus, ServiceType } from '@aba/database';
import { CreateServiceUseCase } from './createService.usecase';
import { ServiceService } from '@/modules/service/services/service.service';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
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
        CreateServiceUseCase,
        {
          provide: ServiceService,
          useValue: { createService: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CreateServiceUseCase);
    service = module.get(ServiceService);
  });

  it('returns the created service on success', async () => {
    service.createService.mockResolvedValue(ok(mockService));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      dto: {
        name: 'API Gateway',
        type: ServiceType.API_GATEWAY,
        baseUrl: 'https://api.example.com',
      },
    });

    expect(result).toBe(mockService);
    expect(service.createService).toHaveBeenCalledWith(1, 1, {
      name: 'API Gateway',
      type: ServiceType.API_GATEWAY,
      baseUrl: 'https://api.example.com',
    });
  });

  it('throws the error returned by the service', async () => {
    const error = new ConflictException('slug taken');
    service.createService.mockResolvedValue(err(error));

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        dto: {
          name: 'API Gateway',
          type: ServiceType.API_GATEWAY,
          baseUrl: 'https://api.example.com',
        },
      }),
    ).rejects.toThrow(ConflictException);
  });
});
