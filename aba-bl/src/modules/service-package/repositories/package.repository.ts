import { Injectable } from '@nestjs/common';
import { Package, Prisma, DependencyEcosystem } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { BaseRepository } from '@/shared/repositories/base-repository';

@Injectable()
export class PackageRepository extends BaseRepository<
  Package,
  Prisma.PackageCreateInput,
  Prisma.PackageUpdateInput,
  Prisma.PackageWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.PackageCreateInput): Promise<Package> {
    try {
      return await this.prisma.package.create({ data });
    } catch (error) {
      this.handleError(error, 'Package');
    }
  }

  async findById(id: string | number): Promise<Package | null> {
    return this.prisma.package.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.PackageWhereInput,
  ): Promise<{ data: Package[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.package.findMany({ where: filter }),
      this.prisma.package.count({ where: filter }),
    ]);
    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.PackageUpdateInput,
  ): Promise<Package> {
    try {
      return await this.prisma.package.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'Package');
    }
  }

  async delete(id: string | number): Promise<Package> {
    try {
      return await this.prisma.package.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'Package');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.package.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findOrCreate(
    ecosystem: DependencyEcosystem,
    name: string,
    version: string,
  ): Promise<Package> {
    return this.prisma.package.upsert({
      where: { ecosystem_name_version: { ecosystem, name, version } },
      create: { ecosystem, name, version },
      update: {},
    });
  }
}
