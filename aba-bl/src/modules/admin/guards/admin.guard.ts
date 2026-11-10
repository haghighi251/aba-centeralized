import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request['user'];
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
