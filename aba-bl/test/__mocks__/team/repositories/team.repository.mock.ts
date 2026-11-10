import { TeamRepository } from '@/modules/team/repositories/team.repository';

export type MockedTeamRepository = {
  [K in keyof TeamRepository]: jest.Mock;
};

/**
 * Fully mocked TeamRepository so team controller e2e tests
 * never reach PrismaService / PostgreSQL.
 */
export function createTeamRepositoryMock(): MockedTeamRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByCompanyAndSlug: jest.fn(),
    findByCompanyAndName: jest.fn(),
    findAllForCompany: jest.fn(),
    countForCompany: jest.fn(),
  } as unknown as MockedTeamRepository;
}
