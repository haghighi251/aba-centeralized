import { ServiceRepository } from './service.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { Service, ServiceStatus, ServiceType, Prisma } from '@aba/database';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

function prismaKnownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '6.0.0',
  } as any);
}

describe('ServiceRepository', () => {
  let repository: ServiceRepository;
  let prisma: {
    service: Record<string, jest.Mock>;
  };

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

  beforeEach(() => {
    prisma = {
      service: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new ServiceRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a service', async () => {
      prisma.service.create.mockResolvedValue(mockService);

      const data: Prisma.ServiceCreateInput = {
        name: 'API Gateway',
        slug: 'api-gateway',
        type: ServiceType.API_GATEWAY,
        baseUrl: 'https://api.example.com',
        company: { connect: { id: 1 } },
        environment: { connect: { id: 1 } },
      };

      const result = await repository.create(data);

      expect(result).toBe(mockService);
      expect(prisma.service.create).toHaveBeenCalledWith({ data });
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.service.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        repository.create({} as Prisma.ServiceCreateInput),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns the service when found', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);

      const result = await repository.findById(1);

      expect(result).toBe(mockService);
      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('returns null when not found', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('normalizes a string id', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);

      await repository.findById('1');

      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findAll', () => {
    it('returns data and total count', async () => {
      prisma.service.findMany.mockResolvedValue([mockService]);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAll({ companyId: 1 });

      expect(result).toEqual({ data: [mockService], total: 1 });
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { companyId: 1 },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('updates a service', async () => {
      const updated = { ...mockService, name: 'Payments API' };
      prisma.service.update.mockResolvedValue(updated);

      const result = await repository.update(1, { name: 'Payments API' });

      expect(result).toBe(updated);
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Payments API' },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.service.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.update(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.service.update.mockRejectedValue(prismaKnownError('P2002'));

      await expect(repository.update(1, { slug: 'taken' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('maps other Prisma errors to InternalServerErrorException', async () => {
      prisma.service.update.mockRejectedValue(prismaKnownError('P9999'));

      await expect(repository.update(1, {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('deletes a service', async () => {
      prisma.service.delete.mockResolvedValue(mockService);

      const result = await repository.delete(1);

      expect(result).toBe(mockService);
      expect(prisma.service.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.service.delete.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('returns true when the service exists', async () => {
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.exists(1);

      expect(result).toBe(true);
    });

    it('returns false when the service does not exist', async () => {
      prisma.service.count.mockResolvedValue(0);

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findByEnvironmentAndSlug', () => {
    it('looks up a service by the environmentId/slug compound key', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);

      const result = await repository.findByEnvironmentAndSlug(
        1,
        'api-gateway',
      );

      expect(result).toBe(mockService);
      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: {
          environmentId_slug: { environmentId: 1, slug: 'api-gateway' },
        },
      });
    });
  });

  describe('findAllForEnvironment', () => {
    it('builds a where clause scoped to the company and environment with default sorting', async () => {
      prisma.service.findMany.mockResolvedValue([mockService]);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAllForEnvironment({
        companyId: 1,
        environmentId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ data: [mockService], total: 1 });
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { companyId: 1, environmentId: 1 },
        orderBy: { name: 'asc' },
      });
    });

    it('applies search, type and status filters', async () => {
      prisma.service.findMany.mockResolvedValue([]);
      prisma.service.count.mockResolvedValue(0);

      await repository.findAllForEnvironment({
        companyId: 1,
        environmentId: 1,
        search: 'gateway',
        type: ServiceType.API_GATEWAY,
        status: ServiceStatus.ACTIVE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 1,
          environmentId: 1,
          type: ServiceType.API_GATEWAY,
          status: ServiceStatus.ACTIVE,
          OR: [
            { name: { contains: 'gateway', mode: 'insensitive' } },
            { slug: { contains: 'gateway', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('countForEnvironment', () => {
    it('returns the number of services for the environment', async () => {
      prisma.service.count.mockResolvedValue(3);

      const result = await repository.countForEnvironment(1);

      expect(result).toBe(3);
      expect(prisma.service.count).toHaveBeenCalledWith({
        where: { environmentId: 1 },
      });
    });
  });
});
