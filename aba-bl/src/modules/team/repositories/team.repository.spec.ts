import { TeamRepository } from './team.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { Team, TeamStatus, Prisma } from '@aba/database';
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

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let prisma: {
    team: Record<string, jest.Mock>;
  };

  const mockTeam: Team = {
    id: 1,
    name: 'Platform',
    slug: 'platform',
    description: null,
    status: TeamStatus.ACTIVE,
    companyId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Team;

  beforeEach(() => {
    prisma = {
      team: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new TeamRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a team', async () => {
      prisma.team.create.mockResolvedValue(mockTeam);

      const data: Prisma.TeamCreateInput = {
        name: 'Platform',
        slug: 'platform',
        company: { connect: { id: 1 } },
      };

      const result = await repository.create(data);

      expect(result).toBe(mockTeam);
      expect(prisma.team.create).toHaveBeenCalledWith({ data });
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.team.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        repository.create({} as Prisma.TeamCreateInput),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns the team when found', async () => {
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      const result = await repository.findById(1);

      expect(result).toBe(mockTeam);
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('returns null when not found', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('normalizes a string id', async () => {
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      await repository.findById('1');

      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findAll', () => {
    it('returns data and total count', async () => {
      prisma.team.findMany.mockResolvedValue([mockTeam]);
      prisma.team.count.mockResolvedValue(1);

      const result = await repository.findAll({ companyId: 1 });

      expect(result).toEqual({ data: [mockTeam], total: 1 });
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { companyId: 1 },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('updates a team', async () => {
      const updated = { ...mockTeam, name: 'Platform EU' };
      prisma.team.update.mockResolvedValue(updated);

      const result = await repository.update(1, { name: 'Platform EU' });

      expect(result).toBe(updated);
      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Platform EU' },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.team.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.update(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.team.update.mockRejectedValue(prismaKnownError('P2002'));

      await expect(repository.update(1, { slug: 'taken' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('maps other Prisma errors to InternalServerErrorException', async () => {
      prisma.team.update.mockRejectedValue(prismaKnownError('P9999'));

      await expect(repository.update(1, {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('deletes a team', async () => {
      prisma.team.delete.mockResolvedValue(mockTeam);

      const result = await repository.delete(1);

      expect(result).toBe(mockTeam);
      expect(prisma.team.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.team.delete.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('returns true when the team exists', async () => {
      prisma.team.count.mockResolvedValue(1);

      const result = await repository.exists(1);

      expect(result).toBe(true);
    });

    it('returns false when the team does not exist', async () => {
      prisma.team.count.mockResolvedValue(0);

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findByCompanyAndSlug', () => {
    it('looks up a team by the companyId/slug compound key', async () => {
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      const result = await repository.findByCompanyAndSlug(1, 'platform');

      expect(result).toBe(mockTeam);
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { companyId_slug: { companyId: 1, slug: 'platform' } },
      });
    });
  });

  describe('findByCompanyAndName', () => {
    it('looks up a team by companyId and name', async () => {
      prisma.team.findFirst.mockResolvedValue(mockTeam);

      const result = await repository.findByCompanyAndName(1, 'Platform');

      expect(result).toBe(mockTeam);
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { companyId: 1, name: 'Platform' },
      });
    });
  });

  describe('findAllForCompany', () => {
    it('builds a where clause scoped to the company with default sorting', async () => {
      prisma.team.findMany.mockResolvedValue([mockTeam]);
      prisma.team.count.mockResolvedValue(1);

      const result = await repository.findAllForCompany({
        companyId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ data: [mockTeam], total: 1 });
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { companyId: 1 },
        orderBy: { name: 'asc' },
      });
    });

    it('applies search and status filters', async () => {
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.count.mockResolvedValue(0);

      await repository.findAllForCompany({
        companyId: 1,
        search: 'plat',
        status: TeamStatus.ACTIVE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 1,
          status: TeamStatus.ACTIVE,
          OR: [
            { name: { contains: 'plat', mode: 'insensitive' } },
            { slug: { contains: 'plat', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('countForCompany', () => {
    it('returns the number of teams for the company', async () => {
      prisma.team.count.mockResolvedValue(3);

      const result = await repository.countForCompany(1);

      expect(result).toBe(3);
      expect(prisma.team.count).toHaveBeenCalledWith({
        where: { companyId: 1 },
      });
    });
  });
});
