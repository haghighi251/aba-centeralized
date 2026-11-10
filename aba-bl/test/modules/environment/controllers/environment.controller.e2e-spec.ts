import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { EnvironmentType, EnvironmentStatus } from '@aba/database';
import { EnvironmentController } from '@/modules/environment/controllers/environment.controller';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { EnvironmentService } from '@/modules/environment/services/environment.service';
import { CreateEnvironmentUseCase } from '@/modules/environment/usecases/createEnvironment.usecase';
import { GetEnvironmentsUseCase } from '@/modules/environment/usecases/getEnvironments.usecase';
import { GetEnvironmentByIdUseCase } from '@/modules/environment/usecases/getEnvironmentById.usecase';
import { UpdateEnvironmentUseCase } from '@/modules/environment/usecases/updateEnvironment.usecase';
import { DeleteEnvironmentUseCase } from '@/modules/environment/usecases/deleteEnvironment.usecase';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  AllowAuthGuardMock,
  DenyAuthGuardMock,
} from '@test/__mocks__/auth/guards/auth.guard.mock';
import {
  createEnvironmentRepositoryMock,
  MockedEnvironmentRepository,
} from '@test/__mocks__/environment/repositories/environment.repository.mock';
import {
  createTeamRepositoryMock,
  MockedTeamRepository,
} from '@test/__mocks__/team/repositories/team.repository.mock';
import {
  mockEnvironment,
  mockProductionEnvironment,
  mockOtherCompanyEnvironment,
  validCreateEnvironmentPayload,
} from '@test/__mocks__/environment/fixtures/environment.fixtures';
import { mockTeam } from '@test/__mocks__/team/fixtures/team.fixtures';
import {
  mockOwnerJwtPayload,
  mockAdminJwtPayload,
  mockMemberJwtPayload,
  mockOtherCompanyOwnerJwtPayload,
} from '@test/__mocks__/company/fixtures/company.fixtures';

/**
 * E2E tests for every path under /company/:id/environments
 * (EnvironmentController).
 *
 * Nothing here touches PostgreSQL/Prisma: EnvironmentRepository is fully
 * mocked. EnvironmentService and all use cases run for real, as do
 * CompanyAccessGuard and CompanyManagerGuard, so the permission and
 * business-logic wiring is exercised end-to-end.
 */
describe('EnvironmentController (e2e)', () => {
  let app: INestApplication;
  let mockEnvironmentRepository: MockedEnvironmentRepository;
  let mockTeamRepository: MockedTeamRepository;
  let mockJwtService: { verifyAsync: jest.Mock };

  async function buildApp(authGuard?: {
    canActivate: (...args: unknown[]) => unknown;
  }): Promise<INestApplication> {
    let builder = Test.createTestingModule({
      controllers: [EnvironmentController],
      providers: [
        EnvironmentService,
        CreateEnvironmentUseCase,
        GetEnvironmentsUseCase,
        GetEnvironmentByIdUseCase,
        UpdateEnvironmentUseCase,
        DeleteEnvironmentUseCase,
        { provide: EnvironmentRepository, useValue: mockEnvironmentRepository },
        { provide: TeamRepository, useValue: mockTeamRepository },
        { provide: CompanyRepository, useValue: { findById: jest.fn() } },
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
    mockEnvironmentRepository = createEnvironmentRepositoryMock();
    mockTeamRepository = createTeamRepositoryMock();
    mockTeamRepository.findById.mockResolvedValue(mockTeam);
    mockJwtService = { verifyAsync: jest.fn() };

    app = await buildApp(new AllowAuthGuardMock(mockOwnerJwtPayload));
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /company/:id/environments ───────────────────────────────────────

  describe('GET /company/:id/environments', () => {
    it('returns 200 with the list of environments for a company member', async () => {
      mockEnvironmentRepository.findAllForCompany.mockResolvedValue({
        data: [mockEnvironment, mockProductionEnvironment],
        total: 2,
      });

      await request(app.getHttpServer())
        .get('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.total).toBe(2);
          expect(res.body.data.data).toHaveLength(2);
        });

      expect(mockEnvironmentRepository.findAllForCompany).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          sortBy: 'order',
          sortOrder: 'asc',
        }),
      );
    });

    it('returns 200 with an empty list when the company has no environments', async () => {
      mockEnvironmentRepository.findAllForCompany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/company/1/environments')
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

    it('passes search/type/status/sort query params to the repository', async () => {
      mockEnvironmentRepository.findAllForCompany.mockResolvedValue({
        data: [mockProductionEnvironment],
        total: 1,
      });

      await request(app.getHttpServer())
        .get('/company/1/environments')
        .query({
          search: 'prod',
          type: 'PRODUCTION',
          status: 'ACTIVE',
          sortBy: 'name',
          sortOrder: 'desc',
        })
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK);

      expect(mockEnvironmentRepository.findAllForCompany).toHaveBeenCalledWith({
        companyId: 1,
        search: 'prod',
        type: EnvironmentType.PRODUCTION,
        status: EnvironmentStatus.ACTIVE,
        sortBy: 'name',
        sortOrder: 'desc',
      });
    });

    it('returns 400 for an invalid type filter', async () => {
      await request(app.getHttpServer())
        .get('/company/1/environments')
        .query({ type: 'NOT_A_TYPE' })
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.BAD_REQUEST);

      expect(
        mockEnvironmentRepository.findAllForCompany,
      ).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(
        mockEnvironmentRepository.findAllForCompany,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get('/company/1/environments')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(
        mockEnvironmentRepository.findAllForCompany,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 when the guard rejects the request', async () => {
      app = await buildApp(new DenyAuthGuardMock());

      await request(app.getHttpServer())
        .get('/company/1/environments')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ── GET /company/:id/environments/:envId ────────────────────────────────

  describe('GET /company/:id/environments/:envId', () => {
    it('returns 200 with the environment when found', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);

      await request(app.getHttpServer())
        .get(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockEnvironment.id);
          expect(res.body.data.slug).toBe(mockEnvironment.slug);
        });

      expect(mockEnvironmentRepository.findById).toHaveBeenCalledWith(
        mockEnvironment.id,
      );
    });

    it('returns 404 when the environment does not exist', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/company/1/environments/999')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when the environment belongs to a different company', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(
        mockOtherCompanyEnvironment,
      );

      await request(app.getHttpServer())
        .get(`/company/1/environments/${mockOtherCompanyEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get(`/company/1/environments/${mockEnvironment.id}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── POST /company/:id/environments ──────────────────────────────────────

  describe('POST /company/:id/environments', () => {
    it('returns 201 when a BUSINESS_OWNER creates a new environment', async () => {
      mockEnvironmentRepository.findByTeamAndSlug.mockResolvedValue(null);
      mockEnvironmentRepository.findMaxOrder.mockResolvedValue(2);
      mockEnvironmentRepository.create.mockResolvedValue({
        ...mockEnvironment,
        id: 5,
        name: validCreateEnvironmentPayload.name,
        slug: 'staging',
        type: EnvironmentType.STAGING,
        order: validCreateEnvironmentPayload.order,
      });

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateEnvironmentPayload)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(validCreateEnvironmentPayload.name);
          expect(res.body.data.slug).toBe('staging');
        });

      expect(mockEnvironmentRepository.findByTeamAndSlug).toHaveBeenCalledWith(
        1,
        'staging',
      );
      expect(mockEnvironmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validCreateEnvironmentPayload.name,
          slug: 'staging',
          type: EnvironmentType.STAGING,
          order: validCreateEnvironmentPayload.order,
          company: { connect: { id: 1 } },
        }),
      );
    });

    it('derives the slug from the name and order from the current max when omitted', async () => {
      mockEnvironmentRepository.findByTeamAndSlug.mockResolvedValue(null);
      mockEnvironmentRepository.findMaxOrder.mockResolvedValue(3);
      mockEnvironmentRepository.create.mockResolvedValue({
        ...mockEnvironment,
        id: 6,
        name: 'My New Env',
        slug: 'my-new-env',
        order: 4,
      });

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ teamId: 1, name: 'My New Env' })
        .expect(HttpStatus.CREATED);

      expect(mockEnvironmentRepository.findByTeamAndSlug).toHaveBeenCalledWith(
        1,
        'my-new-env',
      );
      expect(mockEnvironmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'my-new-env', order: 4 }),
      );
    });

    it('returns 201 when a BUSINESS_ADMIN creates a new environment', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockEnvironmentRepository.findByTeamAndSlug.mockResolvedValue(null);
      mockEnvironmentRepository.findMaxOrder.mockResolvedValue(0);
      mockEnvironmentRepository.create.mockResolvedValue(mockEnvironment);

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateEnvironmentPayload)
        .expect(HttpStatus.CREATED);
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to create an environment', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateEnvironmentPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.create).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validCreateEnvironmentPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ type: 'CUSTOM' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockEnvironmentRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid slug format', async () => {
      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ teamId: 1, name: 'Production', slug: 'Not Valid Slug!' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockEnvironmentRepository.create).not.toHaveBeenCalled();
    });

    it('returns 409 when an environment with the same slug already exists', async () => {
      mockEnvironmentRepository.findByTeamAndSlug.mockResolvedValue(
        mockEnvironment,
      );

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .set('Authorization', 'Bearer valid-access-token')
        .send({ teamId: 1, name: 'Development' })
        .expect(HttpStatus.CONFLICT);

      expect(mockEnvironmentRepository.create).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .post('/company/1/environments')
        .send(validCreateEnvironmentPayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockEnvironmentRepository.create).not.toHaveBeenCalled();
    });
  });

  // ── PUT /company/:id/environments/:envId ────────────────────────────────

  describe('PUT /company/:id/environments/:envId', () => {
    const validUpdatePayload = { name: 'Production EU', order: 5 };

    it('returns 200 when a BUSINESS_OWNER updates an environment', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.update.mockResolvedValue({
        ...mockEnvironment,
        ...validUpdatePayload,
      });

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Production EU');
          expect(res.body.data.order).toBe(5);
        });

      expect(mockEnvironmentRepository.update).toHaveBeenCalledWith(
        mockEnvironment.id,
        validUpdatePayload,
      );
    });

    it('returns 200 when a BUSINESS_ADMIN updates an environment', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.update.mockResolvedValue({
        ...mockEnvironment,
        ...validUpdatePayload,
      });

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.OK);
    });

    it('allows changing the slug when it does not collide', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.findByTeamAndSlug.mockResolvedValue(null);
      mockEnvironmentRepository.update.mockResolvedValue({
        ...mockEnvironment,
        slug: 'dev-eu',
      });

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ slug: 'dev-eu' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.slug).toBe('dev-eu');
        });

      expect(mockEnvironmentRepository.findByTeamAndSlug).toHaveBeenCalledWith(
        1,
        'dev-eu',
      );
    });

    it('returns 409 when changing the slug collides with another environment', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.findByTeamAndSlug.mockResolvedValue(
        mockProductionEnvironment,
      );

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ slug: 'production' })
        .expect(HttpStatus.CONFLICT);

      expect(mockEnvironmentRepository.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the environment does not exist', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/company/1/environments/999')
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockEnvironmentRepository.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the environment belongs to a different company', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(
        mockOtherCompanyEnvironment,
      );

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockOtherCompanyEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockEnvironmentRepository.update).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to update an environment', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send(validUpdatePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid environment type', async () => {
      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .send({ type: 'NOT_A_TYPE' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .put(`/company/1/environments/${mockEnvironment.id}`)
        .send(validUpdatePayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── DELETE /company/:id/environments/:envId ─────────────────────────────

  describe('DELETE /company/:id/environments/:envId', () => {
    it('returns 200 when a BUSINESS_OWNER deletes an environment', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.delete.mockResolvedValue(mockEnvironment);

      await request(app.getHttpServer())
        .delete(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(mockEnvironment.id);
        });

      expect(mockEnvironmentRepository.delete).toHaveBeenCalledWith(
        mockEnvironment.id,
      );
    });

    it('returns 200 when a BUSINESS_ADMIN deletes an environment', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.delete.mockResolvedValue(mockEnvironment);

      await request(app.getHttpServer())
        .delete(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.OK);
    });

    it('returns 404 when the environment does not exist', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/company/1/environments/999')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockEnvironmentRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when the environment belongs to a different company', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(
        mockOtherCompanyEnvironment,
      );

      await request(app.getHttpServer())
        .delete(`/company/1/environments/${mockOtherCompanyEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockEnvironmentRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to delete an environment', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .delete(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .delete(`/company/1/environments/${mockEnvironment.id}`)
        .set('Authorization', 'Bearer valid-access-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .delete(`/company/1/environments/${mockEnvironment.id}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockEnvironmentRepository.findById).not.toHaveBeenCalled();
    });
  });
});
