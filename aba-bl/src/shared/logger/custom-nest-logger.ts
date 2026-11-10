import { LoggerService } from '@/modules/shared/services/logger/logger.service';
import { ConsoleLogger } from '@nestjs/common';

export class CustomNestLogger extends ConsoleLogger {
  constructor(
    private loggerService: LoggerService,
    context?: string,
  ) {
    super(context);
  }

  log(message: string, context?: string) {
    super.log(message, context);
    this.loggerService.logInfo(message, context);
  }

  error(message: string, trace: string, context?: string) {
    super.error(message, trace, context);
    this.loggerService.logError(message, trace, context);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.loggerService.logWarning(message, context);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
    this.loggerService.logDebug(message, context);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
    this.loggerService.logVerbose(message, context);
  }
}
