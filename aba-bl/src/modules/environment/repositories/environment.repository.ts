import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import { Environment, Prisma } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { TEnvironmentFilter } from '@/modules/environment/dtos/environmentFilter';

@Injectable()
export class EnvironmentRepository extends BaseRepository<
  Environment,
  Prisma.EnvironmentCreateInput,
  Prisma.EnvironmentUpdateInput,
  Prisma.EnvironmentWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.EnvironmentCreateInput): Promise<Environment> {
    try {
      return await this.prisma.environment.create({ data });
    } catch (error) {
      this.handleError(error, 'Environment');
    }
  }

  async findById(id: string | number): Promise<Environment | null> {
    return this.prisma.environment.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.EnvironmentWhereInput,
  ): Promise<{ data: Environment[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.environment.findMany({
        where: filter,
        orderBy: { order: 'asc' },
      }),
      this.prisma.environment.count({ where: filter }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.EnvironmentUpdateInput,
  ): Promise<Environment> {
    try {
      return await this.prisma.environment.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'Environment');
    }
  }

  async delete(id: string | number): Promise<Environment> {
    try {
      return await this.prisma.environment.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'Environment');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.environment.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findByTeamAndSlug(
    teamId: number,
    slug: string,
  ): Promise<Environment | null> {
    return this.prisma.environment.findUnique({
      where: { teamId_slug: { teamId, slug } },
    });
  }

  async findByTeamAndName(
    teamId: number,
    name: string,
  ): Promise<Environment | null> {
    return this.prisma.environment.findFirst({
      where: { teamId, name },
    });
  }

  async findByTeamAndOrder(
    teamId: number,
    order: number,
  ): Promise<Environment | null> {
    return this.prisma.environment.findFirst({
      where: { teamId, order },
    });
  }

  async findMaxOrder(teamId: number): Promise<number> {
    const result = await this.prisma.environment.aggregate({
      where: { teamId },
      _max: { order: true },
    });
    return result._max.order ?? 0;
  }

  async findAllForCompany(
    filter: TEnvironmentFilter,
  ): Promise<{ data: Environment[]; total: number }> {
    const { companyId, teamId, search, type, status, sortBy, sortOrder } =
      filter;

    const where: Prisma.EnvironmentWhereInput = {
      companyId,
      ...(teamId && { teamId }),
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.environment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.environment.count({ where }),
    ]);

    return { data, total };
  }

  async countForCompany(companyId: number): Promise<number> {
    return this.prisma.environment.count({ where: { companyId } });
  }

  /**
   * The team's current production environment, if any — used to enforce
   * "at most one production environment per team" (excludeId lets an
   * update check ignore the environment being updated itself).
   */
  async findProductionForTeam(
    teamId: number,
    excludeId?: number,
  ): Promise<Environment | null> {
    return this.prisma.environment.findFirst({
      where: {
        teamId,
        isProduction: true,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
    });
  }
}
