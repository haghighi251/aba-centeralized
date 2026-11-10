import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { TeamMembership } from '@aba/database';
import { AddTeamMemberUseCase } from './addTeamMember.usecase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';

describe('AddTeamMemberUseCase', () => {
  let useCase: AddTeamMemberUseCase;
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
        AddTeamMemberUseCase,
        { provide: TeamMembershipService, useValue: { addMember: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(AddTeamMemberUseCase);
    service = module.get(TeamMembershipService);
  });

  it('returns the created membership on success', async () => {
    service.addMember.mockResolvedValue(ok(mockMembership));

    const result = await useCase.execute({
      companyId: 1,
      teamId: 20,
      dto: { userId: 10 },
    });

    expect(result).toBe(mockMembership);
    expect(service.addMember).toHaveBeenCalledWith(1, 20, 10);
  });

  it('throws the error returned by the service', async () => {
    service.addMember.mockResolvedValue(
      err(new ConflictException('Already a member.')),
    );

    await expect(
      useCase.execute({ companyId: 1, teamId: 20, dto: { userId: 10 } }),
    ).rejects.toThrow(ConflictException);
  });
});
