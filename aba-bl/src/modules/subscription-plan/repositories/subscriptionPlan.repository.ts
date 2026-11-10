import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionPlan } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class SubscriptionPlanRepository extends BaseRepository<
  SubscriptionPlan,
  Prisma.SubscriptionPlanCreateInput,
  Prisma.SubscriptionPlanUpdateInput,
  Prisma.SubscriptionPlanWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.SubscriptionPlanCreateInput,
  ): Promise<SubscriptionPlan> {
    try {
      return await this.prisma.subscriptionPlan.create({ data });
    } catch (error) {
      this.handleError(error, 'SubscriptionPlan');
    }
  }

  async findById(id: string | number): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.SubscriptionPlanWhereInput,
  ): Promise<{ data: SubscriptionPlan[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where: filter,
        orderBy: { monthlyPrice: 'asc' },
      }),
      this.prisma.subscriptionPlan.count({ where: filter }),
    ]);
    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.SubscriptionPlanUpdateInput,
  ): Promise<SubscriptionPlan> {
    try {
      return await this.prisma.subscriptionPlan.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'SubscriptionPlan');
    }
  }

  async delete(id: string | number): Promise<SubscriptionPlan> {
    try {
      return await this.prisma.subscriptionPlan.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'SubscriptionPlan');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.subscriptionPlan.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findDefault(): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  async findBySlug(slug: string): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findUnique({ where: { slug } });
  }
}
