import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Always allows the request through and stamps `request.user` with the
 * given payload, mimicking a successfully verified JWT.
 */
export class AllowAuthGuardMock implements CanActivate {
  constructor(
    private readonly user: Record<string, unknown> = {
      sub: '1',
      username: 'user@example.com',
      role: 'BUSINESS_OWNER',
      companyId: '1',
    },
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request['user'] = this.user;
    return true;
  }
}

/**
 * Always rejects the request, mimicking a missing/invalid bearer token.
 */
export class DenyAuthGuardMock implements CanActivate {
  canActivate(): boolean {
    throw new UnauthorizedException();
  }
}
