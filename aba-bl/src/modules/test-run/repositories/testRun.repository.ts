import { Injectable } from '@nestjs/common';
import { Prisma, TestRun } from '@aba/database';
import { BaseRepository } from '@/shared/repositories/base-repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

/** A TestRun with its persisted results eagerly loaded. */
export type TestRunWithResults = Prisma.TestRunGetPayload<{
  include: { results: true };
}>;

@Injectable()
export class TestRunRepository extends BaseRepository<
  TestRun,
  Prisma.TestRunCreateInput,
  Prisma.TestRunUpdateInput,
  Prisma.TestRunWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.TestRunCreateInput): Promise<TestRun> {
    try {
      return await this.prisma.testRun.create({ data });
    } catch (error) {
      this.handleError(error, 'TestRun');
    }
  }

  async findById(id: string | number): Promise<TestRun | null> {
    return this.prisma.testRun.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.TestRunWhereInput,
  ): Promise<{ data: TestRun[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.testRun.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testRun.count({ where: filter }),
    ]);
    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.TestRunUpdateInput,
  ): Promise<TestRun> {
    try {
      return await this.prisma.testRun.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'TestRun');
    }
  }

  async delete(id: string | number): Promise<TestRun> {
    try {
      return await this.prisma.testRun.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'TestRun');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.testRun.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findAllForService(serviceId: number): Promise<TestRun[]> {
    return this.prisma.testRun.findMany({
      where: { serviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** A single run with its persisted results — for the detail endpoint. */
  async findByIdWithResults(
    id: number,
  ): Promise<TestRunWithResults | null> {
    return this.prisma.testRun.findUnique({
      where: { id },
      include: { results: { orderBy: { id: 'asc' } } },
    });
  }

  async findByRunKey(runKey: string): Promise<TestRun | null> {
    return this.prisma.testRun.findUnique({ where: { runKey } });
  }

  /** Runs created for a company (across its services) since `since`. */
  async countForCompanySince(companyId: number, since: Date): Promise<number> {
    return this.prisma.testRun.count({
      where: { service: { companyId }, createdAt: { gte: since } },
    });
  }
}
