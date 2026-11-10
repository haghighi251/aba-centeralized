import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { AuthDomainException } from './blog/auth.exception';

@Catch(AuthDomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: AuthDomainException, host: ArgumentsHost) {
    console.log(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = HttpStatus.NOT_FOUND;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: exception.message,
    });
  }
}
