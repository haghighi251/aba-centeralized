import { Injectable } from '@nestjs/common';
import { Prisma, TestDefinition } from '@aba/database';
import { BaseRepository } from '@/shared/repositories/base-repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class TestDefinitionRepository extends BaseRepository<
  TestDefinition,
  Prisma.TestDefinitionCreateInput,
  Prisma.TestDefinitionUpdateInput,
  Prisma.TestDefinitionWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.TestDefinitionCreateInput,
  ): Promise<TestDefinition> {
    try {
      return await this.prisma.testDefinition.create({ data });
    } catch (error) {
      this.handleError(error, 'TestDefinition');
    }
  }

  async findById(id: string | number): Promise<TestDefinition | null> {
    return this.prisma.testDefinition.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findAll(
    filter: Prisma.TestDefinitionWhereInput,
  ): Promise<{ data: TestDefinition[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.testDefinition.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testDefinition.count({ where: filter }),
    ]);
    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.TestDefinitionUpdateInput,
  ): Promise<TestDefinition> {
    try {
      return await this.prisma.testDefinition.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'TestDefinition');
    }
  }

  async delete(id: string | number): Promise<TestDefinition> {
    try {
      return await this.prisma.testDefinition.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'TestDefinition');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.testDefinition.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async findAllForTarget(testPageId: number): Promise<TestDefinition[]> {
    return this.prisma.testDefinition.findMany({
      where: { testPageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countForTarget(testPageId: number): Promise<number> {
    return this.prisma.testDefinition.count({ where: { testPageId } });
  }
}
