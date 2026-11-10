import { EnvironmentRepository } from './environment.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import {
  Environment,
  EnvironmentStatus,
  EnvironmentType,
  Prisma,
} from '@aba/database';
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

describe('EnvironmentRepository', () => {
  let repository: EnvironmentRepository;
  let prisma: {
    environment: Record<string, jest.Mock>;
  };

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

  beforeEach(() => {
    prisma = {
      environment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    repository = new EnvironmentRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates an environment', async () => {
      prisma.environment.create.mockResolvedValue(mockEnvironment);

      const data: Prisma.EnvironmentCreateInput = {
        name: 'Production',
        slug: 'production',
        type: EnvironmentType.PRODUCTION,
        isProduction: true,
        order: 4,
        company: { connect: { id: 1 } },
        team: { connect: { id: 1 } },
      };

      const result = await repository.create(data);

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.create).toHaveBeenCalledWith({ data });
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.environment.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        repository.create({} as Prisma.EnvironmentCreateInput),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns the environment when found', async () => {
      prisma.environment.findUnique.mockResolvedValue(mockEnvironment);

      const result = await repository.findById(1);

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('returns null when not found', async () => {
      prisma.environment.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('normalizes a string id', async () => {
      prisma.environment.findUnique.mockResolvedValue(mockEnvironment);

      await repository.findById('1');

      expect(prisma.environment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findAll', () => {
    it('returns data and total count', async () => {
      prisma.environment.findMany.mockResolvedValue([mockEnvironment]);
      prisma.environment.count.mockResolvedValue(1);

      const result = await repository.findAll({ companyId: 1 });

      expect(result).toEqual({ data: [mockEnvironment], total: 1 });
      expect(prisma.environment.findMany).toHaveBeenCalledWith({
        where: { companyId: 1 },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('updates an environment', async () => {
      const updated = { ...mockEnvironment, name: 'Prod EU' };
      prisma.environment.update.mockResolvedValue(updated);

      const result = await repository.update(1, { name: 'Prod EU' });

      expect(result).toBe(updated);
      expect(prisma.environment.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Prod EU' },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.environment.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.update(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.environment.update.mockRejectedValue(prismaKnownError('P2002'));

      await expect(repository.update(1, { slug: 'taken' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('maps other Prisma errors to InternalServerErrorException', async () => {
      prisma.environment.update.mockRejectedValue(prismaKnownError('P9999'));

      await expect(repository.update(1, {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('deletes an environment', async () => {
      prisma.environment.delete.mockResolvedValue(mockEnvironment);

      const result = await repository.delete(1);

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.environment.delete.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('returns true when the environment exists', async () => {
      prisma.environment.count.mockResolvedValue(1);

      const result = await repository.exists(1);

      expect(result).toBe(true);
    });

    it('returns false when the environment does not exist', async () => {
      prisma.environment.count.mockResolvedValue(0);

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findByTeamAndSlug', () => {
    it('looks up an environment by the teamId/slug compound key', async () => {
      prisma.environment.findUnique.mockResolvedValue(mockEnvironment);

      const result = await repository.findByTeamAndSlug(1, 'production');

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.findUnique).toHaveBeenCalledWith({
        where: { teamId_slug: { teamId: 1, slug: 'production' } },
      });
    });
  });

  describe('findByTeamAndName', () => {
    it('looks up an environment by teamId and name', async () => {
      prisma.environment.findFirst.mockResolvedValue(mockEnvironment);

      const result = await repository.findByTeamAndName(1, 'Production');

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { teamId: 1, name: 'Production' },
      });
    });
  });

  describe('findByTeamAndOrder', () => {
    it('looks up an environment by teamId and order', async () => {
      prisma.environment.findFirst.mockResolvedValue(mockEnvironment);

      const result = await repository.findByTeamAndOrder(1, 4);

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { teamId: 1, order: 4 },
      });
    });
  });

  describe('findMaxOrder', () => {
    it('returns the max order for the team', async () => {
      prisma.environment.aggregate.mockResolvedValue({ _max: { order: 3 } });

      const result = await repository.findMaxOrder(1);

      expect(result).toBe(3);
      expect(prisma.environment.aggregate).toHaveBeenCalledWith({
        where: { teamId: 1 },
        _max: { order: true },
      });
    });

    it('returns 0 when the team has no environments', async () => {
      prisma.environment.aggregate.mockResolvedValue({ _max: { order: null } });

      const result = await repository.findMaxOrder(1);

      expect(result).toBe(0);
    });
  });

  describe('findAllForCompany', () => {
    it('builds a where clause scoped to the company with default sorting', async () => {
      prisma.environment.findMany.mockResolvedValue([mockEnvironment]);
      prisma.environment.count.mockResolvedValue(1);

      const result = await repository.findAllForCompany({
        companyId: 1,
        sortBy: 'order',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ data: [mockEnvironment], total: 1 });
      expect(prisma.environment.findMany).toHaveBeenCalledWith({
        where: { companyId: 1 },
        orderBy: { order: 'asc' },
      });
    });

    it('applies search, type and status filters', async () => {
      prisma.environment.findMany.mockResolvedValue([]);
      prisma.environment.count.mockResolvedValue(0);

      await repository.findAllForCompany({
        companyId: 1,
        search: 'prod',
        type: EnvironmentType.PRODUCTION,
        status: EnvironmentStatus.ACTIVE,
        sortBy: 'name',
        sortOrder: 'desc',
      });

      expect(prisma.environment.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 1,
          type: EnvironmentType.PRODUCTION,
          status: EnvironmentStatus.ACTIVE,
          OR: [
            { name: { contains: 'prod', mode: 'insensitive' } },
            { slug: { contains: 'prod', mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'desc' },
      });
    });

    it('narrows the where clause to a single team when teamId is provided', async () => {
      prisma.environment.findMany.mockResolvedValue([mockEnvironment]);
      prisma.environment.count.mockResolvedValue(1);

      await repository.findAllForCompany({
        companyId: 1,
        teamId: 2,
        sortBy: 'order',
        sortOrder: 'asc',
      });

      expect(prisma.environment.findMany).toHaveBeenCalledWith({
        where: { companyId: 1, teamId: 2 },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('countForCompany', () => {
    it('returns the number of environments for the company', async () => {
      prisma.environment.count.mockResolvedValue(7);

      const result = await repository.countForCompany(1);

      expect(result).toBe(7);
      expect(prisma.environment.count).toHaveBeenCalledWith({
        where: { companyId: 1 },
      });
    });
  });

  describe('findProductionForTeam', () => {
    it('returns the production environment for the team', async () => {
      prisma.environment.findFirst.mockResolvedValue(mockEnvironment);

      const result = await repository.findProductionForTeam(1);

      expect(result).toBe(mockEnvironment);
      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { teamId: 1, isProduction: true },
      });
    });

    it('excludes the given environment id when checking', async () => {
      prisma.environment.findFirst.mockResolvedValue(null);

      await repository.findProductionForTeam(1, 5);

      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { teamId: 1, isProduction: true, id: { not: 5 } },
      });
    });

    it('returns null when the team has no production environment', async () => {
      prisma.environment.findFirst.mockResolvedValue(null);

      const result = await repository.findProductionForTeam(1);

      expect(result).toBeNull();
    });
  });
});
