import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { User } from '@aba/database';

@Injectable()
export class GetUserByUserIDUseCase implements UseCase<string, User | null> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userID: string): Promise<User | null> {
    return this.userRepository.findById(userID);
  }
}
