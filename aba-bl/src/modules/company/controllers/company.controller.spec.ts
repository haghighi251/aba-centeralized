import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CompanyManagementController } from './company.controller';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import {
  Company,
  CompanyStatus,
  User,
  UserRole,
  UserStatus,
} from '@aba/database';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('CompanyManagementController', () => {
  let controller: CompanyManagementController;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let teamRepository: jest.Mocked<TeamRepository>;
  let teamMembershipRepository: jest.Mocked<TeamMembershipRepository>;
  let environmentRepository: jest.Mocked<EnvironmentRepository>;

  const mockCompany: Company = {
    id: 1,
    username: 'acme',
    email: 'acme@example.com',
    address: '123 Main St',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    website: 'https://acme.com',
    status: CompanyStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Company;

  const baseUser: User = {
    id: 10,
    email: 'member@example.com',
    password: 'hashed-password',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    avatar: null,
    role: UserRole.BUSINESS_MEMBER,
    status: UserStatus.ACTIVE,
    lastLogin: null,
    resetToken: 'some-reset-token',
    resetTokenExpiry: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1,
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyManagementController],
      providers: [
        {
          provide: CompanyRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findAllByCompany: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createInCompany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TeamRepository,
          useValue: {
            countForCompany: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: TeamMembershipRepository,
          useValue: {
            create: jest.fn(),
            findAllForUser: jest.fn().mockResolvedValue([]),
            removeManyForUser: jest.fn(),
          },
        },
        {
          provide: EnvironmentRepository,
          useValue: {
            countForCompany: jest.fn(),
          },
        },
        {
          provide: ServiceRepository,
          useValue: {
            countForCompany: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(CompanyManagementController);
    companyRepository = module.get(CompanyRepository);
    userRepository = module.get(UserRepository);
    teamRepository = module.get(TeamRepository);
    teamMembershipRepository = module.get(TeamMembershipRepository);
    environmentRepository = module.get(EnvironmentRepository);
  });

  describe('getCompany', () => {
    it('returns the company when it exists', async () => {
      companyRepository.findById.mockResolvedValue(mockCompany);

      const result = await controller.getCompany(1);

      expect(result).toEqual({ success: true, error: null, data: mockCompany });
      expect(companyRepository.findById).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when the company does not exist', async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(controller.getCompany(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCompanyStats', () => {
    it('returns teams and environments counts for the company', async () => {
      teamRepository.countForCompany.mockResolvedValue(3);
      environmentRepository.countForCompany.mockResolvedValue(7);

      const result = await controller.getCompanyStats(1);

      expect(teamRepository.countForCompany).toHaveBeenCalledWith(1);
      expect(environmentRepository.countForCompany).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        success: true,
        error: null,
        data: { teamsCount: 3, environmentsCount: 7 },
      });
    });

    it('returns zero counts when the company has no teams or environments', async () => {
      teamRepository.countForCompany.mockResolvedValue(0);
      environmentRepository.countForCompany.mockResolvedValue(0);

      const result = await controller.getCompanyStats(1);

      expect(result).toEqual({
        success: true,
        error: null,
        data: { teamsCount: 0, environmentsCount: 0 },
      });
    });
  });

  describe('updateCompany', () => {
    it('updates the company and returns the updated record', async () => {
      const updated = { ...mockCompany, city: 'Gotham' };
      companyRepository.update.mockResolvedValue(updated);

      const result = await controller.updateCompany(1, { city: 'Gotham' });

      expect(result).toEqual({ success: true, error: null, data: updated });
      expect(companyRepository.update).toHaveBeenCalledWith(1, {
        city: 'Gotham',
      });
    });
  });

  describe('getUsers', () => {
    it('returns company users with sensitive fields stripped', async () => {
      userRepository.findAllByCompany.mockResolvedValue([
        { ...baseUser, teamMemberships: [] },
      ]);

      const result = await controller.getUsers(1);

      expect(userRepository.findAllByCompany).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.data[0]).not.toHaveProperty('resetToken');
      expect(result.data[0]).not.toHaveProperty('resetTokenExpiry');
      expect(result.data[0]).toMatchObject({
        id: baseUser.id,
        email: baseUser.email,
      });
    });

    it('returns an empty list when the company has no users', async () => {
      userRepository.findAllByCompany.mockResolvedValue([]);

      const result = await controller.getUsers(1);

      expect(result).toEqual({ success: true, error: null, data: [] });
    });

    it("flattens each user's team memberships into a teams array", async () => {
      userRepository.findAllByCompany.mockResolvedValue([
        {
          ...baseUser,
          teamMemberships: [
            { team: { id: 5, name: 'Engineering' } },
            { team: { id: 6, name: 'Ops' } },
          ],
        },
      ]);

      const result = await controller.getUsers(1);

      expect(result.data[0]).toMatchObject({
        teams: [
          { id: 5, name: 'Engineering' },
          { id: 6, name: 'Ops' },
        ],
      });
      expect(result.data[0]).not.toHaveProperty('teamMemberships');
    });
  });

  describe('addUser', () => {
    const addDto = {
      email: 'new.user@example.com',
      role: 'BUSINESS_MEMBER' as const,
      password: 'StrongPass123',
    };
    const req = { user: { role: 'BUSINESS_OWNER', sub: 1, companyId: 1 } };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    });

    it('creates a new user and strips sensitive fields from the response', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const createdUser: User = {
        ...baseUser,
        email: addDto.email,
        role: UserRole.BUSINESS_MEMBER,
      };
      userRepository.createInCompany.mockResolvedValue(createdUser);

      const result = await controller.addUser(1, addDto as any, req);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(addDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(addDto.password, 10);
      expect(userRepository.createInCompany).toHaveBeenCalledWith({
        email: addDto.email,
        password: 'hashed-password',
        firstName: null,
        lastName: null,
        role: addDto.role,
        companyId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('password');
      expect(result.data).not.toHaveProperty('resetToken');
      expect(result.data).not.toHaveProperty('resetTokenExpiry');
    });

    it('passes through provided firstName and lastName', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.createInCompany.mockResolvedValue(baseUser);

      const dtoWithNames = {
        ...addDto,
        firstName: 'John',
        lastName: 'Smith',
      };

      await controller.addUser(1, dtoWithNames as any, req);

      expect(userRepository.createInCompany).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'John', lastName: 'Smith' }),
      );
    });

    it('throws ForbiddenException when a BUSINESS_ADMIN tries to add another BUSINESS_ADMIN', async () => {
      const adminReq = {
        user: { role: 'BUSINESS_ADMIN', sub: 1, companyId: 1 },
      };
      const dto = { ...addDto, role: 'BUSINESS_ADMIN' as const };

      await expect(controller.addUser(1, dto as any, adminReq)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a user with the email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser);

      await expect(controller.addUser(1, addDto as any, req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.createInCompany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the payload fails Zod validation', async () => {
      const invalidDto = { ...addDto, email: 'not-an-email' };

      await expect(
        controller.addUser(1, invalidDto as any, req),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('links the new user to the provided teamIds and returns them', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.createInCompany.mockResolvedValue(baseUser);
      teamRepository.findById.mockImplementation(async (teamId) =>
        ({ id: Number(teamId), name: `Team ${teamId}`, companyId: 1 } as any),
      );

      const dtoWithTeams = { ...addDto, teamIds: [5, 6] };
      const result = await controller.addUser(1, dtoWithTeams as any, req);

      expect(teamRepository.findById).toHaveBeenCalledWith(5);
      expect(teamRepository.findById).toHaveBeenCalledWith(6);
      expect(teamMembershipRepository.create).toHaveBeenCalledTimes(2);
      expect(teamMembershipRepository.create).toHaveBeenCalledWith({
        user: { connect: { id: baseUser.id } },
        team: { connect: { id: 5 } },
      });
      expect(result.data).toMatchObject({
        teams: [
          { id: 5, name: 'Team 5' },
          { id: 6, name: 'Team 6' },
        ],
      });
    });

    it('throws NotFoundException and creates no user when a teamId does not belong to the company', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      teamRepository.findById.mockResolvedValue(null);

      const dtoWithBadTeam = { ...addDto, teamIds: [999] };

      await expect(
        controller.addUser(1, dtoWithBadTeam as any, req),
      ).rejects.toThrow(NotFoundException);
      expect(userRepository.createInCompany).not.toHaveBeenCalled();
      expect(teamMembershipRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const req = { user: { role: 'BUSINESS_OWNER', sub: 1, companyId: 1 } };

    it('updates a user belonging to the company', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      const updatedUser = {
        ...baseUser,
        firstName: 'Updated',
        role: UserRole.BUSINESS_ADMIN,
      };
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(
        1,
        baseUser.id,
        { firstName: 'Updated', role: 'BUSINESS_ADMIN' },
        req,
      );

      expect(userRepository.update).toHaveBeenCalledWith(baseUser.id, {
        firstName: 'Updated',
        role: 'BUSINESS_ADMIN',
      });
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('password');
      expect(result.data).not.toHaveProperty('resetToken');
      expect(result.data).not.toHaveProperty('resetTokenExpiry');
    });

    it('only forwards fields that are present in the dto', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockResolvedValue(baseUser);

      await controller.updateUser(1, baseUser.id, { lastName: 'NewLast' }, req);

      expect(userRepository.update).toHaveBeenCalledWith(baseUser.id, {
        lastName: 'NewLast',
      });
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        controller.updateUser(1, 999, { firstName: 'X' }, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the target user belongs to another company', async () => {
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        companyId: 2,
      });

      await expect(
        controller.updateUser(1, baseUser.id, { firstName: 'X' }, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when trying to change a BUSINESS_OWNER target\'s role, even as the caller BUSINESS_OWNER', async () => {
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        role: UserRole.BUSINESS_OWNER,
      });

      await expect(
        controller.updateUser(1, baseUser.id, { role: 'BUSINESS_MEMBER' }, req),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('allows non-role fields (e.g. firstName) to be updated for a BUSINESS_OWNER target', async () => {
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        role: UserRole.BUSINESS_OWNER,
      });
      userRepository.update.mockResolvedValue({
        ...baseUser,
        role: UserRole.BUSINESS_OWNER,
        firstName: 'Updated',
      });

      const result = await controller.updateUser(
        1,
        baseUser.id,
        { firstName: 'Updated' },
        req,
      );

      expect(userRepository.update).toHaveBeenCalledWith(baseUser.id, {
        firstName: 'Updated',
      });
      expect(result.data).toMatchObject({ role: UserRole.BUSINESS_OWNER });
    });

    it('throws ForbiddenException when a BUSINESS_ADMIN tries to modify a BUSINESS_OWNER', async () => {
      const adminReq = {
        user: { role: 'BUSINESS_ADMIN', sub: 1, companyId: 1 },
      };
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        role: UserRole.BUSINESS_OWNER,
      });

      await expect(
        controller.updateUser(1, baseUser.id, { firstName: 'X' }, adminReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when a BUSINESS_ADMIN tries to assign the BUSINESS_ADMIN role', async () => {
      const adminReq = {
        user: { role: 'BUSINESS_ADMIN', sub: 1, companyId: 1 },
      };
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        role: UserRole.BUSINESS_MEMBER,
      });

      await expect(
        controller.updateUser(
          1,
          baseUser.id,
          { role: 'BUSINESS_ADMIN' },
          adminReq,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the payload fails Zod validation', async () => {
      await expect(
        controller.updateUser(
          1,
          baseUser.id,
          { role: 'BUSINESS_OWNER' } as any,
          req,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('adds and removes team links to match the provided teamIds', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockResolvedValue(baseUser);
      teamMembershipRepository.findAllForUser.mockResolvedValue([
        { teamId: 1, team: { id: 1, name: 'Team 1' } } as any,
        { teamId: 2, team: { id: 2, name: 'Team 2' } } as any,
      ]);
      teamRepository.findById.mockImplementation(async (teamId) =>
        ({ id: Number(teamId), name: `Team ${teamId}`, companyId: 1 } as any),
      );

      const result = await controller.updateUser(
        1,
        baseUser.id,
        { teamIds: [2, 3] },
        req,
      );

      expect(teamMembershipRepository.create).toHaveBeenCalledTimes(1);
      expect(teamMembershipRepository.create).toHaveBeenCalledWith({
        user: { connect: { id: baseUser.id } },
        team: { connect: { id: 3 } },
      });
      expect(teamMembershipRepository.removeManyForUser).toHaveBeenCalledWith(
        baseUser.id,
        [1],
      );
      expect(result.data).toMatchObject({
        teams: [
          { id: 2, name: 'Team 2' },
          { id: 3, name: 'Team 3' },
        ],
      });
    });

    it("leaves team links unchanged when teamIds is not provided", async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockResolvedValue(baseUser);
      teamMembershipRepository.findAllForUser.mockResolvedValue([
        { teamId: 5, team: { id: 5, name: 'Engineering' } } as any,
      ]);

      const result = await controller.updateUser(
        1,
        baseUser.id,
        { firstName: 'Updated' },
        req,
      );

      expect(teamMembershipRepository.create).not.toHaveBeenCalled();
      expect(teamMembershipRepository.removeManyForUser).not.toHaveBeenCalled();
      expect(result.data).toMatchObject({
        teams: [{ id: 5, name: 'Engineering' }],
      });
    });

    it('throws NotFoundException when a teamId in teamIds does not belong to the company', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      teamMembershipRepository.findAllForUser.mockResolvedValue([]);
      teamRepository.findById.mockResolvedValue(null);

      await expect(
        controller.updateUser(1, baseUser.id, { teamIds: [999] }, req),
      ).rejects.toThrow(NotFoundException);
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('removeUser', () => {
    const req = { user: { role: 'BUSINESS_OWNER', sub: 1, companyId: 1 } };

    it('removes a user belonging to the company', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.delete.mockResolvedValue(baseUser);

      const result = await controller.removeUser(1, baseUser.id, req);

      expect(userRepository.delete).toHaveBeenCalledWith(baseUser.id);
      expect(result).toEqual({ success: true, error: null, data: null });
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(controller.removeUser(1, 999, req)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the target user belongs to another company', async () => {
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        companyId: 2,
      });

      await expect(controller.removeUser(1, baseUser.id, req)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the caller tries to remove themselves', async () => {
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        id: req.user.sub,
      });

      await expect(controller.removeUser(1, req.user.sub, req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a BUSINESS_ADMIN tries to remove a BUSINESS_OWNER', async () => {
      const adminReq = {
        user: { role: 'BUSINESS_ADMIN', sub: 1, companyId: 1 },
      };
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        id: 20,
        role: UserRole.BUSINESS_OWNER,
      });

      await expect(controller.removeUser(1, 20, adminReq)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a BUSINESS_ADMIN tries to remove another BUSINESS_ADMIN', async () => {
      const adminReq = {
        user: { role: 'BUSINESS_ADMIN', sub: 1, companyId: 1 },
      };
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        id: 20,
        role: UserRole.BUSINESS_ADMIN,
      });

      await expect(controller.removeUser(1, 20, adminReq)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepository.delete).not.toHaveBeenCalled();
    });
  });
});
