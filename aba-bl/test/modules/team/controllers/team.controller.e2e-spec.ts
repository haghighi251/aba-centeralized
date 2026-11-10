import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { TeamStatus } from '@aba/database';
import { TeamController } from '@/modules/team/controllers/team.controller';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { TeamService } from '@/modules/team/services/team.service';
import { CreateTeamUseCase } from '@/modules/team/usecases/createTeam.usecase';
import { GetTeamsUseCase } from '@/modules/team/usecases/getTeams.usecase';
import { GetTeamByIdUseCase } from '@/modules/team/usecases/getTeamById.usecase';
import { UpdateTeamUseCase } from '@/modules/team/usecases/updateTeam.usecase';
import { DeleteTeamUseCase } from '@/modules/team/usecases/deleteTeam.usecase';
import { GetTeamMembersUseCase } from '@/modules/team/usecases/getTeamMembers.usecase';
import { AddTeamMemberUseCase } from '@/modules/team/usecases/addTeamMember.usecase';
import { RemoveTeamMemberUseCase } from '@/modules/team/usecases/removeTeamMember.usecase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  AllowAuthGuardMock,
  DenyAuthGuardMock,
} from '@test/__mocks__/auth/guards/auth.guard.mock';
import {
  createTeamRepositoryMock,
  MockedTeamRepository,
} from '@test/__mocks__/team/repositories/team.repository.mock';
import {
  mockTeam,
  mockGrowthTeam,
  mockOtherCompanyTeam,
  validCreateTeamPayload,
} from '@test/__mocks__/team/fixtures/team.fixtures';
import {
  mockOwnerJwtPayload,
  mockAdminJwtPayload,
  mockMemberJwtPayload,
  mockOtherCompanyOwnerJwtPayload,
} from '@test/__mocks__/company/fixtures/company.fixtures';

/**
 * E2E tests for every path under /company/:id/teams
 * (TeamController).
 *
 * Nothing here touches PostgreSQL/Prisma: TeamRepository is fully
 * mocked. TeamService and all use cases run for real, as do
 * CompanyAccessGuard and CompanyManagerGuard, so the permission and
 * business-logic wiring is exercised end-to-end.
 */
describe('TeamController (e2e)', () => {
  let app: INestApplication;
  let mockTeamRepository: MockedTeamRepository;
  let mockJwtService: { verifyAsync: jest.Mock };

  async function buildApp(authGuard?: {
    canActivate: (...args: unknown[]) => unknown;
  }): Promise<INestApplication> {
    let builder = Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        TeamService,
        CreateTeamUseCase,
        GetTeamsUseCase,
        GetTeamByIdUseCase,
        UpdateTeamUseCase,
        DeleteTeamUseCase,
        TeamMembershipService,
        GetTeamMembersUseCase,
        AddTeamMemberUseCase,
        RemoveTeamMemberUseCase,
        { provide: TeamRepository, useValue: mockTeamRepository },
        { provide: UserRepository, useValue: {} },
        { provide: TeamMembershipRepository, useValue: {} },
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
    mockTeamRepository = createTeamRepositoryMock();
    mockJwtService = { verifyAsync: jest.fn() };

    app = await buildApp(new AllowAuthGuardMock(mockOwnerJwtPayload));
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /company/:id/teams ───────────────────────────────────────────────

  describe('GET /company/:id/teams', () => {
    it('returns 200 with the list of teams for a company member', async () => {
      mockTeamRepository.findAllForCompany.mockResolvedValue({
        data: [mockTeam, mockGrowthTeam],
        total: 2,
      });

      await request(app.getHttpServer())
        .get('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.total).toBe(2);
          expect(res.body.data.data).toHaveLength(2);
        });

      expect(mockTeamRepository.findAllForCompany).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      );
    });

    it('returns 200 with an empty list when the company has no teams', async () => {
      mockTeamRepository.findAllForCompany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            error: null,
            data: { data: [], total: 0 },
          });
        });
    });

    it('passes search/status/sort query params to the repository', async () => {
      mockTeamRepository.findAllForCompany.mockResolvedValue({
        data: [mockGrowthTeam],
        total: 1,
      });

      await request(app.getHttpServer())
        .get('/company/1/teams')
        .query({
          search: 'growth',
          status: 'ACTIVE',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK);

      expect(mockTeamRepository.findAllForCompany).toHaveBeenCalledWith({
        companyId: 1,
        search: 'growth',
        status: TeamStatus.ACTIVE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('returns 400 for an invalid status filter', async () => {
      await request(app.getHttpServer())
        .get('/company/1/teams')
        .query({ status: 'NOT_A_STATUS' })
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockTeamRepository.findAllForCompany).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.findAllForCompany).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get('/company/1/teams')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockTeamRepository.findAllForCompany).not.toHaveBeenCalled();
    });

    it('returns 401 when the guard rejects the request', async () => {
      app = await buildApp(new DenyAuthGuardMock());

      await request(app.getHttpServer())
        .get('/company/1/teams')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ── GET /company/:id/teams/:teamId ───────────────────────────────────────

  describe('GET /company/:id/teams/:teamId', () => {
    it('returns 200 with the team when found', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);

      await request(app.getHttpServer())
        .get(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockTeam.id);
          expect(res.body.data.slug).toBe(mockTeam.slug);
        });

      expect(mockTeamRepository.findById).toHaveBeenCalledWith(mockTeam.id);
    });

    it('returns 404 when the team does not exist', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/company/1/teams/999')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when the team belongs to a different company', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockOtherCompanyTeam);

      await request(app.getHttpServer())
        .get(`/company/1/teams/${mockOtherCompanyTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get(`/company/1/teams/${mockTeam.id}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── POST /company/:id/teams ──────────────────────────────────────────────

  describe('POST /company/:id/teams', () => {
    it('returns 201 when a BUSINESS_OWNER creates a new team', async () => {
      mockTeamRepository.findByCompanyAndSlug.mockResolvedValue(null);
      mockTeamRepository.findByCompanyAndName.mockResolvedValue(null);
      mockTeamRepository.create.mockResolvedValue({
        ...mockTeam,
        id: 5,
        name: validCreateTeamPayload.name,
        slug: 'platform',
      });

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateTeamPayload)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(validCreateTeamPayload.name);
          expect(res.body.data.slug).toBe('platform');
        });

      expect(mockTeamRepository.findByCompanyAndSlug).toHaveBeenCalledWith(
        1,
        'platform',
      );
      expect(mockTeamRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validCreateTeamPayload.name,
          slug: 'platform',
          company: { connect: { id: 1 } },
        }),
      );
    });

    it('derives the slug from the name when omitted', async () => {
      mockTeamRepository.findByCompanyAndSlug.mockResolvedValue(null);
      mockTeamRepository.findByCompanyAndName.mockResolvedValue(null);
      mockTeamRepository.create.mockResolvedValue({
        ...mockTeam,
        id: 6,
        name: 'My New Team',
        slug: 'my-new-team',
      });

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ name: 'My New Team' })
        .expect(HttpStatus.CREATED);

      expect(mockTeamRepository.findByCompanyAndSlug).toHaveBeenCalledWith(
        1,
        'my-new-team',
      );
      expect(mockTeamRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'my-new-team' }),
      );
    });

    it('returns 201 when a BUSINESS_ADMIN creates a new team', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockTeamRepository.findByCompanyAndSlug.mockResolvedValue(null);
      mockTeamRepository.findByCompanyAndName.mockResolvedValue(null);
      mockTeamRepository.create.mockResolvedValue(mockTeam);

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateTeamPayload)
        .expect(HttpStatus.CREATED);
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to create a team', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateTeamPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateTeamPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid slug format', async () => {
      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ name: 'Platform', slug: 'Not Valid Slug!' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
    });

    it('returns 409 when a team with the same slug already exists', async () => {
      mockTeamRepository.findByCompanyAndSlug.mockResolvedValue(mockTeam);

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ name: 'Platform' })
        .expect(HttpStatus.CONFLICT);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .post('/company/1/teams')
        .send(validCreateTeamPayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
    });
  });

  // ── PUT /company/:id/teams/:teamId ───────────────────────────────────────

  describe('PUT /company/:id/teams/:teamId', () => {
    const validUpdatePayload = { name: 'Platform EU' };

    it('returns 200 when a BUSINESS_OWNER updates a team', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.findByCompanyAndName.mockResolvedValue(null);
      mockTeamRepository.update.mockResolvedValue({
        ...mockTeam,
        ...validUpdatePayload,
      });

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Platform EU');
        });

      expect(mockTeamRepository.update).toHaveBeenCalledWith(
        mockTeam.id,
        validUpdatePayload,
      );
    });

    it('returns 200 when a BUSINESS_ADMIN updates a team', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.findByCompanyAndName.mockResolvedValue(null);
      mockTeamRepository.update.mockResolvedValue({
        ...mockTeam,
        ...validUpdatePayload,
      });

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.OK);
    });

    it('allows changing the slug when it does not collide', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.findByCompanyAndSlug.mockResolvedValue(null);
      mockTeamRepository.update.mockResolvedValue({
        ...mockTeam,
        slug: 'platform-eu',
      });

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ slug: 'platform-eu' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.slug).toBe('platform-eu');
        });

      expect(mockTeamRepository.findByCompanyAndSlug).toHaveBeenCalledWith(
        1,
        'platform-eu',
      );
    });

    it('returns 409 when changing the slug collides with another team', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.findByCompanyAndSlug.mockResolvedValue(mockGrowthTeam);

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ slug: 'growth' })
        .expect(HttpStatus.CONFLICT);

      expect(mockTeamRepository.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the team does not exist', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/company/1/teams/999')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockTeamRepository.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the team belongs to a different company', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockOtherCompanyTeam);

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockOtherCompanyTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockTeamRepository.update).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to update a team', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid status value', async () => {
      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ status: 'NOT_A_STATUS' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .put(`/company/1/teams/${mockTeam.id}`)
        .send(validUpdatePayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── DELETE /company/:id/teams/:teamId ────────────────────────────────────

  describe('DELETE /company/:id/teams/:teamId', () => {
    it('returns 200 when a BUSINESS_OWNER deletes a team', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.delete.mockResolvedValue(mockTeam);

      await request(app.getHttpServer())
        .delete(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockTeam.id);
        });

      expect(mockTeamRepository.delete).toHaveBeenCalledWith(mockTeam.id);
    });

    it('returns 200 when a BUSINESS_ADMIN deletes a team', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.delete.mockResolvedValue(mockTeam);

      await request(app.getHttpServer())
        .delete(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK);
    });

    it('returns 404 when the team does not exist', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/company/1/teams/999')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockTeamRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when the team belongs to a different company', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockOtherCompanyTeam);

      await request(app.getHttpServer())
        .delete(`/company/1/teams/${mockOtherCompanyTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockTeamRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to delete a team', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .delete(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .delete(`/company/1/teams/${mockTeam.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .delete(`/company/1/teams/${mockTeam.id}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockTeamRepository.findById).not.toHaveBeenCalled();
    });
  });
});
