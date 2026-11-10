import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Team, TeamStatus } from '@aba/database';
import { CreateTeamUseCase } from './createTeam.usecase';
import { TeamService } from '@/modules/team/services/team.service';

describe('CreateTeamUseCase', () => {
  let useCase: CreateTeamUseCase;
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
        CreateTeamUseCase,
        {
          provide: TeamService,
          useValue: { createTeam: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CreateTeamUseCase);
    service = module.get(TeamService);
  });

  it('returns the created team on success', async () => {
    service.createTeam.mockResolvedValue(ok(mockTeam));

    const result = await useCase.execute({
      companyId: 1,
      dto: { name: 'Platform' },
    });

    expect(result).toBe(mockTeam);
    expect(service.createTeam).toHaveBeenCalledWith(1, { name: 'Platform' });
  });

  it('throws the error returned by the service', async () => {
    service.createTeam.mockResolvedValue(
      err(new ConflictException('Team slug already exists.')),
    );

    await expect(
      useCase.execute({ companyId: 1, dto: { name: 'Platform' } }),
    ).rejects.toThrow(ConflictException);
  });
});
