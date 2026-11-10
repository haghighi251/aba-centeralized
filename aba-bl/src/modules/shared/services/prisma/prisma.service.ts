import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// Import PrismaClient from the shared package — never directly from @prisma/client.
// The shared package (@aba/database) is the single source of truth for the schema.
import { PrismaClient } from '@aba/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
