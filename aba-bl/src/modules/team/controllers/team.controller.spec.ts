import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Team, TeamStatus, UserRole } from '@aba/database';
import { TeamController } from './team.controller';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CreateTeamUseCase } from '@/modules/team/usecases/createTeam.usecase';
import { GetTeamsUseCase } from '@/modules/team/usecases/getTeams.usecase';
import { GetTeamByIdUseCase } from '@/modules/team/usecases/getTeamById.usecase';
import { UpdateTeamUseCase } from '@/modules/team/usecases/updateTeam.usecase';
import { DeleteTeamUseCase } from '@/modules/team/usecases/deleteTeam.usecase';
import { GetTeamMembersUseCase } from '@/modules/team/usecases/getTeamMembers.usecase';
import { AddTeamMemberUseCase } from '@/modules/team/usecases/addTeamMember.usecase';
import { RemoveTeamMemberUseCase } from '@/modules/team/usecases/removeTeamMember.usecase';
import { TeamMembershipWithUser } from '@/modules/team/repositories/teamMembership.repository';

describe('TeamController', () => {
  let controller: TeamController;
  let createTeamUseCase: jest.Mocked<CreateTeamUseCase>;
  let getTeamsUseCase: jest.Mocked<GetTeamsUseCase>;
  let getTeamByIdUseCase: jest.Mocked<GetTeamByIdUseCase>;
  let updateTeamUseCase: jest.Mocked<UpdateTeamUseCase>;
  let deleteTeamUseCase: jest.Mocked<DeleteTeamUseCase>;
  let getTeamMembersUseCase: jest.Mocked<GetTeamMembersUseCase>;
  let addTeamMemberUseCase: jest.Mocked<AddTeamMemberUseCase>;
  let removeTeamMemberUseCase: jest.Mocked<RemoveTeamMemberUseCase>;

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

  const mockMembership = {
    id: 1,
    userId: 10,
    teamId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        { provide: CreateTeamUseCase, useValue: { execute: jest.fn() } },
        { provide: GetTeamsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetTeamByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateTeamUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteTeamUseCase, useValue: { execute: jest.fn() } },
        { provide: GetTeamMembersUseCase, useValue: { execute: jest.fn() } },
        { provide: AddTeamMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: RemoveTeamMemberUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(TeamController);
    createTeamUseCase = module.get(CreateTeamUseCase);
    getTeamsUseCase = module.get(GetTeamsUseCase);
    getTeamByIdUseCase = module.get(GetTeamByIdUseCase);
    updateTeamUseCase = module.get(UpdateTeamUseCase);
    deleteTeamUseCase = module.get(DeleteTeamUseCase);
    getTeamMembersUseCase = module.get(GetTeamMembersUseCase);
    addTeamMemberUseCase = module.get(AddTeamMemberUseCase);
    removeTeamMemberUseCase = module.get(RemoveTeamMemberUseCase);
  });

  describe('getTeams', () => {
    it('returns the list of teams for the company', async () => {
      getTeamsUseCase.execute.mockResolvedValue({
        data: [mockTeam],
        total: 1,
      });

      const result = await controller.getTeams(1, {
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: { data: [mockTeam], total: 1 },
      });
      expect(getTeamsUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });
  });

  describe('getTeam', () => {
    it('returns the team when found', async () => {
      getTeamByIdUseCase.execute.mockResolvedValue(mockTeam);

      const result = await controller.getTeam(1, 1);

      expect(result).toEqual({ success: true, error: null, data: mockTeam });
      expect(getTeamByIdUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        teamId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getTeamByIdUseCase.execute.mockRejectedValue(
        new NotFoundException('Team not found.'),
      );

      await expect(controller.getTeam(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTeam', () => {
    it('creates and returns the new team', async () => {
      createTeamUseCase.execute.mockResolvedValue(mockTeam);

      const result = await controller.createTeam(1, { name: 'Platform' });

      expect(result).toEqual({ success: true, error: null, data: mockTeam });
      expect(createTeamUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        dto: { name: 'Platform' },
      });
    });

    it('propagates a ConflictException from the use case', async () => {
      createTeamUseCase.execute.mockRejectedValue(
        new ConflictException('slug taken'),
      );

      await expect(
        controller.createTeam(1, { name: 'Platform' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTeam', () => {
    it('updates and returns the team', async () => {
      const updated = { ...mockTeam, name: 'Platform EU' };
      updateTeamUseCase.execute.mockResolvedValue(updated);

      const result = await controller.updateTeam(1, 1, { name: 'Platform EU' });

      expect(result).toEqual({ success: true, error: null, data: updated });
      expect(updateTeamUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        teamId: 1,
        dto: { name: 'Platform EU' },
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      updateTeamUseCase.execute.mockRejectedValue(
        new NotFoundException('Team not found.'),
      );

      await expect(
        controller.updateTeam(1, 999, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTeam', () => {
    it('deletes and returns the team', async () => {
      deleteTeamUseCase.execute.mockResolvedValue(mockTeam);

      const result = await controller.deleteTeam(1, 1);

      expect(result).toEqual({ success: true, error: null, data: mockTeam });
      expect(deleteTeamUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        teamId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      deleteTeamUseCase.execute.mockRejectedValue(
        new NotFoundException('Team not found.'),
      );

      await expect(controller.deleteTeam(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTeamMembers', () => {
    it('returns the member list for the team', async () => {
      const members: TeamMembershipWithUser[] = [
        {
          ...mockMembership,
          user: {
            id: 10,
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            role: UserRole.BUSINESS_ADMIN,
          },
        } as TeamMembershipWithUser,
      ];
      getTeamMembersUseCase.execute.mockResolvedValue(members);

      const result = await controller.getTeamMembers(1, 1);

      expect(result).toEqual({ success: true, error: null, data: members });
      expect(getTeamMembersUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        teamId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getTeamMembersUseCase.execute.mockRejectedValue(
        new NotFoundException('Team not found.'),
      );

      await expect(controller.getTeamMembers(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTeamMember', () => {
    it('links the user and returns the membership', async () => {
      addTeamMemberUseCase.execute.mockResolvedValue(mockMembership as any);

      const result = await controller.addTeamMember(1, 1, { userId: 10 });

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockMembership,
      });
      expect(addTeamMemberUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        teamId: 1,
        dto: { userId: 10 },
      });
    });

    it('propagates a ConflictException from the use case', async () => {
      addTeamMemberUseCase.execute.mockRejectedValue(
        new ConflictException('Already a member.'),
      );

      await expect(
        controller.addTeamMember(1, 1, { userId: 10 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeTeamMember', () => {
    it('unlinks the user and returns the removed membership', async () => {
      removeTeamMemberUseCase.execute.mockResolvedValue(mockMembership as any);

      const result = await controller.removeTeamMember(1, 1, 10);

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockMembership,
      });
      expect(removeTeamMemberUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        teamId: 1,
        userId: 10,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      removeTeamMemberUseCase.execute.mockRejectedValue(
        new NotFoundException('Not a member.'),
      );

      await expect(controller.removeTeamMember(1, 1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
