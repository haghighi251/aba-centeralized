import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  Environment,
  EnvironmentStatus,
  EnvironmentType,
  Service,
  ServiceStatus,
  ServiceType,
  Prisma,
} from '@aba/database';
import { ServiceService } from './service.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateServiceDtoSchema } from '@/modules/service/dtos/CreateServiceDto';

describe('ServiceService', () => {
  let service: ServiceService;
  let repository: jest.Mocked<ServiceRepository>;
  let environmentRepository: jest.Mocked<EnvironmentRepository>;

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
    teamId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Environment;

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
      providers: [
        ServiceService,
        {
          provide: ServiceRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByEnvironmentAndSlug: jest.fn(),
            findAllForEnvironment: jest.fn(),
          },
        },
        {
          provide: EnvironmentRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: CompanyRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ServiceService);
    repository = module.get(ServiceRepository);
    environmentRepository = module.get(EnvironmentRepository);
  });

  describe('createService', () => {
    const dto: CreateServiceDtoSchema = {
      name: 'API Gateway',
      type: ServiceType.API_GATEWAY,
      baseUrl: 'https://api.example.com',
    };

    it('derives the slug from the name when not provided', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findByEnvironmentAndSlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockService);

      const result = await service.createService(1, 1, dto);

      expect(result.isOk()).toBe(true);
      expect(repository.findByEnvironmentAndSlug).toHaveBeenCalledWith(
        1,
        'api-gateway',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'api-gateway' }),
      );
    });

    it('uses the provided slug when given', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findByEnvironmentAndSlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockService);

      await service.createService(1, 1, { ...dto, slug: 'gateway' });

      expect(repository.findByEnvironmentAndSlug).toHaveBeenCalledWith(
        1,
        'gateway',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'gateway' }),
      );
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.createService(1, 999, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the environment belongs to another company', async () => {
      environmentRepository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 2,
      });

      const result = await service.createService(1, 1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns ConflictException when the slug already exists for the environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findByEnvironmentAndSlug.mockResolvedValue(mockService);

      const result = await service.createService(1, 1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('connects the service to the given company and environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findByEnvironmentAndSlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockService);

      await service.createService(1, 1, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company: { connect: { id: 1 } },
          environment: { connect: { id: 1 } },
        }),
      );
    });

    it('stores Prisma.JsonNull when rateLimitConfig is not provided', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findByEnvironmentAndSlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockService);

      await service.createService(1, 1, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ rateLimitConfig: Prisma.JsonNull }),
      );
    });

    it('stores the provided rateLimitConfig', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findByEnvironmentAndSlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockService);

      const rateLimitConfig = { windowMs: 30000, max: 50 };
      await service.createService(1, 1, { ...dto, rateLimitConfig });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ rateLimitConfig }),
      );
    });
  });

  describe('getServices', () => {
    it('delegates to the repository', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findAllForEnvironment.mockResolvedValue({
        data: [mockService],
        total: 1,
      });

      const result = await service.getServices({
        companyId: 1,
        environmentId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ data: [mockService], total: 1 });
      }
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.getServices({
        companyId: 1,
        environmentId: 999,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.findAllForEnvironment).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the environment belongs to another company', async () => {
      environmentRepository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 2,
      });

      const result = await service.getServices({
        companyId: 1,
        environmentId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('getServiceById', () => {
    it('returns the service when it belongs to the environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);

      const result = await service.getServiceById(1, 1, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockService);
      }
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.getServiceById(1, 999, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });

    it('returns NotFoundException when the service does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(null);

      const result = await service.getServiceById(1, 1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });

    it('returns NotFoundException when the service belongs to another environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue({
        ...mockService,
        environmentId: 2,
      });

      const result = await service.getServiceById(1, 1, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('updateService', () => {
    it('updates the service when it belongs to the environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);
      repository.update.mockResolvedValue({
        ...mockService,
        name: 'Payments API',
      });

      const result = await service.updateService(1, 1, 1, {
        name: 'Payments API',
      });

      expect(result.isOk()).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(1, {
        name: 'Payments API',
      });
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.updateService(1, 999, 1, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the service does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(null);

      const result = await service.updateService(1, 1, 999, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the service belongs to another environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue({
        ...mockService,
        environmentId: 2,
      });

      const result = await service.updateService(1, 1, 1, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns ConflictException when changing to a slug already in use within the environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);
      repository.findByEnvironmentAndSlug.mockResolvedValue({
        ...mockService,
        id: 2,
        slug: 'payments-api',
      });

      const result = await service.updateService(1, 1, 1, {
        slug: 'payments-api',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.findByEnvironmentAndSlug).toHaveBeenCalledWith(
        1,
        'payments-api',
      );
    });

    it('allows updating to the same slug the service already has', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);
      repository.update.mockResolvedValue(mockService);

      const result = await service.updateService(1, 1, 1, {
        slug: mockService.slug,
      });

      expect(result.isOk()).toBe(true);
      expect(repository.findByEnvironmentAndSlug).not.toHaveBeenCalled();
    });

    it('stores Prisma.JsonNull when rateLimitConfig is cleared with null', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);
      repository.update.mockResolvedValue(mockService);

      await service.updateService(1, 1, 1, { rateLimitConfig: null });

      expect(repository.update).toHaveBeenCalledWith(1, {
        rateLimitConfig: Prisma.JsonNull,
      });
    });

    it('omits rateLimitConfig from the update when not provided', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);
      repository.update.mockResolvedValue(mockService);

      await service.updateService(1, 1, 1, { name: 'Payments API' });

      expect(repository.update).toHaveBeenCalledWith(1, {
        name: 'Payments API',
      });
    });
  });

  describe('deleteService', () => {
    it('deletes the service when it belongs to the environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(mockService);
      repository.delete.mockResolvedValue(mockService);

      const result = await service.deleteService(1, 1, 1);

      expect(result.isOk()).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(null);

      const result = await service.deleteService(1, 999, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the service does not exist', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue(null);

      const result = await service.deleteService(1, 1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the service belongs to another environment', async () => {
      environmentRepository.findById.mockResolvedValue(mockEnvironment);
      repository.findById.mockResolvedValue({
        ...mockService,
        environmentId: 2,
      });

      const result = await service.deleteService(1, 1, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
