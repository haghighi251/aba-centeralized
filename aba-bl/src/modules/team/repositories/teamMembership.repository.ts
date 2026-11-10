import { Injectable } from '@nestjs/common';
import { Prisma, TeamMembership, UserRole } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

export type TeamMembershipWithUser = TeamMembership & {
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: UserRole;
  };
};

@Injectable()
export class TeamMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndTeam(
    userId: number,
    teamId: number,
  ): Promise<TeamMembership | null> {
    return this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
  }

  async create(
    data: Prisma.TeamMembershipCreateInput,
  ): Promise<TeamMembership> {
    return this.prisma.teamMembership.create({ data });
  }

  async findAllForTeam(teamId: number): Promise<TeamMembershipWithUser[]> {
    return this.prisma.teamMembership.findMany({
      where: { teamId },
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
  }

  async findAllForUser(
    userId: number,
  ): Promise<(TeamMembership & { team: { id: number; name: string } })[]> {
    return this.prisma.teamMembership.findMany({
      where: { userId },
      include: { team: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeManyForUser(userId: number, teamIds: number[]): Promise<void> {
    await this.prisma.teamMembership.deleteMany({
      where: { userId, teamId: { in: teamIds } },
    });
  }

  async delete(id: number): Promise<TeamMembership> {
    return this.prisma.teamMembership.delete({ where: { id } });
  }
}
