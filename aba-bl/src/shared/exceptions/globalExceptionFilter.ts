import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { createResponse } from '@/shared/utils/createResponse';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.message || 'Unexpected internal server error';
      response.status(status).json(createResponse(false, message));
      return;
    }

    // Never leak raw error details (e.g. Prisma messages containing SQL,
    // table, or schema names) to the client - log them server-side instead.
    this.logger.error(exception?.message ?? exception, exception?.stack);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(createResponse(false, 'Internal server error'));
  }
}
