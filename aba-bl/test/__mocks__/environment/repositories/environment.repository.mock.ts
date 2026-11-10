import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';

export type MockedEnvironmentRepository = {
  [K in keyof EnvironmentRepository]: jest.Mock;
};

/**
 * Fully mocked EnvironmentRepository so environment controller e2e tests
 * never reach PrismaService / PostgreSQL.
 */
export function createEnvironmentRepositoryMock(): MockedEnvironmentRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByTeamAndSlug: jest.fn(),
    findByTeamAndName: jest.fn(),
    findByTeamAndOrder: jest.fn(),
    findMaxOrder: jest.fn(),
    findAllForCompany: jest.fn(),
    countForCompany: jest.fn(),
  } as unknown as MockedEnvironmentRepository;
}
