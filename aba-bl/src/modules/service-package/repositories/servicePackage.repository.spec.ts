import { ServicePackageRepository } from './servicePackage.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  DependencyEcosystem,
  Prisma,
  ServicePackageStatus,
} from '@aba/database';

function prismaKnownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '6.0.0',
  } as any);
}

describe('ServicePackageRepository', () => {
  let repository: ServicePackageRepository;
  let prisma: { servicePackage: Record<string, jest.Mock> };

  const mockPkg = {
    id: 1,
    ecosystem: DependencyEcosystem.NPM,
    name: 'express',
    version: '4.18.2',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockServicePackage = {
    id: 10,
    status: ServicePackageStatus.ACTIVE,
    versionRange: '^4.18.0',
    introducedAt: new Date('2024-01-01T00:00:00.000Z'),
    deactivatedAt: null,
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 1,
    package: mockPkg,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      servicePackage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new ServicePackageRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('create', () => {
    it('creates a service package with package included', async () => {
      prisma.servicePackage.create.mockResolvedValue(mockServicePackage);

      const result = await repository.create({
        versionRange: '^4.18.0',
        service: { connect: { id: 1 } },
        package: { connect: { id: 1 } },
      });

      expect(result).toBe(mockServicePackage);
      expect(prisma.servicePackage.create).toHaveBeenCalledWith(
        expect.objectContaining({ include: { package: true } }),
      );
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.servicePackage.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        repository.create({
          service: { connect: { id: 1 } },
          package: { connect: { id: 1 } },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns the service package with package when found', async () => {
      prisma.servicePackage.findUnique.mockResolvedValue(mockServicePackage);

      const result = await repository.findById(10);

      expect(result).toBe(mockServicePackage);
      expect(prisma.servicePackage.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        include: { package: true },
      });
    });

    it('returns null when not found', async () => {
      prisma.servicePackage.findUnique.mockResolvedValue(null);

      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a service package and includes package', async () => {
      const updated = { ...mockServicePackage, versionRange: '^4.19.0' };
      prisma.servicePackage.update.mockResolvedValue(updated);

      const result = await repository.update(10, { versionRange: '^4.19.0' });

      expect(result).toBe(updated);
      expect(prisma.servicePackage.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { versionRange: '^4.19.0' },
        include: { package: true },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.servicePackage.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.update(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps other Prisma errors to InternalServerErrorException', async () => {
      prisma.servicePackage.update.mockRejectedValue(prismaKnownError('P9999'));

      await expect(repository.update(1, {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('deletes a service package', async () => {
      prisma.servicePackage.delete.mockResolvedValue(mockServicePackage);

      const result = await repository.delete(10);

      expect(result).toBe(mockServicePackage);
      expect(prisma.servicePackage.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.servicePackage.delete.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('returns true when the row exists', async () => {
      prisma.servicePackage.count.mockResolvedValue(1);

      expect(await repository.exists(10)).toBe(true);
    });

    it('returns false when the row does not exist', async () => {
      prisma.servicePackage.count.mockResolvedValue(0);

      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findActive', () => {
    it('queries for ACTIVE rows scoped to the service with defaults', async () => {
      prisma.servicePackage.findMany.mockResolvedValue([mockServicePackage]);
      prisma.servicePackage.count.mockResolvedValue(1);

      const result = await repository.findActive({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ data: [mockServicePackage], total: 1 });
      expect(prisma.servicePackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceId: 1,
            status: ServicePackageStatus.ACTIVE,
          }),
        }),
      );
    });

    it('applies ecosystem and search filters as package sub-filters', async () => {
      prisma.servicePackage.findMany.mockResolvedValue([]);
      prisma.servicePackage.count.mockResolvedValue(0);

      await repository.findActive({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        ecosystem: DependencyEcosystem.NPM,
        search: 'express',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(prisma.servicePackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            package: expect.objectContaining({
              ecosystem: DependencyEcosystem.NPM,
            }),
          }),
        }),
      );
    });

    it('sorts by introducedAt when requested', async () => {
      prisma.servicePackage.findMany.mockResolvedValue([]);
      prisma.servicePackage.count.mockResolvedValue(0);

      await repository.findActive({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        sortBy: 'introducedAt',
        sortOrder: 'desc',
      });

      expect(prisma.servicePackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { introducedAt: 'desc' } }),
      );
    });
  });

  describe('findHistory', () => {
    it('queries for STALE and REMOVED rows when status is ALL', async () => {
      prisma.servicePackage.findMany.mockResolvedValue([]);
      prisma.servicePackage.count.mockResolvedValue(0);

      await repository.findHistory({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        status: 'ALL',
        sortBy: 'deactivatedAt',
        sortOrder: 'desc',
      });

      expect(prisma.servicePackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [ServicePackageStatus.STALE, ServicePackageStatus.REMOVED],
            },
          }),
        }),
      );
    });

    it('filters to only STALE rows when status is STALE', async () => {
      prisma.servicePackage.findMany.mockResolvedValue([]);
      prisma.servicePackage.count.mockResolvedValue(0);

      await repository.findHistory({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        status: 'STALE',
        sortBy: 'deactivatedAt',
        sortOrder: 'desc',
      });

      expect(prisma.servicePackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'STALE' }),
        }),
      );
    });
  });

  describe('findActiveByServiceAndPackageName', () => {
    it('finds the active row for a given service + package name + ecosystem', async () => {
      prisma.servicePackage.findFirst.mockResolvedValue(mockServicePackage);

      const result = await repository.findActiveByServiceAndPackageName(
        1,
        'express',
        'NPM',
      );

      expect(result).toBe(mockServicePackage);
      expect(prisma.servicePackage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceId: 1,
            status: ServicePackageStatus.ACTIVE,
          }),
        }),
      );
    });

    it('returns null when no active row exists', async () => {
      prisma.servicePackage.findFirst.mockResolvedValue(null);

      expect(
        await repository.findActiveByServiceAndPackageName(1, 'lodash', 'NPM'),
      ).toBeNull();
    });
  });

  describe('markAsStale', () => {
    it('sets status to STALE and deactivatedAt to now', async () => {
      const staled = {
        ...mockServicePackage,
        status: ServicePackageStatus.STALE,
      };
      prisma.servicePackage.update.mockResolvedValue(staled);

      const result = await repository.markAsStale(10);

      expect(result.status).toBe(ServicePackageStatus.STALE);
      expect(prisma.servicePackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({ status: ServicePackageStatus.STALE }),
        }),
      );
    });
  });

  describe('markAsRemoved', () => {
    it('sets status to REMOVED and deactivatedAt to now', async () => {
      const removed = {
        ...mockServicePackage,
        status: ServicePackageStatus.REMOVED,
      };
      prisma.servicePackage.update.mockResolvedValue(removed);

      const result = await repository.markAsRemoved(10);

      expect(result.status).toBe(ServicePackageStatus.REMOVED);
      expect(prisma.servicePackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({
            status: ServicePackageStatus.REMOVED,
          }),
        }),
      );
    });
  });
});
