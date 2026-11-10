import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { User } from '@aba/database';
import { UserLoginCredentials } from '@/modules/users/types/UserLoginCredentials';

@Injectable()
export class GetUserByUsernameOrEmailUseCase implements UseCase<
  UserLoginCredentials,
  User
> {
  private readonly logger = new Logger(GetUserByUsernameOrEmailUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(credentials: UserLoginCredentials): Promise<User> {
    // The login form sends the user's email in the `username` field.
    // Fall back to `email` if the caller provides it directly.
    const email = credentials.email || credentials.username;

    this.logger.log(`[LOOKUP] Searching Prisma users by email="${email}"`);

    const user = await this.userRepository.findByEmail(email);

    this.logger.log(
      `[LOOKUP] Result: ${user ? `found id=${user.id} email=${user.email}` : 'NOT FOUND'}`,
    );

    if (!user) {
      throw new UnauthorizedException(
        'There is no user for the requested credentials.',
      );
    }

    return user;
  }
}
