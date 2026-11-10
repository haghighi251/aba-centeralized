import { ServicePackageRepository } from '@/modules/service-package/repositories/servicePackage.repository';

export type MockedServicePackageRepository = {
  [K in keyof ServicePackageRepository]: jest.Mock;
};

export function createServicePackageRepositoryMock(): MockedServicePackageRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findActive: jest.fn(),
    findHistory: jest.fn(),
    findActiveByServiceAndPackageName: jest.fn(),
    markAsStale: jest.fn(),
    markAsRemoved: jest.fn(),
  } as unknown as MockedServicePackageRepository;
}
