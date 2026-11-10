import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class CompanyAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req['user'];
    const companyId = parseInt(req.params.id, 10);

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company.');
    }
    return true;
  }
}
