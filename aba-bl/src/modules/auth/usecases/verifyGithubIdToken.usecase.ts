import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { IdToken } from '@/modules/auth/types/IdToken';
import { AuthSignInResult } from '@/modules/auth/types/AuthSignInResult';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AddUserDomainException } from '@/modules/users/exceptions/AddUserDomainError';
@Injectable()
export class VerifyGithubIdTokenUseCase implements UseCase<
  IdToken,
  AuthSignInResult
> {
  constructor(private readonly authService: AuthService) {}

  async execute({ id_token }: IdToken): Promise<AuthSignInResult> {
    const result = await this.authService.githubSignIn(id_token);

    if (result.isErr()) {
      if (result.error instanceof ServerException) {
        throw new InternalServerErrorException(result.error);
      }

      throw new AddUserDomainException(
        'There is an error in VerifyGithubIdTokenUseCase.',
      );
    }

    return result.value;
  }
}
