import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { FindCompanyUserByEmailUseCase } from '@/modules/users/usecases/findCompanyUserByEmail.usecase';
import { GetUserByUsernameOrEmailUseCase } from '@/modules/users/usecases/getUserByUsernameOrEmailUseCase';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';
import { verifyGoogleIdToken } from '@/modules/auth/helpers/verifyGoogleIdToken';
import { verifyGithubAccessToken } from '@/modules/auth/helpers/verifyGithubAccessToken';
import { User, UserRole, UserStatus } from '@aba/database';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@/modules/auth/helpers/verifyGoogleIdToken', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock('@/modules/auth/helpers/verifyGithubAccessToken', () => ({
  verifyGithubAccessToken: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let findCompanyUserByEmailUseCase: jest.Mocked<FindCompanyUserByEmailUseCase>;
  let getUserByUsernameOrEmailUseCase: jest.Mocked<GetUserByUsernameOrEmailUseCase>;
  let userRepository: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailServerService>;

  const mockUser: User = {
    id: 1,
    email: 'testuser@example.com',
    password: '$2b$10$hash',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    avatar: '',
    role: UserRole.BUSINESS_OWNER,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-01-01'),
    companyId: 1,
    resetToken: null,
    resetTokenExpiry: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: FindCompanyUserByEmailUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetUserByUsernameOrEmailUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findByResetToken: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EmailServerService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
    findCompanyUserByEmailUseCase = module.get(FindCompanyUserByEmailUseCase);
    getUserByUsernameOrEmailUseCase = module.get(
      GetUserByUsernameOrEmailUseCase,
    );
    userRepository = module.get(UserRepository);
    emailService = module.get(EmailServerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('signs in a user with correct credentials and returns tokens', async () => {
      getUserByUsernameOrEmailUseCase.execute.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.signIn({
        username: 'testuser',
        password: 'correctpassword',
      });

      expect(result.user).toEqual({
        id: mockUser.id.toString(),
        name: mockUser.firstName,
        email: mockUser.email,
        role: mockUser.role,
        companyId: mockUser.companyId.toString(),
      });
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');

      expect(getUserByUsernameOrEmailUseCase.execute).toHaveBeenCalledWith({
        username: 'testuser',
        email: undefined,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correctpassword',
        mockUser.password,
      );
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      getUserByUsernameOrEmailUseCase.execute.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn({ username: 'testuser', password: 'wrongpassword' }),
      ).rejects.toThrow('Username or password is not correct.');

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('propagates the UnauthorizedException when no user is found', async () => {
      getUserByUsernameOrEmailUseCase.execute.mockRejectedValue(
        new UnauthorizedException(
          'There is no user for the requested credentials.',
        ),
      );

      await expect(
        service.signIn({
          username: 'nonexistentuser',
          password: 'anypassword',
        }),
      ).rejects.toThrow('There is no user for the requested credentials.');

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when token generation fails', async () => {
      getUserByUsernameOrEmailUseCase.execute.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('');

      await expect(
        service.signIn({ username: 'testuser', password: 'correctpassword' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when only the refresh token is empty', async () => {
      getUserByUsernameOrEmailUseCase.execute.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('');

      await expect(
        service.signIn({ username: 'testuser', password: 'correctpassword' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('refreshToken', () => {
    it('issues new tokens for a valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        username: 'testuser',
        role: 'BUSINESS_OWNER',
        companyId: 1,
      });
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpires: expect.any(Number),
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-refresh-token',
        {
          secret: expect.any(String),
        },
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 1,
          username: 'testuser',
          role: 'BUSINESS_OWNER',
          companyId: 1,
        },
        expect.objectContaining({ secret: expect.any(String) }),
      );
    });

    it('throws UnauthorizedException when the payload fails validation', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 123 });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        'Invalid token payload.',
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by jwtService.verifyAsync', async () => {
      jwtService.verifyAsync.mockRejectedValue(
        new UnauthorizedException('Invalid token.'),
      );

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid token.',
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when new tokens are empty', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        username: 'testuser',
        role: 'BUSINESS_OWNER',
        companyId: 1,
      });
      jwtService.signAsync.mockResolvedValue('');

      await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(
        'Failed to generate new access and refresh tokens.',
      );
    });
  });

  describe('googleSignIn', () => {
    const mockPayload = {
      sub: 'google-user-id',
      email: mockUser.email,
      name: 'Google User',
    };

    it('signs in with a valid Google ID token', async () => {
      (verifyGoogleIdToken as jest.Mock).mockResolvedValue(mockPayload);
      findCompanyUserByEmailUseCase.execute.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.googleSignIn('mock-google-id-token');

      expect(verifyGoogleIdToken).toHaveBeenCalledWith('mock-google-id-token');
      expect(findCompanyUserByEmailUseCase.execute).toHaveBeenCalledWith({
        email: mockUser.email,
      });
      expect(result.tokens.accessToken).toBe('mock-access-token');
    });

    it.each([undefined, '', 123 as unknown as string])(
      'throws UnauthorizedException for an invalid token value (%p)',
      async (token) => {
        await expect(service.googleSignIn(token)).rejects.toThrow(
          'Invalid Google ID token.',
        );
        expect(verifyGoogleIdToken).not.toHaveBeenCalled();
      },
    );

    it('throws UnauthorizedException when verifyGoogleIdToken returns an Error', async () => {
      (verifyGoogleIdToken as jest.Mock).mockResolvedValue(
        new Error('bad token'),
      );

      await expect(
        service.googleSignIn('mock-google-id-token'),
      ).rejects.toThrow('Invalid Google ID token.');
    });

    it('throws UnauthorizedException when the Google payload has no email', async () => {
      (verifyGoogleIdToken as jest.Mock).mockResolvedValue({
        sub: 'google-user-id',
      });

      await expect(
        service.googleSignIn('mock-google-id-token'),
      ).rejects.toThrow(
        'Google account has no email; cannot verify company membership.',
      );
    });

    it('propagates the rejection when the email is not associated with any company', async () => {
      (verifyGoogleIdToken as jest.Mock).mockResolvedValue(mockPayload);
      findCompanyUserByEmailUseCase.execute.mockRejectedValue(
        new UnauthorizedException(
          'This email is not associated with any company.',
        ),
      );

      await expect(
        service.googleSignIn('mock-google-id-token'),
      ).rejects.toThrow('This email is not associated with any company.');
    });
  });

  describe('githubSignIn', () => {
    const mockPayload = {
      sub: 'github-user-id',
      email: mockUser.email,
      name: 'Github User',
    };

    it('signs in with a valid Github access token', async () => {
      (verifyGithubAccessToken as jest.Mock).mockResolvedValue(mockPayload);
      findCompanyUserByEmailUseCase.execute.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.githubSignIn('mock-github-access-token');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().tokens.accessToken).toBe(
        'mock-access-token',
      );
      expect(findCompanyUserByEmailUseCase.execute).toHaveBeenCalledWith({
        email: mockUser.email,
      });
    });

    it.each([undefined, '', 123 as unknown as string])(
      'throws UnauthorizedException for an invalid token value (%p)',
      async (token) => {
        await expect(service.githubSignIn(token)).rejects.toThrow(
          'Invalid Github ID token.',
        );
        expect(verifyGithubAccessToken).not.toHaveBeenCalled();
      },
    );

    it('throws UnauthorizedException when the Github account has no public email', async () => {
      (verifyGithubAccessToken as jest.Mock).mockResolvedValue({
        ...mockPayload,
        email: null,
      });

      await expect(
        service.githubSignIn('mock-github-access-token'),
      ).rejects.toThrow(
        'GitHub account has no public email; cannot verify company membership.',
      );
    });

    it('propagates the rejection when the email is not associated with any company', async () => {
      (verifyGithubAccessToken as jest.Mock).mockResolvedValue(mockPayload);
      findCompanyUserByEmailUseCase.execute.mockRejectedValue(
        new UnauthorizedException(
          'This email is not associated with any company.',
        ),
      );

      await expect(
        service.githubSignIn('mock-github-access-token'),
      ).rejects.toThrow('This email is not associated with any company.');
    });
  });

  describe('forgotPassword', () => {
    it('does nothing when no user is found for the email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await service.forgotPassword('nobody@example.com');

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('generates a reset token and emails the user when found', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.forgotPassword(mockUser.email);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          resetToken: expect.any(String),
          resetTokenExpiry: expect.any(Date),
        }),
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringContaining('reset-password?token='),
      );
    });

    it('does not throw when sending the reset email fails', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP down'),
      );

      await expect(
        service.forgotPassword(mockUser.email),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException when the reset token is unknown', async () => {
      userRepository.findByResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('unknown-token', 'newpassword'),
      ).rejects.toThrow('Invalid or expired reset token.');
    });

    it('throws BadRequestException when the reset token has expired', async () => {
      userRepository.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetTokenExpiry: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword('expired-token', 'newpassword'),
      ).rejects.toThrow('Reset token has expired.');
    });

    it('updates the password and clears the reset token', async () => {
      userRepository.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetToken: 'valid-token',
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      userRepository.update.mockResolvedValue(mockUser);

      await service.resetPassword('valid-token', 'newpassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'new-hashed-password',
        resetToken: null,
        resetTokenExpiry: null,
      });
    });
  });
});
