import { PackageRepository } from './package.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DependencyEcosystem, Prisma } from '@aba/database';

function prismaKnownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '6.0.0',
  } as any);
}

describe('PackageRepository', () => {
  let repository: PackageRepository;
  let prisma: { package: Record<string, jest.Mock> };

  const mockPackage = {
    id: 1,
    ecosystem: DependencyEcosystem.NPM,
    name: 'express',
    version: '4.18.2',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      package: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
    };

    repository = new PackageRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a package', async () => {
      prisma.package.create.mockResolvedValue(mockPackage);

      const result = await repository.create({
        ecosystem: DependencyEcosystem.NPM,
        name: 'express',
        version: '4.18.2',
      });

      expect(result).toBe(mockPackage);
      expect(prisma.package.create).toHaveBeenCalledWith({
        data: {
          ecosystem: DependencyEcosystem.NPM,
          name: 'express',
          version: '4.18.2',
        },
      });
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.package.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        repository.create({
          ecosystem: DependencyEcosystem.NPM,
          name: 'express',
          version: '4.18.2',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns the package when found', async () => {
      prisma.package.findUnique.mockResolvedValue(mockPackage);

      const result = await repository.findById(1);

      expect(result).toBe(mockPackage);
      expect(prisma.package.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('returns null when not found', async () => {
      prisma.package.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('normalizes a string id', async () => {
      prisma.package.findUnique.mockResolvedValue(mockPackage);

      await repository.findById('1');

      expect(prisma.package.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findAll', () => {
    it('returns data and total count', async () => {
      prisma.package.findMany.mockResolvedValue([mockPackage]);
      prisma.package.count.mockResolvedValue(1);

      const result = await repository.findAll({
        ecosystem: DependencyEcosystem.NPM,
      });

      expect(result).toEqual({ data: [mockPackage], total: 1 });
    });
  });

  describe('update', () => {
    it('updates a package', async () => {
      const updated = { ...mockPackage, version: '4.19.0' };
      prisma.package.update.mockResolvedValue(updated);

      const result = await repository.update(1, { version: '4.19.0' });

      expect(result).toBe(updated);
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { version: '4.19.0' },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.package.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.update(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps other Prisma errors to InternalServerErrorException', async () => {
      prisma.package.update.mockRejectedValue(prismaKnownError('P9999'));

      await expect(repository.update(1, {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('deletes a package', async () => {
      prisma.package.delete.mockResolvedValue(mockPackage);

      const result = await repository.delete(1);

      expect(result).toBe(mockPackage);
      expect(prisma.package.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.package.delete.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('returns true when the package exists', async () => {
      prisma.package.count.mockResolvedValue(1);

      expect(await repository.exists(1)).toBe(true);
    });

    it('returns false when the package does not exist', async () => {
      prisma.package.count.mockResolvedValue(0);

      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findOrCreate', () => {
    it('upserts by ecosystem+name+version composite key', async () => {
      prisma.package.upsert.mockResolvedValue(mockPackage);

      const result = await repository.findOrCreate(
        DependencyEcosystem.NPM,
        'express',
        '4.18.2',
      );

      expect(result).toBe(mockPackage);
      expect(prisma.package.upsert).toHaveBeenCalledWith({
        where: {
          ecosystem_name_version: {
            ecosystem: DependencyEcosystem.NPM,
            name: 'express',
            version: '4.18.2',
          },
        },
        create: {
          ecosystem: DependencyEcosystem.NPM,
          name: 'express',
          version: '4.18.2',
        },
        update: {},
      });
    });
  });
});
