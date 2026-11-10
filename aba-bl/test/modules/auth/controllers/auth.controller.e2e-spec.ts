import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpStatus,
  INestApplication,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { AuthService } from '@/modules/auth/services/auth.service';
import { VerifyGithubIdTokenUseCase } from '@/modules/auth/usecases/verifyGithubIdToken.usecase';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  createAuthServiceMock,
  MockedAuthService,
} from '@test/__mocks__/auth/services/auth.service.mock';
import {
  createVerifyGithubIdTokenUseCaseMock,
  MockedVerifyGithubIdTokenUseCase,
} from '@test/__mocks__/auth/usecases/verifyGithubIdToken.usecase.mock';
import {
  AllowAuthGuardMock,
  DenyAuthGuardMock,
} from '@test/__mocks__/auth/guards/auth.guard.mock';
import { applyCsrfTokenMiddlewareMock } from '@test/__mocks__/auth/middlewares/csrfToken.middleware.mock';
import {
  mockAuthSignInResult,
  mockJwtPayload,
  mockRefreshTokenResult,
} from '@test/__mocks__/auth/fixtures/auth.fixtures';

/**
 * E2E tests for every path under /auth.
 *
 * Nothing here touches PostgreSQL/Prisma, Redis, Kafka, Google/GitHub APIs,
 * or SendGrid: AuthService and VerifyGithubIdTokenUseCase are fully mocked,
 * and AuthGuard's JwtService dependency is mocked as well.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockAuthService: MockedAuthService;
  let mockVerifyGithubIdTokenUseCase: MockedVerifyGithubIdTokenUseCase;
  let mockJwtService: { verifyAsync: jest.Mock };

  async function buildApp(authGuard?: {
    canActivate: (...args: unknown[]) => unknown;
  }): Promise<INestApplication> {
    let builder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: VerifyGithubIdTokenUseCase,
          useValue: mockVerifyGithubIdTokenUseCase,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    });

    if (authGuard) {
      builder = builder.overrideGuard(AuthGuard).useValue(authGuard);
    }

    const module: TestingModule = await builder.compile();
    const testApp = module.createNestApplication();
    testApp.useGlobalFilters(new GlobalExceptionFilter());
    applyCsrfTokenMiddlewareMock(testApp);
    await testApp.init();
    return testApp;
  }

  beforeEach(async () => {
    mockAuthService = createAuthServiceMock();
    mockVerifyGithubIdTokenUseCase = createVerifyGithubIdTokenUseCaseMock();
    mockJwtService = { verifyAsync: jest.fn() };

    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /auth/login ──────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 200 and tokens for valid email + password', async () => {
      mockAuthService.signIn.mockResolvedValue(mockAuthSignInResult);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@acme.com', password: 'password123' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toEqual(mockAuthSignInResult);
        });

      expect(mockAuthService.signIn).toHaveBeenCalledWith({
        email: 'alice@acme.com',
        password: 'password123',
      });
    });

    it('returns 200 and tokens for valid username + password', async () => {
      mockAuthService.signIn.mockResolvedValue(mockAuthSignInResult);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'password123' })
        .expect(HttpStatus.OK);

      expect(mockAuthService.signIn).toHaveBeenCalledWith({
        username: 'alice',
        password: 'password123',
      });
    });

    it('returns 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@acme.com' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@acme.com', password: 'short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('returns 400 when neither username nor email is provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('returns 400 when email is not a valid email address', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('returns 401 when credentials are invalid', async () => {
      mockAuthService.signIn.mockRejectedValue(
        new UnauthorizedException('Username or password is not correct.'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@acme.com', password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/auth/login')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });
  });

  // ── POST /auth/refresh ─────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 with a new token pair for a valid refresh token', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshTokenResult);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            error: null,
            data: mockRefreshTokenResult,
          });
        });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
    });

    it('returns 400 when refreshToken is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('returns 400 when refreshToken is an empty string', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: '' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('returns 401 when the refresh token is invalid or expired', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid token payload.'),
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'expired-token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/auth/refresh')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── GET /auth/csrf-token ───────────────────────────────────────────────

  describe('GET /auth/csrf-token', () => {
    it('returns 200 with a CSRF token', async () => {
      await request(app.getHttpServer())
        .get('/auth/csrf-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(typeof res.body.data).toBe('string');
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('returns 404 for POST (method not allowed)', async () => {
      await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── POST /auth/google ──────────────────────────────────────────────────

  describe('POST /auth/google', () => {
    it('returns 200 and tokens for a valid Google ID token', async () => {
      mockAuthService.googleSignIn.mockResolvedValue(mockAuthSignInResult);

      await request(app.getHttpServer())
        .post('/auth/google')
        .send({ id_token: 'valid-google-id-token' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toEqual(mockAuthSignInResult);
        });

      expect(mockAuthService.googleSignIn).toHaveBeenCalledWith(
        'valid-google-id-token',
      );
    });

    it('returns 401 when the Google ID token is invalid', async () => {
      mockAuthService.googleSignIn.mockRejectedValue(
        new UnauthorizedException('Invalid Google ID token.'),
      );

      await request(app.getHttpServer())
        .post('/auth/google')
        .send({ id_token: 'invalid-token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 401 when id_token is missing from the body', async () => {
      mockAuthService.googleSignIn.mockRejectedValue(
        new UnauthorizedException('Invalid Google ID token.'),
      );

      await request(app.getHttpServer())
        .post('/auth/google')
        .send({})
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockAuthService.googleSignIn).toHaveBeenCalledWith(undefined);
    });

    it('returns 401 when the email is not associated with any company', async () => {
      mockAuthService.googleSignIn.mockRejectedValue(
        new UnauthorizedException(
          'This email is not associated with any company.',
        ),
      );

      await request(app.getHttpServer())
        .post('/auth/google')
        .send({ id_token: 'valid-google-id-token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/auth/google')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── POST /auth/github ──────────────────────────────────────────────────

  describe('POST /auth/github', () => {
    it('returns 200 and tokens for a valid GitHub access token', async () => {
      mockVerifyGithubIdTokenUseCase.execute.mockResolvedValue(
        mockAuthSignInResult,
      );

      await request(app.getHttpServer())
        .post('/auth/github')
        .send({ id_token: 'valid-github-token' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toEqual(mockAuthSignInResult);
        });

      expect(mockVerifyGithubIdTokenUseCase.execute).toHaveBeenCalledWith({
        id_token: 'valid-github-token',
      });
    });

    it('returns 401 when the email is not associated with any company', async () => {
      mockVerifyGithubIdTokenUseCase.execute.mockRejectedValue(
        new UnauthorizedException(
          'This email is not associated with any company.',
        ),
      );

      await request(app.getHttpServer())
        .post('/auth/github')
        .send({ id_token: 'valid-github-token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 500 when the use case reports an internal domain error', async () => {
      mockVerifyGithubIdTokenUseCase.execute.mockRejectedValue(
        new InternalServerErrorException(
          'There is an error in VerifyGithubIdTokenUseCase.',
        ),
      );

      await request(app.getHttpServer())
        .post('/auth/github')
        .send({ id_token: 'valid-github-token' })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/auth/github')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── POST /auth/forgot-password ────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('returns 200 with a generic message for a registered email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'alice@acme.com' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBe(
            'If that email is registered you will receive a reset link shortly.',
          );
        });

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        'alice@acme.com',
      );
    });

    it('returns the same generic message for an unregistered email (no leak)', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'unknown@acme.com' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data).toBe(
            'If that email is registered you will receive a reset link shortly.',
          );
        });
    });

    it('returns 400 for an invalid email address', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });

    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/auth/forgot-password')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── POST /auth/reset-password ─────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('returns 200 when the reset token and password are valid', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-reset-token', password: 'newpassword123' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBe('Password updated successfully.');
        });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'newpassword123',
      );
    });

    it('returns 400 when the reset token is invalid or expired', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token.'),
      );

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'expired-token', password: 'newpassword123' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 when the new password is shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-reset-token', password: 'short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('returns 400 when token is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ password: 'newpassword123' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/auth/reset-password')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── GET /auth/profile ──────────────────────────────────────────────────

  describe('GET /auth/profile', () => {
    // Each test rebuilds `app` with a specific guard. The outer `afterEach`
    // closes whichever instance ends up assigned to `app`; the default
    // instance from the outer `beforeEach` is left to be garbage-collected
    // since it never binds a network port.

    it('returns 200 with the JWT payload when authenticated', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockJwtPayload));

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual(mockJwtPayload);
        });
    });

    it('returns 401 when the guard rejects the request', async () => {
      app = await buildApp(new DenyAuthGuardMock());

      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 401 with the real AuthGuard when no Authorization header is sent', async () => {
      app = await buildApp(); // no override → real AuthGuard

      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('returns 401 with the real AuthGuard when the bearer token is invalid', async () => {
      app = await buildApp(); // no override → real AuthGuard
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('invalid signature'),
      );

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
    });

    it('returns 404 for POST (method not allowed)', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockJwtPayload));

      await request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
