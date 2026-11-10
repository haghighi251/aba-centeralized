import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ServicePackage,
  ServicePackageNotificationState,
  ServicePackageStatus,
} from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { BaseRepository } from '@/shared/repositories/base-repository';
import {
  TServicePackageFilter,
  TServicePackageHistoryFilter,
} from '@/modules/service-package/dtos/servicePackageFilter';

export type ServicePackageWithPackage = ServicePackage & {
  package: {
    id: number;
    ecosystem: string;
    name: string;
    version: string;
    createdAt: Date;
  };
  notificationState?: ServicePackageNotificationState | null;
};

@Injectable()
export class ServicePackageRepository extends BaseRepository<
  ServicePackage,
  Prisma.ServicePackageCreateInput,
  Prisma.ServicePackageUpdateInput,
  Prisma.ServicePackageWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.ServicePackageCreateInput,
  ): Promise<ServicePackageWithPackage> {
    try {
      return await this.prisma.servicePackage.create({
        data,
        include: { package: true },
      });
    } catch (error) {
      this.handleError(error, 'ServicePackage');
    }
  }

  async findById(
    id: string | number,
  ): Promise<ServicePackageWithPackage | null> {
    return this.prisma.servicePackage.findUnique({
      where: { id: this.normalizeId(id) },
      include: { package: true },
    });
  }

  async findAll(
    filter: Prisma.ServicePackageWhereInput,
  ): Promise<{ data: ServicePackageWithPackage[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.servicePackage.findMany({
        where: filter,
        include: { package: true },
      }),
      this.prisma.servicePackage.count({ where: filter }),
    ]);
    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.ServicePackageUpdateInput,
  ): Promise<ServicePackageWithPackage> {
    try {
      return await this.prisma.servicePackage.update({
        where: { id: this.normalizeId(id) },
        data,
        include: { package: true },
      });
    } catch (error) {
      this.handleError(error, 'ServicePackage');
    }
  }

  async delete(id: string | number): Promise<ServicePackage> {
    try {
      return await this.prisma.servicePackage.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'ServicePackage');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.servicePackage.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findActive(filter: TServicePackageFilter): Promise<{
    data: ServicePackageWithPackage[];
    total: number;
  }> {
    const { serviceId, search, ecosystem, sortBy, sortOrder } = filter;

    const orderBy =
      sortBy === 'name'
        ? { package: { name: sortOrder as Prisma.SortOrder } }
        : { introducedAt: sortOrder as Prisma.SortOrder };

    const packageFilter: Prisma.PackageWhereInput = {
      ...(ecosystem && { ecosystem }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as Prisma.QueryMode },
      }),
    };

    const where: Prisma.ServicePackageWhereInput = {
      serviceId,
      status: ServicePackageStatus.ACTIVE,
      ...(Object.keys(packageFilter).length > 0 && { package: packageFilter }),
    };

    const [data, total] = await Promise.all([
      this.prisma.servicePackage.findMany({
        where,
        include: { package: true, notificationState: true },
        orderBy,
      }),
      this.prisma.servicePackage.count({ where }),
    ]);

    return { data, total };
  }

  async findHistory(filter: TServicePackageHistoryFilter): Promise<{
    data: ServicePackageWithPackage[];
    total: number;
  }> {
    const { serviceId, search, status, sortBy, sortOrder } = filter;

    const statusFilter: Prisma.ServicePackageWhereInput['status'] =
      status === 'ALL'
        ? { in: [ServicePackageStatus.STALE, ServicePackageStatus.REMOVED] }
        : status;

    const orderBy =
      sortBy === 'name'
        ? { package: { name: sortOrder as Prisma.SortOrder } }
        : { deactivatedAt: sortOrder as Prisma.SortOrder };

    const where: Prisma.ServicePackageWhereInput = {
      serviceId,
      status: statusFilter,
      ...(search && {
        package: {
          name: { contains: search, mode: 'insensitive' as Prisma.QueryMode },
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.servicePackage.findMany({
        where,
        include: { package: true },
        orderBy,
      }),
      this.prisma.servicePackage.count({ where }),
    ]);

    return { data, total };
  }

  async findActiveByServiceAndPackageName(
    serviceId: number,
    packageName: string,
    ecosystem: string,
  ): Promise<ServicePackageWithPackage | null> {
    return this.prisma.servicePackage.findFirst({
      where: {
        serviceId,
        status: ServicePackageStatus.ACTIVE,
        package: { name: packageName, ecosystem: ecosystem as any },
      },
      include: { package: true },
    });
  }

  async markAsStale(id: number): Promise<ServicePackageWithPackage> {
    return this.prisma.servicePackage.update({
      where: { id },
      data: {
        status: ServicePackageStatus.STALE,
        deactivatedAt: new Date(),
      },
      include: { package: true },
    });
  }

  async markAsRemoved(id: number): Promise<ServicePackageWithPackage> {
    return this.prisma.servicePackage.update({
      where: { id },
      data: {
        status: ServicePackageStatus.REMOVED,
        deactivatedAt: new Date(),
      },
      include: { package: true },
    });
  }
}
