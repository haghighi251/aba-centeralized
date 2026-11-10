import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Guards internal service-to-service endpoints (the worker fetching run
 * materials). Requires the `x-internal-api-key` header to match
 * INTERNAL_API_KEY. Mirrors worker's own internal-sweep guard: when the env
 * var is empty, access is allowed outside production only (dev convenience);
 * in production an empty key denies all callers.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = process.env.INTERNAL_API_KEY ?? '';
    const provided =
      (req.headers['x-internal-api-key'] as string | undefined) ?? '';

    if (!expected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Internal API key not configured.');
      }
      return true;
    }

    if (provided !== expected) {
      throw new ForbiddenException('Invalid internal API key.');
    }
    return true;
  }
}
