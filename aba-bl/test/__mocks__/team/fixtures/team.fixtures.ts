import { Team, TeamStatus } from '@aba/database';

export const mockTeam: Team = {
  id: 1,
  name: 'Platform',
  slug: 'platform',
  description: null,
  status: TeamStatus.ACTIVE,
  companyId: 1,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
} as Team;

export const mockGrowthTeam: Team = {
  ...mockTeam,
  id: 2,
  name: 'Growth',
  slug: 'growth',
};

export const mockOtherCompanyTeam: Team = {
  ...mockTeam,
  id: 3,
  companyId: 2,
};

export const validCreateTeamPayload = {
  name: 'Platform',
};
