// auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '@/modules/auth/services/auth.service';
import { VerifyGithubIdTokenUseCase } from '@/modules/auth/usecases/verifyGithubIdToken.usecase';
import { IdToken } from '@/modules/auth/types/IdToken';
import { createResponse } from '@/shared/utils/createResponse';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signIn: jest.fn(),
    refreshToken: jest.fn(),
    googleSignIn: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockVerifyGithubIdTokenUseCase = {
    execute: jest.fn(),
  };

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: VerifyGithubIdTokenUseCase,
          useValue: mockVerifyGithubIdTokenUseCase,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true }) // always allow
      .compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const credentials = { email: 'test@example.com', password: 'password' };

    it('should sign in successfully and return formatted response', async () => {
      const serviceResult = { accessToken: 'token', refreshToken: 'rt' };
      mockAuthService.signIn.mockResolvedValue(serviceResult);

      const result = await controller.signIn(credentials);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(credentials);
      expect(result).toEqual(createResponse(true, null, serviceResult));
    });

    it('should propagate error if authService.signIn rejects', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.signIn.mockRejectedValue(error);

      await expect(controller.signIn(credentials)).rejects.toThrow(error);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto = { refreshToken: 'some-refresh-token' };

    it('should refresh token successfully', async () => {
      const serviceResult = {
        accessToken: 'new-token',
        refreshToken: 'new-rt',
        accessTokenExpires: expect.any(Number) as unknown as number,
      };
      mockAuthService.refreshToken.mockResolvedValue(serviceResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'some-refresh-token',
      );
      expect(result).toEqual({
        success: true,
        error: null,
        data: serviceResult,
      });
    });

    it('should propagate error if authService.refreshToken rejects', async () => {
      const error = new Error('Refresh failed');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(error);
    });
  });

  describe('getCsrfToken', () => {
    it('should generate CSRF token, log details, and return it', () => {
      const mockReq = {
        csrfToken: jest.fn().mockReturnValue('test-csrf-token'),
        signedCookies: { _csrf: 'test-secret' },
        path: '/auth/csrf-token', // <-- FIXED: add path property
      };
      const consoleSpy = jest.spyOn(console, 'log');

      const result = controller.getCsrfToken(mockReq);

      expect(mockReq.csrfToken).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Generating CSRF token for request:',
        mockReq.path,
      );
      expect(result).toEqual(createResponse(true, null, 'test-csrf-token'));
    });

    it('should propagate error if req.csrfToken() throws', () => {
      const error = new Error('csrf generation error');
      const mockReq = {
        csrfToken: jest.fn().mockImplementation(() => {
          throw error;
        }),
        signedCookies: {},
        path: '/auth/csrf-token', // added for consistency (not strictly required but harmless)
      };
      expect(() => controller.getCsrfToken(mockReq)).toThrow(error);
    });
  });

  describe('googleSignIn', () => {
    const token: IdToken = { id_token: 'google-id-token' };

    it('should sign in with Google and return formatted response', async () => {
      const serviceResult = { accessToken: 'g-token', refreshToken: 'g-rt' };
      mockAuthService.googleSignIn.mockResolvedValue(serviceResult);
      const consoleSpy = jest.spyOn(console, 'log');

      const result = await controller.googleSignIn(token);

      expect(mockAuthService.googleSignIn).toHaveBeenCalledWith(
        'google-id-token',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Google Sign-In result:',
        serviceResult,
      );
      expect(result).toEqual(createResponse(true, null, serviceResult));
    });

    it('should propagate error if authService.googleSignIn rejects', async () => {
      const error = new Error('Google auth failed');
      mockAuthService.googleSignIn.mockRejectedValue(error);

      await expect(controller.googleSignIn(token)).rejects.toThrow(error);
    });
  });

  describe('verifyGithubIdToken', () => {
    const token: IdToken = { id_token: 'github-id-token' };

    it('should verify GitHub token and return formatted response', async () => {
      const useCaseResult = { accessToken: 'gh-token', refreshToken: 'gh-rt' };
      mockVerifyGithubIdTokenUseCase.execute.mockResolvedValue(useCaseResult);
      const consoleSpy = jest.spyOn(console, 'log');

      const result = await controller.verifyGithubIdToken(token);

      expect(mockVerifyGithubIdTokenUseCase.execute).toHaveBeenCalledWith(
        token,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'GitHub Sign-In result:',
        useCaseResult,
      );
      expect(result).toEqual(createResponse(true, null, useCaseResult));
    });

    it('should propagate error if verifyGithubIdTokenUseCase.execute rejects', async () => {
      const error = new Error('GitHub verification failed');
      mockVerifyGithubIdTokenUseCase.execute.mockRejectedValue(error);

      await expect(controller.verifyGithubIdToken(token)).rejects.toThrow(
        error,
      );
    });
  });

  describe('forgotPassword', () => {
    it('triggers the password reset email and returns a generic success message', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword({
        email: 'user@example.com',
      });

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(result).toEqual(
        createResponse(
          true,
          null,
          'If that email is registered you will receive a reset link shortly.',
        ),
      );
    });

    it('propagates error if authService.forgotPassword rejects', async () => {
      const error = new Error('forgot password failed');
      mockAuthService.forgotPassword.mockRejectedValue(error);

      await expect(
        controller.forgotPassword({ email: 'user@example.com' }),
      ).rejects.toThrow(error);
    });
  });

  describe('resetPassword', () => {
    it('updates the password and returns a success message', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword({
        token: 'reset-token',
        password: 'newpassword123',
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'reset-token',
        'newpassword123',
      );
      expect(result).toEqual(
        createResponse(true, null, 'Password updated successfully.'),
      );
    });

    it('propagates error if authService.resetPassword rejects', async () => {
      const error = new Error('reset password failed');
      mockAuthService.resetPassword.mockRejectedValue(error);

      await expect(
        controller.resetPassword({
          token: 'reset-token',
          password: 'newpassword123',
        }),
      ).rejects.toThrow(error);
    });
  });

  describe('getProfile', () => {
    it('should return req.user', () => {
      const mockUser = { id: 1, email: 'user@example.com' };
      const mockReq = { user: mockUser };

      const result = controller.getProfile(mockReq);

      expect(result).toEqual(mockUser);
    });
  });
});
