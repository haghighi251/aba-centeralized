import { ForbiddenException } from '@nestjs/common';
import { CompanyAccessGuard } from './company-access.guard';

function makeCtx(user: any, paramsId: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { id: paramsId } }),
    }),
  } as any;
}

describe('CompanyAccessGuard', () => {
  let guard: CompanyAccessGuard;

  beforeEach(() => {
    guard = new CompanyAccessGuard();
  });

  it('allows access when the user belongs to the requested company', () => {
    const ctx = makeCtx({ companyId: 1 }, '1');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when the user belongs to a different company', () => {
    const ctx = makeCtx({ companyId: 2 }, '1');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Access denied to this company.',
    );
  });

  it('throws ForbiddenException when there is no user on the request', () => {
    const ctx = makeCtx(undefined, '1');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the company id param is not numeric', () => {
    const ctx = makeCtx({ companyId: 1 }, 'abc');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
