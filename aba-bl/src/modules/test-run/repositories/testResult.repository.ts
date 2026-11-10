import { Injectable } from '@nestjs/common';
import { Prisma, TestResult } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class TestResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    rows: Prisma.TestResultCreateManyInput[],
  ): Promise<number> {
    const result = await this.prisma.testResult.createMany({ data: rows });
    return result.count;
  }

  async findForRun(testRunId: number): Promise<TestResult[]> {
    return this.prisma.testResult.findMany({
      where: { testRunId },
      orderBy: { id: 'asc' },
    });
  }
}
