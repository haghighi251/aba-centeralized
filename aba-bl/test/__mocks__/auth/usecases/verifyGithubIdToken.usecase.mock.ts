import { VerifyGithubIdTokenUseCase } from '@/modules/auth/usecases/verifyGithubIdToken.usecase';

export type MockedVerifyGithubIdTokenUseCase = {
  [K in keyof VerifyGithubIdTokenUseCase]: jest.Mock;
};

/**
 * Fully mocked VerifyGithubIdTokenUseCase so AuthController tests never reach
 * AuthService, GitHub's API, or the database.
 */
export function createVerifyGithubIdTokenUseCaseMock(): MockedVerifyGithubIdTokenUseCase {
  return {
    execute: jest.fn(),
  } as unknown as MockedVerifyGithubIdTokenUseCase;
}
