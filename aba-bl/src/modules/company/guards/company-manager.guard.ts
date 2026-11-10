import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const MANAGER_ROLES = ['BUSINESS_OWNER', 'BUSINESS_ADMIN'];

@Injectable()
export class CompanyManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req['user'];
    const companyId = parseInt(req.params.id, 10);

    if (
      !user ||
      user.companyId !== companyId ||
      !MANAGER_ROLES.includes(user.role)
    ) {
      throw new ForbiddenException('Manager access required for this company.');
    }
    return true;
  }
}
