import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Service, ServiceStatus, ServiceType } from '@aba/database';
import { ServiceController } from './service.controller';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CreateServiceUseCase } from '@/modules/service/usecases/createService.usecase';
import { GetServicesUseCase } from '@/modules/service/usecases/getServices.usecase';
import { GetServiceByIdUseCase } from '@/modules/service/usecases/getServiceById.usecase';
import { UpdateServiceUseCase } from '@/modules/service/usecases/updateService.usecase';
import { DeleteServiceUseCase } from '@/modules/service/usecases/deleteService.usecase';

describe('ServiceController', () => {
  let controller: ServiceController;
  let createServiceUseCase: jest.Mocked<CreateServiceUseCase>;
  let getServicesUseCase: jest.Mocked<GetServicesUseCase>;
  let getServiceByIdUseCase: jest.Mocked<GetServiceByIdUseCase>;
  let updateServiceUseCase: jest.Mocked<UpdateServiceUseCase>;
  let deleteServiceUseCase: jest.Mocked<DeleteServiceUseCase>;

  const mockService: Service = {
    id: 1,
    name: 'API Gateway',
    slug: 'api-gateway',
    type: ServiceType.API_GATEWAY,
    description: null,
    baseUrl: 'https://api.example.com',
    rateLimitConfig: { windowMs: 60000, max: 100 },
    status: ServiceStatus.ACTIVE,
    companyId: 1,
    environmentId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as unknown as Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceController],
      providers: [
        { provide: CreateServiceUseCase, useValue: { execute: jest.fn() } },
        { provide: GetServicesUseCase, useValue: { execute: jest.fn() } },
        { provide: GetServiceByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateServiceUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteServiceUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(ServiceController);
    createServiceUseCase = module.get(CreateServiceUseCase);
    getServicesUseCase = module.get(GetServicesUseCase);
    getServiceByIdUseCase = module.get(GetServiceByIdUseCase);
    updateServiceUseCase = module.get(UpdateServiceUseCase);
    deleteServiceUseCase = module.get(DeleteServiceUseCase);
  });

  describe('getServices', () => {
    it('returns the list of services for the environment', async () => {
      getServicesUseCase.execute.mockResolvedValue({
        data: [mockService],
        total: 1,
      });

      const result = await controller.getServices(1, 1, {
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: { data: [mockService], total: 1 },
      });
      expect(getServicesUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getServicesUseCase.execute.mockRejectedValue(
        new NotFoundException('Environment not found.'),
      );

      await expect(
        controller.getServices(1, 999, { sortBy: 'name', sortOrder: 'asc' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getService', () => {
    it('returns the service when found', async () => {
      getServiceByIdUseCase.execute.mockResolvedValue(mockService);

      const result = await controller.getService(1, 1, 1);

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockService,
      });
      expect(getServiceByIdUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getServiceByIdUseCase.execute.mockRejectedValue(
        new NotFoundException('Service not found.'),
      );

      await expect(controller.getService(1, 1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createService', () => {
    it('creates and returns the new service', async () => {
      createServiceUseCase.execute.mockResolvedValue(mockService);

      const result = await controller.createService(1, 1, {
        name: 'API Gateway',
        type: ServiceType.API_GATEWAY,
        baseUrl: 'https://api.example.com',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockService,
      });
      expect(createServiceUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        dto: {
          name: 'API Gateway',
          type: ServiceType.API_GATEWAY,
          baseUrl: 'https://api.example.com',
        },
      });
    });

    it('propagates a ConflictException from the use case', async () => {
      createServiceUseCase.execute.mockRejectedValue(
        new ConflictException('slug taken'),
      );

      await expect(
        controller.createService(1, 1, {
          name: 'API Gateway',
          type: ServiceType.API_GATEWAY,
          baseUrl: 'https://api.example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('propagates a NotFoundException from the use case', async () => {
      createServiceUseCase.execute.mockRejectedValue(
        new NotFoundException('Environment not found.'),
      );

      await expect(
        controller.createService(1, 999, {
          name: 'API Gateway',
          type: ServiceType.API_GATEWAY,
          baseUrl: 'https://api.example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateService', () => {
    it('updates and returns the service', async () => {
      const updated = { ...mockService, name: 'Payments API' };
      updateServiceUseCase.execute.mockResolvedValue(updated);

      const result = await controller.updateService(1, 1, 1, {
        name: 'Payments API',
      });

      expect(result).toEqual({ success: true, error: null, data: updated });
      expect(updateServiceUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        dto: { name: 'Payments API' },
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      updateServiceUseCase.execute.mockRejectedValue(
        new NotFoundException('Service not found.'),
      );

      await expect(
        controller.updateService(1, 1, 999, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates a ConflictException from the use case', async () => {
      updateServiceUseCase.execute.mockRejectedValue(
        new ConflictException('slug taken'),
      );

      await expect(
        controller.updateService(1, 1, 1, { slug: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteService', () => {
    it('deletes and returns the service', async () => {
      deleteServiceUseCase.execute.mockResolvedValue(mockService);

      const result = await controller.deleteService(1, 1, 1);

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockService,
      });
      expect(deleteServiceUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      deleteServiceUseCase.execute.mockRejectedValue(
        new NotFoundException('Service not found.'),
      );

      await expect(controller.deleteService(1, 1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
