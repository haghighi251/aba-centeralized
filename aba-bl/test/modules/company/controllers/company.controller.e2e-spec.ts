import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { CompanyManagementController } from '@/modules/company/controllers/company.controller';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  AllowAuthGuardMock,
  DenyAuthGuardMock,
} from '@test/__mocks__/auth/guards/auth.guard.mock';
import {
  createCompanyRepositoryMock,
  MockedCompanyRepository,
} from '@test/__mocks__/company/repositories/company.repository.mock';
import {
  createUserRepositoryMock,
  MockedUserRepository,
} from '@test/__mocks__/company/repositories/user.repository.mock';
import {
  createTeamRepositoryMock,
  MockedTeamRepository,
} from '@test/__mocks__/team/repositories/team.repository.mock';
import {
  createEnvironmentRepositoryMock,
  MockedEnvironmentRepository,
} from '@test/__mocks__/environment/repositories/environment.repository.mock';
import {
  mockCompany,
  mockOwnerUser,
  mockAdminUser,
  mockMemberUser,
  mockOwnerJwtPayload,
  mockAdminJwtPayload,
  mockMemberJwtPayload,
  mockOtherCompanyOwnerJwtPayload,
  validAddCompanyUserPayload,
} from '@test/__mocks__/company/fixtures/company.fixtures';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));

/**
 * E2E tests for every path under /company (CompanyManagementController).
 *
 * Nothing here touches PostgreSQL/Prisma: CompanyRepository and
 * UserRepository are fully mocked. AuthGuard's JwtService dependency is
 * mocked too. CompanyAccessGuard and CompanyManagerGuard run for real so
 * their permission logic is exercised end-to-end.
 */
describe('CompanyManagementController (e2e)', () => {
  let app: INestApplication;
  let mockCompanyRepository: MockedCompanyRepository;
  let mockUserRepository: MockedUserRepository;
  let mockTeamRepository: MockedTeamRepository;
  let mockEnvironmentRepository: MockedEnvironmentRepository;
  let mockTeamMembershipRepository: {
    findAllForUser: jest.Mock;
    create: jest.Mock;
    removeManyForUser: jest.Mock;
  };
  let mockServiceRepository: { countForCompany: jest.Mock };
  let mockJwtService: { verifyAsync: jest.Mock };

  async function buildApp(authGuard?: {
    canActivate: (...args: unknown[]) => unknown;
  }): Promise<INestApplication> {
    let builder = Test.createTestingModule({
      controllers: [CompanyManagementController],
      providers: [
        { provide: CompanyRepository, useValue: mockCompanyRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: TeamRepository, useValue: mockTeamRepository },
        { provide: EnvironmentRepository, useValue: mockEnvironmentRepository },
        {
          provide: TeamMembershipRepository,
          useValue: mockTeamMembershipRepository,
        },
        { provide: ServiceRepository, useValue: mockServiceRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    });

    if (authGuard) {
      builder = builder.overrideGuard(AuthGuard).useValue(authGuard);
    }

    const module: TestingModule = await builder.compile();
    const testApp = module.createNestApplication();
    testApp.useGlobalFilters(new GlobalExceptionFilter());
    await testApp.init();
    return testApp;
  }

  beforeEach(async () => {
    mockCompanyRepository = createCompanyRepositoryMock();
    mockUserRepository = createUserRepositoryMock();
    mockTeamRepository = createTeamRepositoryMock();
    mockEnvironmentRepository = createEnvironmentRepositoryMock();
    mockTeamMembershipRepository = {
      findAllForUser: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      removeManyForUser: jest.fn(),
    };
    mockServiceRepository = { countForCompany: jest.fn() };
    mockJwtService = { verifyAsync: jest.fn() };
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    app = await buildApp(new AllowAuthGuardMock(mockOwnerJwtPayload));
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /company/:id ─────────────────────────────────────────────────────

  describe('GET /company/:id', () => {
    it('returns 200 with the company when the caller belongs to it', async () => {
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);

      await request(app.getHttpServer())
        .get('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockCompany.id);
          expect(res.body.data.username).toBe(mockCompany.username);
        });

      expect(mockCompanyRepository.findById).toHaveBeenCalledWith(1);
    });

    it('returns 404 when the company does not exist', async () => {
      mockCompanyRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockCompanyRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 for a non-numeric id (guard rejects before the param is parsed)', async () => {
      await request(app.getHttpServer())
        .get('/company/abc')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockCompanyRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when the guard rejects the request', async () => {
      app = await buildApp(new DenyAuthGuardMock());

      await request(app.getHttpServer())
        .get('/company/1')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 401 with the real AuthGuard when no Authorization header is sent', async () => {
      app = await buildApp(); // no override -> real AuthGuard

      await request(app.getHttpServer())
        .get('/company/1')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockCompanyRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 404 for DELETE (method not allowed)', async () => {
      await request(app.getHttpServer())
        .delete('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── GET /company/:id/stats ────────────────────────────────────────────────

  describe('GET /company/:id/stats', () => {
    it('returns 200 with teams, environments and services counts', async () => {
      mockTeamRepository.countForCompany.mockResolvedValue(3);
      mockEnvironmentRepository.countForCompany.mockResolvedValue(7);
      mockServiceRepository.countForCompany.mockResolvedValue(5);

      await request(app.getHttpServer())
        .get('/company/1/stats')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            error: null,
            data: { teamsCount: 3, environmentsCount: 7, servicesCount: 5 },
          });
        });

      expect(mockTeamRepository.countForCompany).toHaveBeenCalledWith(1);
      expect(mockEnvironmentRepository.countForCompany).toHaveBeenCalledWith(1);
      expect(mockServiceRepository.countForCompany).toHaveBeenCalledWith(1);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get('/company/1/stats')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.countForCompany).not.toHaveBeenCalled();
      expect(mockEnvironmentRepository.countForCompany).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get('/company/1/stats')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockTeamRepository.countForCompany).not.toHaveBeenCalled();
    });
  });

  // ── PUT /company/:id ─────────────────────────────────────────────────────

  describe('PUT /company/:id', () => {
    const validUpdatePayload = { city: 'Gotham', address: '1 New Address' };

    it('returns 200 when a BUSINESS_OWNER updates their company', async () => {
      mockCompanyRepository.update.mockResolvedValue({
        ...mockCompany,
        ...validUpdatePayload,
      });

      await request(app.getHttpServer())
        .put('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.city).toBe('Gotham');
        });

      expect(mockCompanyRepository.update).toHaveBeenCalledWith(
        1,
        validUpdatePayload,
      );
    });

    it('returns 200 when a BUSINESS_ADMIN updates their company', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockCompanyRepository.update.mockResolvedValue({
        ...mockCompany,
        ...validUpdatePayload,
      });

      await request(app.getHttpServer())
        .put('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.OK);
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to update the company', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .put('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockCompanyRepository.update).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .put('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockCompanyRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when email is not a valid email address', async () => {
      await request(app.getHttpServer())
        .put('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ email: 'not-an-email' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockCompanyRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when website is not a valid URL', async () => {
      await request(app.getHttpServer())
        .put('/company/1')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ website: 'not-a-url' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockCompanyRepository.update).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .put('/company/1')
        .send(validUpdatePayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockCompanyRepository.update).not.toHaveBeenCalled();
    });
  });

  // ── GET /company/:id/users ───────────────────────────────────────────────

  describe('GET /company/:id/users', () => {
    it('returns 200 with sanitized users for a manager', async () => {
      mockUserRepository.findAllByCompany.mockResolvedValue([
        {
          ...mockOwnerUser,
          teamMemberships: [{ team: { id: 5, name: 'Platform' } }],
        },
        { ...mockMemberUser, teamMemberships: [] },
      ]);

      await request(app.getHttpServer())
        .get('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveLength(2);
          expect(res.body.data[0].teams).toEqual([{ id: 5, name: 'Platform' }]);
          expect(res.body.data[1].teams).toEqual([]);
          res.body.data.forEach((user: Record<string, unknown>) => {
            expect(user).not.toHaveProperty('teamMemberships');
          });
          res.body.data.forEach((user: Record<string, unknown>) => {
            expect(user).not.toHaveProperty('password');
            expect(user).not.toHaveProperty('resetToken');
            expect(user).not.toHaveProperty('resetTokenExpiry');
          });
        });

      expect(mockUserRepository.findAllByCompany).toHaveBeenCalledWith(1);
    });

    it('returns 200 with an empty list when the company has no users', async () => {
      mockUserRepository.findAllByCompany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({ success: true, error: null, data: [] });
        });
    });

    it('returns 200 when a BUSINESS_MEMBER requests the user list (read-only for any company member)', async () => {
      mockUserRepository.findAllByCompany.mockResolvedValue([]);
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .get('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK);

      expect(mockUserRepository.findAllByCompany).toHaveBeenCalledWith(1);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findAllByCompany).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get('/company/1/users')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockUserRepository.findAllByCompany).not.toHaveBeenCalled();
    });
  });

  // ── POST /company/:id/users ──────────────────────────────────────────────

  describe('POST /company/:id/users', () => {
    it('returns 201 when a BUSINESS_OWNER adds a BUSINESS_MEMBER', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.createInCompany.mockResolvedValue({
        ...mockMemberUser,
        email: validAddCompanyUserPayload.email,
      });

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validAddCompanyUserPayload)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe(validAddCompanyUserPayload.email);
          expect(res.body.data).not.toHaveProperty('password');
          expect(res.body.data).not.toHaveProperty('resetToken');
          expect(res.body.data).not.toHaveProperty('resetTokenExpiry');
        });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validAddCompanyUserPayload.email,
      );
      expect(mockUserRepository.createInCompany).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validAddCompanyUserPayload.email,
          role: 'BUSINESS_MEMBER',
          companyId: 1,
        }),
      );
    });

    it('returns 201 when a BUSINESS_OWNER adds a BUSINESS_ADMIN', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.createInCompany.mockResolvedValue({
        ...mockAdminUser,
        email: 'new.admin@acme.com',
      });

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send({
          ...validAddCompanyUserPayload,
          email: 'new.admin@acme.com',
          role: 'BUSINESS_ADMIN',
        })
        .expect(HttpStatus.CREATED);
    });

    it('returns 201 when a BUSINESS_ADMIN adds a BUSINESS_MEMBER', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.createInCompany.mockResolvedValue({
        ...mockMemberUser,
        email: validAddCompanyUserPayload.email,
      });

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validAddCompanyUserPayload)
        .expect(HttpStatus.CREATED);
    });

    it('returns 403 when a BUSINESS_ADMIN attempts to add a BUSINESS_ADMIN', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ ...validAddCompanyUserPayload, role: 'BUSINESS_ADMIN' })
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.createInCompany).not.toHaveBeenCalled();
    });

    it('returns 403 when a user with the given email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockMemberUser);

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validAddCompanyUserPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.createInCompany).not.toHaveBeenCalled();
    });

    it('returns 400 when email is not valid', async () => {
      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ ...validAddCompanyUserPayload, email: 'not-an-email' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ ...validAddCompanyUserPayload, password: 'short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns 400 when role is not BUSINESS_ADMIN or BUSINESS_MEMBER', async () => {
      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ ...validAddCompanyUserPayload, role: 'BUSINESS_OWNER' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to add a user', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validAddCompanyUserPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .post('/company/1/users')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validAddCompanyUserPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .post('/company/1/users')
        .send(validAddCompanyUserPayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  // ── PUT /company/:id/users/:userId ───────────────────────────────────────

  describe('PUT /company/:id/users/:userId', () => {
    it('returns 200 when a manager updates a user in their company', async () => {
      mockUserRepository.findById.mockResolvedValue(mockMemberUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockMemberUser,
        firstName: 'Updated',
      });

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ firstName: 'Updated' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.firstName).toBe('Updated');
          expect(res.body.data.teams).toEqual([]);
          expect(res.body.data).not.toHaveProperty('password');
          expect(res.body.data).not.toHaveProperty('resetToken');
          expect(res.body.data).not.toHaveProperty('resetTokenExpiry');
        });

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockMemberUser.id,
        { firstName: 'Updated' },
      );
    });

    it('returns 200 when a BUSINESS_OWNER promotes a member to BUSINESS_ADMIN', async () => {
      mockUserRepository.findById.mockResolvedValue(mockMemberUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockMemberUser,
        role: 'BUSINESS_ADMIN',
      });

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ role: 'BUSINESS_ADMIN' })
        .expect(HttpStatus.OK);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockMemberUser.id,
        { role: 'BUSINESS_ADMIN' },
      );
    });

    it('returns 404 when the target user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/company/1/users/999')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ firstName: 'X' })
        .expect(HttpStatus.NOT_FOUND);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the target user belongs to a different company', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockMemberUser,
        companyId: 2,
      });

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ firstName: 'X' })
        .expect(HttpStatus.NOT_FOUND);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_ADMIN tries to modify a BUSINESS_OWNER', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockUserRepository.findById.mockResolvedValue(mockOwnerUser);

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockOwnerUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ firstName: 'X' })
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_ADMIN tries to assign the BUSINESS_ADMIN role', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockUserRepository.findById.mockResolvedValue(mockMemberUser);

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ role: 'BUSINESS_ADMIN' })
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when the payload contains an invalid role', async () => {
      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ role: 'BUSINESS_OWNER' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to update a user', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ firstName: 'X' })
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ firstName: 'X' })
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .put(`/company/1/users/${mockMemberUser.id}`)
        .send({ firstName: 'X' })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── DELETE /company/:id/users/:userId ────────────────────────────────────

  describe('DELETE /company/:id/users/:userId', () => {
    it('returns 200 when a manager removes a member', async () => {
      mockUserRepository.findById.mockResolvedValue(mockMemberUser);
      mockUserRepository.delete.mockResolvedValue(mockMemberUser);

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({ success: true, error: null, data: null });
        });

      expect(mockUserRepository.delete).toHaveBeenCalledWith(mockMemberUser.id);
    });

    it('returns 404 when the target user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/company/1/users/999')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when the target user belongs to a different company', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockMemberUser,
        companyId: 2,
      });

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller tries to remove themselves', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockMemberUser,
        id: mockOwnerUser.id,
      });

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockOwnerUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_ADMIN tries to remove a BUSINESS_OWNER', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockUserRepository.findById.mockResolvedValue(mockOwnerUser);

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockOwnerUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_ADMIN tries to remove another BUSINESS_ADMIN', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockUserRepository.findById.mockResolvedValue({
        ...mockAdminUser,
        id: 50,
      });

      await request(app.getHttpServer())
        .delete('/company/1/users/50')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to remove a user', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockOwnerUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockMemberUser.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .delete(`/company/1/users/${mockMemberUser.id}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });
});
