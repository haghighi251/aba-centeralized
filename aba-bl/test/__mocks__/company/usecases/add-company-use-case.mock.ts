import { AddCompanyUseCase } from '@/modules/company/usecases/add-company-use-case';

export type MockedAddCompanyUseCase = {
  [K in keyof AddCompanyUseCase]: jest.Mock;
};

/**
 * Fully mocked AddCompanyUseCase so CompanyController tests never reach
 * AddNewCompanyService, bcrypt, or the database.
 */
export function createAddCompanyUseCaseMock(): MockedAddCompanyUseCase {
  return {
    execute: jest.fn(),
  } as unknown as MockedAddCompanyUseCase;
}
