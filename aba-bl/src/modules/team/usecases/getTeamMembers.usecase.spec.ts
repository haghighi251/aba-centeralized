import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { UserRole } from '@aba/database';
import { GetTeamMembersUseCase } from './getTeamMembers.usecase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';
import { TeamMembershipWithUser } from '@/modules/team/repositories/teamMembership.repository';

describe('GetTeamMembersUseCase', () => {
  let useCase: GetTeamMembersUseCase;
  let service: jest.Mocked<TeamMembershipService>;

  const mockMembers: TeamMembershipWithUser[] = [
    {
      id: 1,
      userId: 10,
      teamId: 20,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      user: {
        id: 10,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        role: UserRole.BUSINESS_ADMIN,
      },
    } as TeamMembershipWithUser,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeamMembersUseCase,
        {
          provide: TeamMembershipService,
          useValue: { listMembers: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetTeamMembersUseCase);
    service = module.get(TeamMembershipService);
  });

  it('returns the member list on success', async () => {
    service.listMembers.mockResolvedValue(ok(mockMembers));

    const result = await useCase.execute({ companyId: 1, teamId: 20 });

    expect(result).toBe(mockMembers);
    expect(service.listMembers).toHaveBeenCalledWith(1, 20);
  });

  it('throws the error returned by the service', async () => {
    service.listMembers.mockResolvedValue(
      err(new NotFoundException('Team not found.')),
    );

    await expect(useCase.execute({ companyId: 1, teamId: 20 })).rejects.toThrow(
      NotFoundException,
    );
  });
});
