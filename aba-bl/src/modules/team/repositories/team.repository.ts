import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import { Team, Prisma } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { TTeamFilter } from '@/modules/team/dtos/teamFilter';

@Injectable()
export class TeamRepository extends BaseRepository<
  Team,
  Prisma.TeamCreateInput,
  Prisma.TeamUpdateInput,
  Prisma.TeamWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.TeamCreateInput): Promise<Team> {
    try {
      return await this.prisma.team.create({ data });
    } catch (error) {
      this.handleError(error, 'Team');
    }
  }

  async findById(id: string | number): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.TeamWhereInput,
  ): Promise<{ data: Team[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where: filter,
        orderBy: { name: 'asc' },
      }),
      this.prisma.team.count({ where: filter }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.TeamUpdateInput,
  ): Promise<Team> {
    try {
      return await this.prisma.team.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'Team');
    }
  }

  async delete(id: string | number): Promise<Team> {
    try {
      return await this.prisma.team.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'Team');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.team.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findByCompanyAndSlug(
    companyId: number,
    slug: string,
  ): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });
  }

  async findByCompanyAndName(
    companyId: number,
    name: string,
  ): Promise<Team | null> {
    return this.prisma.team.findFirst({
      where: { companyId, name },
    });
  }

  async findAllForCompany(
    filter: TTeamFilter,
  ): Promise<{ data: Team[]; total: number }> {
    const { companyId, search, status, sortBy, sortOrder } = filter;

    const where: Prisma.TeamWhereInput = {
      companyId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.team.count({ where }),
    ]);

    return { data, total };
  }

  async countForCompany(companyId: number): Promise<number> {
    return this.prisma.team.count({ where: { companyId } });
  }
}
