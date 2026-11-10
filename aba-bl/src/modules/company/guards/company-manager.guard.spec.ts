import { ForbiddenException } from '@nestjs/common';
import { CompanyManagerGuard } from './company-manager.guard';

function makeCtx(user: any, paramsId: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { id: paramsId } }),
    }),
  } as any;
}

describe('CompanyManagerGuard', () => {
  let guard: CompanyManagerGuard;

  beforeEach(() => {
    guard = new CompanyManagerGuard();
  });

  it('allows BUSINESS_OWNER from the matching company', () => {
    const ctx = makeCtx({ companyId: 1, role: 'BUSINESS_OWNER' }, '1');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows BUSINESS_ADMIN from the matching company', () => {
    const ctx = makeCtx({ companyId: 1, role: 'BUSINESS_ADMIN' }, '1');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException for BUSINESS_MEMBER even within the same company', () => {
    const ctx = makeCtx({ companyId: 1, role: 'BUSINESS_MEMBER' }, '1');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Manager access required for this company.',
    );
  });

  it('throws ForbiddenException when the company id does not match', () => {
    const ctx = makeCtx({ companyId: 2, role: 'BUSINESS_OWNER' }, '1');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no user on the request', () => {
    const ctx = makeCtx(undefined, '1');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
