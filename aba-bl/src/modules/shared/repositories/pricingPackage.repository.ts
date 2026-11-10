import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import { Prisma, PricingPackage } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class PricingPackageRepository extends BaseRepository<
  PricingPackage,
  Prisma.PricingPackageCreateInput,
  Prisma.PricingPackageUpdateInput,
  Prisma.PricingPackageWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.PricingPackageCreateInput,
  ): Promise<PricingPackage> {
    try {
      return await this.prisma.pricingPackage.create({ data });
    } catch (error) {
      this.handleError(error, 'PricingPackage');
    }
  }

  async findById(id: string | number): Promise<PricingPackage | null> {
    return this.prisma.pricingPackage.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.PricingPackageWhereInput,
  ): Promise<{ data: PricingPackage[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.pricingPackage.findMany({ where: filter }),
      this.prisma.pricingPackage.count({ where: filter }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.PricingPackageUpdateInput,
  ): Promise<PricingPackage> {
    try {
      return await this.prisma.pricingPackage.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'PricingPackage');
    }
  }

  async delete(id: string | number): Promise<PricingPackage> {
    try {
      return await this.prisma.pricingPackage.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'PricingPackage');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.pricingPackage.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }
}
