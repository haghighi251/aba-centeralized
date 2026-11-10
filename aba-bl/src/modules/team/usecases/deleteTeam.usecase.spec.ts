import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Team, TeamStatus } from '@aba/database';
import { DeleteTeamUseCase } from './deleteTeam.usecase';
import { TeamService } from '@/modules/team/services/team.service';

describe('DeleteTeamUseCase', () => {
  let useCase: DeleteTeamUseCase;
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
        DeleteTeamUseCase,
        {
          provide: TeamService,
          useValue: { deleteTeam: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteTeamUseCase);
    service = module.get(TeamService);
  });

  it('returns the deleted team on success', async () => {
    service.deleteTeam.mockResolvedValue(ok(mockTeam));

    const result = await useCase.execute({ companyId: 1, teamId: 1 });

    expect(result).toBe(mockTeam);
    expect(service.deleteTeam).toHaveBeenCalledWith(1, 1);
  });

  it('throws NotFoundException when the service reports it', async () => {
    service.deleteTeam.mockResolvedValue(
      err(new NotFoundException('Team not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, teamId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });
});
