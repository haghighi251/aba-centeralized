import { CompanyRepository } from '@/modules/company/repositories/company.repository';

export type MockedCompanyRepository = {
  [K in keyof CompanyRepository]: jest.Mock;
};

/**
 * Fully mocked CompanyRepository so company controller tests never reach
 * PrismaService / PostgreSQL.
 */
export function createCompanyRepositoryMock(): MockedCompanyRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findAllWithBusinessOwner: jest.fn(),
    updateStatus: jest.fn(),
    getStatusSummary: jest.fn(),
    findByEmailOrName: jest.fn(),
    createWithAdminUser: jest.fn(),
  } as unknown as MockedCompanyRepository;
}
