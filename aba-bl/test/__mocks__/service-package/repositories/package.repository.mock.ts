import { PackageRepository } from '@/modules/service-package/repositories/package.repository';

export type MockedPackageRepository = {
  [K in keyof PackageRepository]: jest.Mock;
};

export function createPackageRepositoryMock(): MockedPackageRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findOrCreate: jest.fn(),
  } as unknown as MockedPackageRepository;
}
