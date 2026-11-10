import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import {
  CompanyStatus,
  DependencyEcosystem,
  Service,
  ServicePackageStatus,
  ServiceStatus,
  Prisma,
} from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { TServiceFilter } from '@/modules/service/dtos/serviceFilter';

/**
 * A service whose company plan promises automatic rescanning, narrowed down
 * to just the fields PackageRescanScheduler needs to build a package.scan
 * message. Returned by findDueForRescan().
 */
export interface ServiceDueForRescan {
  id: number;
  companyId: number;
  lastScannedAt: Date | null;
  rescanIntervalDays: number;
  activePackages: {
    id: number;
    ecosystem: DependencyEcosystem;
    name: string;
    version: string;
  }[];
}

@Injectable()
export class ServiceRepository extends BaseRepository<
  Service,
  Prisma.ServiceCreateInput,
  Prisma.ServiceUpdateInput,
  Prisma.ServiceWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    try {
      return await this.prisma.service.create({ data });
    } catch (error) {
      this.handleError(error, 'Service');
    }
  }

  async findById(id: string | number): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.ServiceWhereInput,
  ): Promise<{ data: Service[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where: filter,
        orderBy: { name: 'asc' },
      }),
      this.prisma.service.count({ where: filter }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.ServiceUpdateInput,
  ): Promise<Service> {
    try {
      return await this.prisma.service.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'Service');
    }
  }

  async delete(id: string | number): Promise<Service> {
    try {
      return await this.prisma.service.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'Service');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.service.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findByEnvironmentAndSlug(
    environmentId: number,
    slug: string,
  ): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { environmentId_slug: { environmentId, slug } },
    });
  }

  async findAllForEnvironment(
    filter: TServiceFilter,
  ): Promise<{ data: Service[]; total: number }> {
    const {
      companyId,
      environmentId,
      search,
      type,
      status,
      sortBy,
      sortOrder,
    } = filter;

    const where: Prisma.ServiceWhereInput = {
      companyId,
      environmentId,
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
      this.prisma.service.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data, total };
  }

  async countForEnvironment(environmentId: number): Promise<number> {
    return this.prisma.service.count({ where: { environmentId } });
  }

  async countForCompany(companyId: number): Promise<number> {
    return this.prisma.service.count({ where: { companyId } });
  }

  /**
   * Candidates for the plan-driven rescan scheduler: active services whose
   * company is on an active plan with rescanning enabled. The "is it
   * actually due yet" comparison (lastScannedAt vs. that plan's own
   * rescanIntervalDays) can't be expressed as a single Prisma WHERE clause
   * since the interval varies per row, so it's narrowed here at the DB level
   * (only rescan-eligible companies) and the freshness check happens in the
   * caller (PackageRescanScheduler).
   */
  async findServicesEligibleForRescan(): Promise<ServiceDueForRescan[]> {
    const services = await this.prisma.service.findMany({
      where: {
        status: ServiceStatus.ACTIVE,
        company: {
          status: CompanyStatus.ACTIVE,
          subscriptionPlan: {
            isActive: true,
            rescanIntervalDays: { not: null },
          },
        },
      },
      select: {
        id: true,
        companyId: true,
        lastScannedAt: true,
        company: {
          select: {
            subscriptionPlan: { select: { rescanIntervalDays: true } },
          },
        },
        servicePackages: {
          where: { status: ServicePackageStatus.ACTIVE },
          select: {
            package: {
              select: { id: true, ecosystem: true, name: true, version: true },
            },
          },
        },
      },
    });

    return services.map((service) => ({
      id: service.id,
      companyId: service.companyId,
      lastScannedAt: service.lastScannedAt,
      // Non-null by construction: the WHERE clause above only matches
      // companies whose plan has rescanIntervalDays set.
      rescanIntervalDays: service.company.subscriptionPlan!.rescanIntervalDays!,
      activePackages: service.servicePackages.map((sp) => sp.package),
    }));
  }

  /**
   * Single-service counterpart to findServicesEligibleForRescan(), used by
   * the GitHub-webhook scan trigger: given the one service a
   * ServiceRepositoryConnection points at, fetch just enough to build a
   * package.scan message via PackageRescanSchedulerService.publishScanForService().
   * Unlike the cron path, this isn't gated on the company's rescan plan —
   * a verified webhook is an explicit customer action, not a promised
   * automatic interval.
   */
  async findByIdWithActivePackages(
    id: number,
  ): Promise<{
    id: number;
    companyId: number;
    environmentId: number;
    activePackages: {
      id: number;
      ecosystem: DependencyEcosystem;
      name: string;
      version: string;
    }[];
  } | null> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        environmentId: true,
        servicePackages: {
          where: { status: ServicePackageStatus.ACTIVE },
          select: {
            package: {
              select: { id: true, ecosystem: true, name: true, version: true },
            },
          },
        },
      },
    });

    if (!service) return null;

    return {
      id: service.id,
      companyId: service.companyId,
      environmentId: service.environmentId,
      activePackages: service.servicePackages.map((sp) => sp.package),
    };
  }
}
