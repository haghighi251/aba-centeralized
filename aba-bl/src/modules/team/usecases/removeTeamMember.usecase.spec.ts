import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { TeamMembership } from '@aba/database';
import { RemoveTeamMemberUseCase } from './removeTeamMember.usecase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';

describe('RemoveTeamMemberUseCase', () => {
  let useCase: RemoveTeamMemberUseCase;
  let service: jest.Mocked<TeamMembershipService>;

  const mockMembership: TeamMembership = {
    id: 1,
    userId: 10,
    teamId: 20,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  } as TeamMembership;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveTeamMemberUseCase,
        {
          provide: TeamMembershipService,
          useValue: { removeMember: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(RemoveTeamMemberUseCase);
    service = module.get(TeamMembershipService);
  });

  it('returns the removed membership on success', async () => {
    service.removeMember.mockResolvedValue(ok(mockMembership));

    const result = await useCase.execute({
      companyId: 1,
      teamId: 20,
      userId: 10,
    });

    expect(result).toBe(mockMembership);
    expect(service.removeMember).toHaveBeenCalledWith(1, 20, 10);
  });

  it('throws the error returned by the service', async () => {
    service.removeMember.mockResolvedValue(
      err(new NotFoundException('Not a member.')),
    );

    await expect(
      useCase.execute({ companyId: 1, teamId: 20, userId: 10 }),
    ).rejects.toThrow(NotFoundException);
  });
});
