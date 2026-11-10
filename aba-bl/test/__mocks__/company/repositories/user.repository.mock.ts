import { UserRepository } from '@/modules/users/repositories/user.repository';

export type MockedUserRepository = {
  [K in keyof UserRepository]: jest.Mock;
};

/**
 * Fully mocked UserRepository so company controller tests never reach
 * PrismaService / PostgreSQL.
 */
export function createUserRepositoryMock(): MockedUserRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByEmailOrPhone: jest.fn(),
    findAllByCompany: jest.fn(),
    createInCompany: jest.fn(),
    findByResetToken: jest.fn(),
    findByEmail: jest.fn(),
  } as unknown as MockedUserRepository;
}
