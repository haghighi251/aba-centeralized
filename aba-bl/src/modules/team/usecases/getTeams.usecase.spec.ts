import { Test, TestingModule } from '@nestjs/testing';
import { Team, TeamStatus } from '@aba/database';
import { GetTeamsUseCase } from './getTeams.usecase';
import { TeamService } from '@/modules/team/services/team.service';

describe('GetTeamsUseCase', () => {
  let useCase: GetTeamsUseCase;
  let service: jest.Mocked<TeamService>;

  const mockTeam: Team = {
    id: 1,
    name: 'Platform',
    slug: 'platform',
    description: null,
    status: TeamStatus.ACTIVE,
    companyId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Team;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeamsUseCase,
        {
          provide: TeamService,
          useValue: { getTeams: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetTeamsUseCase);
    service = module.get(TeamService);
  });

  it('delegates to the service and returns its result', async () => {
    service.getTeams.mockResolvedValue({ data: [mockTeam], total: 1 });

    const filter = {
      companyId: 1,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
    };

    const result = await useCase.execute(filter);

    expect(result).toEqual({ data: [mockTeam], total: 1 });
    expect(service.getTeams).toHaveBeenCalledWith(filter);
  });
});
