import { TeamMembershipRepository } from './teamMembership.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { TeamMembership, UserRole } from '@aba/database';

describe('TeamMembershipRepository', () => {
  let repository: TeamMembershipRepository;
  let prisma: {
    teamMembership: Record<string, jest.Mock>;
  };

  const mockMembership: TeamMembership = {
    id: 1,
    userId: 10,
    teamId: 20,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  } as TeamMembership;

  beforeEach(() => {
    prisma = {
      teamMembership: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    repository = new TeamMembershipRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('findByUserAndTeam', () => {
    it('queries by the composite userId_teamId key', async () => {
      prisma.teamMembership.findUnique.mockResolvedValue(mockMembership);

      const result = await repository.findByUserAndTeam(10, 20);

      expect(result).toBe(mockMembership);
      expect(prisma.teamMembership.findUnique).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 10, teamId: 20 } },
      });
    });

    it('returns null when no membership exists', async () => {
      prisma.teamMembership.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserAndTeam(10, 20);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a membership row', async () => {
      prisma.teamMembership.create.mockResolvedValue(mockMembership);

      const data = {
        user: { connect: { id: 10 } },
        team: { connect: { id: 20 } },
      };
      const result = await repository.create(data as any);

      expect(result).toBe(mockMembership);
      expect(prisma.teamMembership.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findAllForTeam', () => {
    it('lists memberships for a team including basic user fields', async () => {
      const withUser = {
        ...mockMembership,
        user: {
          id: 10,
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          role: UserRole.BUSINESS_ADMIN,
        },
      };
      prisma.teamMembership.findMany.mockResolvedValue([withUser]);

      const result = await repository.findAllForTeam(20);

      expect(result).toEqual([withUser]);
      expect(prisma.teamMembership.findMany).toHaveBeenCalledWith({
        where: { teamId: 20 },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findAllForUser', () => {
    it("lists a user's memberships including basic team fields", async () => {
      const withTeam = {
        ...mockMembership,
        team: { id: 20, name: 'Engineering' },
      };
      prisma.teamMembership.findMany.mockResolvedValue([withTeam]);

      const result = await repository.findAllForUser(10);

      expect(result).toEqual([withTeam]);
      expect(prisma.teamMembership.findMany).toHaveBeenCalledWith({
        where: { userId: 10 },
        include: { team: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('removeManyForUser', () => {
    it('deletes memberships for the given user and teamIds', async () => {
      prisma.teamMembership.deleteMany.mockResolvedValue({ count: 2 });

      await repository.removeManyForUser(10, [20, 21]);

      expect(prisma.teamMembership.deleteMany).toHaveBeenCalledWith({
        where: { userId: 10, teamId: { in: [20, 21] } },
      });
    });
  });

  describe('delete', () => {
    it('deletes a membership by id', async () => {
      prisma.teamMembership.delete.mockResolvedValue(mockMembership);

      const result = await repository.delete(1);

      expect(result).toBe(mockMembership);
      expect(prisma.teamMembership.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
