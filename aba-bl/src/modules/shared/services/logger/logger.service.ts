import { LoggerRepository } from '@/shared/repositories/logger/logger.repository';

export class LoggerService {
  constructor(private loggerRepository: LoggerRepository) {}

  async logError(message: string, trace: string, context: string) {
    await this.loggerRepository.addLog({
      level: 'error',
      message,
      trace,
      context,
    });
  }

  async logInfo(message: string, context: string) {
    await this.loggerRepository.addLog({
      level: 'info',
      message,
      context,
    });
  }

  async logWarning(message: string, context: string) {
    await this.loggerRepository.addLog({
      level: 'warn',
      message,
      context,
    });
  }

  async logDebug(message: string, context: string) {
    await this.loggerRepository.addLog({
      level: 'debug',
      message,
      context,
    });
  }

  async logVerbose(message: string, context: string) {
    await this.loggerRepository.addLog({
      level: 'verbose',
      message,
      context,
    });
  }
}
