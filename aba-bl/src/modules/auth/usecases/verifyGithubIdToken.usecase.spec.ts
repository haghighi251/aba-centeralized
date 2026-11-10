import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { VerifyGithubIdTokenUseCase } from './verifyGithubIdToken.usecase';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AddUserDomainException } from '@/modules/users/exceptions/AddUserDomainError';
import {
  ServerException,
  ServerType,
} from '@/modules/shared/exceptions/ServiceException';
import { AuthSignInResult } from '@/modules/auth/types/AuthSignInResult';

describe('VerifyGithubIdTokenUseCase', () => {
  let useCase: VerifyGithubIdTokenUseCase;
  let authService: jest.Mocked<AuthService>;

  const authSignInResult: AuthSignInResult = {
    user: {
      id: '1',
      name: 'Test User',
      email: 'testuser@example.com',
      role: 'BUSINESS_OWNER',
      companyId: '1',
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpires: 1234567890,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyGithubIdTokenUseCase,
        {
          provide: AuthService,
          useValue: { githubSignIn: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(VerifyGithubIdTokenUseCase);
    authService = module.get(AuthService);
  });

  it('returns the sign-in result when the auth service resolves successfully', async () => {
    authService.githubSignIn.mockResolvedValue(ok(authSignInResult));

    const result = await useCase.execute({ id_token: 'github-token' });

    expect(authService.githubSignIn).toHaveBeenCalledWith('github-token');
    expect(result).toEqual(authSignInResult);
  });

  it('throws InternalServerErrorException when the auth service returns a ServerException', async () => {
    const serverException = new ServerException(
      { message: 'upstream error', data: {} },
      ServerType.HYBRIS,
    );
    authService.githubSignIn.mockResolvedValue(err(serverException));

    await expect(useCase.execute({ id_token: 'github-token' })).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws AddUserDomainException when the auth service returns a generic error', async () => {
    authService.githubSignIn.mockResolvedValue(
      err(new Error('something went wrong')),
    );

    await expect(useCase.execute({ id_token: 'github-token' })).rejects.toThrow(
      AddUserDomainException,
    );
  });
});
