import { Module } from '@nestjs/common';
import { LoggerRepository } from '@/shared/repositories/logger/logger.repository';
import { LoggerService } from '@/modules/shared/services/logger/logger.service';
import { CustomNestLogger } from '@/shared/logger/custom-nest-logger';

@Module({
  providers: [LoggerRepository, LoggerService, CustomNestLogger],
  exports: [LoggerRepository, LoggerService, CustomNestLogger],
})
export class LoggerModule {}
