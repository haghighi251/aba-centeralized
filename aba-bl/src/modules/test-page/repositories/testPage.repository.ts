import { Injectable } from '@nestjs/common';
import { Prisma, TestPage, TestPageStatus } from '@aba/database';
import { BaseRepository } from '@/shared/repositories/base-repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

/** A TestPage with its (enabled) definitions eagerly loaded. */
export type TestPageWithDefinitions = Prisma.TestPageGetPayload<{
  include: { testDefinitions: true };
}>;

@Injectable()
export class TestPageRepository extends BaseRepository<
  TestPage,
  Prisma.TestPageCreateInput,
  Prisma.TestPageUpdateInput,
  Prisma.TestPageWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.TestPageCreateInput): Promise<TestPage> {
    try {
      return await this.prisma.testPage.create({ data });
    } catch (error) {
      this.handleError(error, 'TestPage');
    }
  }

  async findById(id: string | number): Promise<TestPage | null> {
    return this.prisma.testPage.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.TestPageWhereInput,
  ): Promise<{ data: TestPage[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.testPage.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testPage.count({ where: filter }),
    ]);
    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.TestPageUpdateInput,
  ): Promise<TestPage> {
    try {
      return await this.prisma.testPage.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'TestPage');
    }
  }

  async delete(id: string | number): Promise<TestPage> {
    try {
      return await this.prisma.testPage.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'TestPage');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.testPage.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findAllForService(serviceId: number): Promise<TestPage[]> {
    return this.prisma.testPage.findMany({
      where: { serviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Active targets of a service, with their enabled definitions — for a run. */
  async findActiveWithEnabledDefinitions(
    serviceId: number,
  ): Promise<TestPageWithDefinitions[]> {
    return this.prisma.testPage.findMany({
      where: { serviceId, status: TestPageStatus.ACTIVE },
      include: {
        testDefinitions: { where: { enabled: true } },
      },
    });
  }

  /** A single target with its enabled definitions — for a target-scoped run. */
  async findOneWithEnabledDefinitions(
    id: number,
  ): Promise<TestPageWithDefinitions | null> {
    return this.prisma.testPage.findUnique({
      where: { id },
      include: {
        testDefinitions: { where: { enabled: true } },
      },
    });
  }

  async countForService(serviceId: number): Promise<number> {
    return this.prisma.testPage.count({ where: { serviceId } });
  }
}
