import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Team, TeamStatus } from '@aba/database';
import { GetTeamByIdUseCase } from './getTeamById.usecase';
import { TeamService } from '@/modules/team/services/team.service';

describe('GetTeamByIdUseCase', () => {
  let useCase: GetTeamByIdUseCase;
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
        GetTeamByIdUseCase,
        {
          provide: TeamService,
          useValue: { getTeamById: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetTeamByIdUseCase);
    service = module.get(TeamService);
  });

  it('returns the team on success', async () => {
    service.getTeamById.mockResolvedValue(ok(mockTeam));

    const result = await useCase.execute({ companyId: 1, teamId: 1 });

    expect(result).toBe(mockTeam);
    expect(service.getTeamById).toHaveBeenCalledWith(1, 1);
  });

  it('throws the error returned by the service', async () => {
    service.getTeamById.mockResolvedValue(
      err(new NotFoundException('Team not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, teamId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });
});
