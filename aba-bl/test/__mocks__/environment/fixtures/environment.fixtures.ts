import { Environment, EnvironmentStatus, EnvironmentType } from '@aba/database';

export const mockEnvironment: Environment = {
  id: 1,
  name: 'Development',
  slug: 'development',
  type: EnvironmentType.DEVELOPMENT,
  isProduction: false,
  order: 1,
  description: null,
  status: EnvironmentStatus.ACTIVE,
  companyId: 1,
  teamId: 1,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
} as Environment;

export const mockProductionEnvironment: Environment = {
  ...mockEnvironment,
  id: 2,
  name: 'Production',
  slug: 'production',
  type: EnvironmentType.PRODUCTION,
  isProduction: true,
  order: 4,
};

export const mockOtherCompanyEnvironment: Environment = {
  ...mockEnvironment,
  id: 3,
  companyId: 2,
};

export const validCreateEnvironmentPayload = {
  teamId: 1,
  name: 'Staging',
  type: EnvironmentType.STAGING,
  isProduction: false,
  order: 3,
};
