import {
  DependencyEcosystem,
  Service,
  ServicePackageStatus,
  ServiceStatus,
  ServiceType,
} from '@aba/database';

export const mockService: Service = {
  id: 1,
  name: 'API Gateway',
  slug: 'api-gateway',
  type: ServiceType.API_GATEWAY,
  description: null,
  baseUrl: 'https://api.example.com',
  rateLimitConfig: null,
  status: ServiceStatus.ACTIVE,
  companyId: 1,
  environmentId: 1,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
} as unknown as Service;

export const mockOtherCompanyService: Service = {
  ...mockService,
  id: 99,
  companyId: 2,
  environmentId: 99,
};

export const mockPackage = {
  id: 1,
  ecosystem: DependencyEcosystem.NPM,
  name: 'express',
  version: '4.18.2',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

export const mockOlderPackage = {
  ...mockPackage,
  id: 2,
  version: '4.17.0',
};

export const mockActiveServicePackage = {
  id: 10,
  status: ServicePackageStatus.ACTIVE,
  versionRange: '^4.18.0',
  introducedAt: new Date('2024-01-01T00:00:00.000Z'),
  deactivatedAt: null,
  alarmCount: 0,
  lastAlarmAt: null,
  serviceId: 1,
  packageId: 1,
  package: mockPackage,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

export const mockStaleServicePackage = {
  ...mockActiveServicePackage,
  id: 9,
  status: ServicePackageStatus.STALE,
  packageId: 2,
  package: mockOlderPackage,
  deactivatedAt: new Date('2024-06-01T00:00:00.000Z'),
};

export const mockRemovedServicePackage = {
  ...mockActiveServicePackage,
  id: 8,
  status: ServicePackageStatus.REMOVED,
  deactivatedAt: new Date('2024-05-01T00:00:00.000Z'),
};

export const validCreatePackagePayload = {
  name: 'express',
  version: '4.18.2',
  versionRange: '^4.18.0',
  ecosystem: DependencyEcosystem.NPM,
};

export const validUpdatePackagePayload = {
  version: '4.19.0',
  versionRange: '^4.19.0',
};

export const validBulkImportPayload = {
  ecosystem: DependencyEcosystem.NPM,
  packages: [
    { name: 'express', version: '4.18.2', versionRange: '^4.18.0' },
    { name: 'lodash', version: '4.17.21' },
  ],
};
