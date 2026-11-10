import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { Team, TeamStatus } from '@aba/database';
import { UpdateTeamUseCase } from './updateTeam.usecase';
import { TeamService } from '@/modules/team/services/team.service';

describe('UpdateTeamUseCase', () => {
  let useCase: UpdateTeamUseCase;
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
        UpdateTeamUseCase,
        {
          provide: TeamService,
          useValue: { updateTeam: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateTeamUseCase);
    service = module.get(TeamService);
  });

  it('returns the updated team on success', async () => {
    const updated = { ...mockTeam, name: 'Platform EU' };
    service.updateTeam.mockResolvedValue(ok(updated));

    const result = await useCase.execute({
      companyId: 1,
      teamId: 1,
      dto: { name: 'Platform EU' },
    });

    expect(result).toBe(updated);
    expect(service.updateTeam).toHaveBeenCalledWith(1, 1, {
      name: 'Platform EU',
    });
  });

  it('throws NotFoundException when the service reports it', async () => {
    service.updateTeam.mockResolvedValue(
      err(new NotFoundException('Team not found.')),
    );

    await expect(
      useCase.execute({ companyId: 1, teamId: 999, dto: { name: 'X' } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the service reports a slug collision', async () => {
    service.updateTeam.mockResolvedValue(
      err(new ConflictException('slug taken')),
    );

    await expect(
      useCase.execute({ companyId: 1, teamId: 1, dto: { slug: 'taken' } }),
    ).rejects.toThrow(ConflictException);
  });
});
