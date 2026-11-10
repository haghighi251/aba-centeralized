import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  Team,
  TeamMembership,
  TeamStatus,
  User,
  UserRole,
  UserStatus,
} from '@aba/database';
import { TeamMembershipService } from './teamMembership.service';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';

describe('TeamMembershipService', () => {
  let service: TeamMembershipService;
  let teamRepository: jest.Mocked<TeamRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let teamMembershipRepository: jest.Mocked<TeamMembershipRepository>;

  const mockTeam: Team = {
    id: 20,
    name: 'Platform',
    slug: 'platform',
    description: null,
    status: TeamStatus.ACTIVE,
    companyId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Team;

  const mockUser: User = {
    id: 10,
    companyId: 1,
    role: UserRole.BUSINESS_ADMIN,
    status: UserStatus.ACTIVE,
  } as User;

  const mockMembership: TeamMembership = {
    id: 1,
    userId: 10,
    teamId: 20,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  } as TeamMembership;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMembershipService,
        { provide: TeamRepository, useValue: { findById: jest.fn() } },
        { provide: UserRepository, useValue: { findById: jest.fn() } },
        {
          provide: TeamMembershipRepository,
          useValue: {
            findByUserAndTeam: jest.fn(),
            create: jest.fn(),
            findAllForTeam: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TeamMembershipService);
    teamRepository = module.get(TeamRepository);
    userRepository = module.get(UserRepository);
    teamMembershipRepository = module.get(TeamMembershipRepository);
  });

  describe('addMember', () => {
    it('links the user to the team when both belong to the company', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      userRepository.findById.mockResolvedValue(mockUser);
      teamMembershipRepository.findByUserAndTeam.mockResolvedValue(null);
      teamMembershipRepository.create.mockResolvedValue(mockMembership);

      const result = await service.addMember(1, 20, 10);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockMembership);
      }
      expect(teamMembershipRepository.create).toHaveBeenCalledWith({
        user: { connect: { id: 10 } },
        team: { connect: { id: 20 } },
      });
    });

    it('returns NotFoundException when the team does not belong to the company', async () => {
      teamRepository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.addMember(1, 20, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(teamMembershipRepository.create).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the user does not belong to the company', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      userRepository.findById.mockResolvedValue({ ...mockUser, companyId: 2 });

      const result = await service.addMember(1, 20, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(teamMembershipRepository.create).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the user does not exist', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      userRepository.findById.mockResolvedValue(null);

      const result = await service.addMember(1, 20, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });

    it('returns ConflictException when already a member', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      userRepository.findById.mockResolvedValue(mockUser);
      teamMembershipRepository.findByUserAndTeam.mockResolvedValue(
        mockMembership,
      );

      const result = await service.addMember(1, 20, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(teamMembershipRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('removes the membership when it exists', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      teamMembershipRepository.findByUserAndTeam.mockResolvedValue(
        mockMembership,
      );
      teamMembershipRepository.delete.mockResolvedValue(mockMembership);

      const result = await service.removeMember(1, 20, 10);

      expect(result.isOk()).toBe(true);
      expect(teamMembershipRepository.delete).toHaveBeenCalledWith(1);
    });

    it('returns NotFoundException when the team does not belong to the company', async () => {
      teamRepository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.removeMember(1, 20, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(teamMembershipRepository.delete).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the user is not a member', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      teamMembershipRepository.findByUserAndTeam.mockResolvedValue(null);

      const result = await service.removeMember(1, 20, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(teamMembershipRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('listMembers', () => {
    it('returns members for a team belonging to the company', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      const withUser = [{ ...mockMembership, user: mockUser }];
      teamMembershipRepository.findAllForTeam.mockResolvedValue(
        withUser as any,
      );

      const result = await service.listMembers(1, 20);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(withUser);
      }
    });

    it('returns NotFoundException when the team does not belong to the company', async () => {
      teamRepository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.listMembers(1, 20);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });
});
