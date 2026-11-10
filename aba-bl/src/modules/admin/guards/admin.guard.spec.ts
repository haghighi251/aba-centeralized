import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function makeCtx(role: string | undefined) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: role !== undefined ? { role } : undefined }),
    }),
  } as any;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('allows SUPER_ADMIN', () => {
    expect(guard.canActivate(makeCtx('SUPER_ADMIN'))).toBe(true);
  });

  it('allows ADMIN', () => {
    expect(guard.canActivate(makeCtx('ADMIN'))).toBe(true);
  });

  it.each(['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'BUSINESS_MEMBER'])(
    'blocks %s with ForbiddenException',
    (role) => {
      expect(() => guard.canActivate(makeCtx(role))).toThrow(
        ForbiddenException,
      );
    },
  );

  it('blocks when user is missing', () => {
    expect(() => guard.canActivate(makeCtx(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
