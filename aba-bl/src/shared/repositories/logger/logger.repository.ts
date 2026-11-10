import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { Prisma } from '@aba/database';

@Injectable()
export class LoggerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addLog(logEntry: Prisma.LogCreateInput) {
    await this.prisma.log.create({ data: logEntry });
  }
}
