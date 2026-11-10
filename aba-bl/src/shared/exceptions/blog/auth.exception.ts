import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthDomainException extends HttpException {
  constructor(message: string) {
    super('Forbidden', HttpStatus.FORBIDDEN);
    this.name = message;
  }
}
