import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { User } from '@aba/database';

const NOT_REGISTERED_MESSAGE =
  "This email is not associated with any company. If you don't have an account, " +
  'please register. If your company has an account here, please ask them to check ' +
  'if they have registered your email as a company user in their account.';

/**
 * Used by OAuth sign-in (Google/GitHub): a user may only sign in if their email
 * has already been registered as a company user. We never auto-create users here.
 */
@Injectable()
export class FindCompanyUserByEmailUseCase implements UseCase<
  { email: string },
  User
> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ email }: { email: string }): Promise<User> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(NOT_REGISTERED_MESSAGE);
    }

    return user;
  }
}
