import { ServiceRepository } from '@/modules/service/repositories/service.repository';

export type MockedServiceRepository = {
  [K in keyof ServiceRepository]: jest.Mock;
};

export function createServiceRepositoryMock(): MockedServiceRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByEnvironmentAndSlug: jest.fn(),
    findAllForEnvironment: jest.fn(),
    countForEnvironment: jest.fn(),
  } as unknown as MockedServiceRepository;
}
