import { AuthService } from '@/modules/auth/services/auth.service';

export type MockedAuthService = {
  [K in keyof AuthService]: jest.Mock;
};

/**
 * Fully mocked AuthService. Every method is a jest.fn() so tests never reach
 * Prisma, bcrypt, JWT signing, Google/GitHub verification, or email sending.
 */
export function createAuthServiceMock(): MockedAuthService {
  return {
    signIn: jest.fn(),
    refreshToken: jest.fn(),
    googleSignIn: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    githubSignIn: jest.fn(),
  } as unknown as MockedAuthService;
}
