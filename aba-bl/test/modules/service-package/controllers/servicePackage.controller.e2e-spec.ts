import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { DependencyEcosystem, ServicePackageStatus } from '@aba/database';
import { ServicePackageController } from '@/modules/service-package/controllers/servicePackage.controller';
import { PackageRepository } from '@/modules/service-package/repositories/package.repository';
import { ServicePackageRepository } from '@/modules/service-package/repositories/servicePackage.repository';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { VulnerabilityScanService } from '@/modules/service-package/services/vulnerability-scan.service';
import { ServicePackageNotificationStateRepository } from '@/modules/service-package/repositories/servicePackageNotificationState.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { GetServicePackagesUseCase } from '@/modules/service-package/usecases/getServicePackages.usecase';
import { GetServicePackageHistoryUseCase } from '@/modules/service-package/usecases/getServicePackageHistory.usecase';
import { CreateServicePackageUseCase } from '@/modules/service-package/usecases/createServicePackage.usecase';
import { UpdateServicePackageUseCase } from '@/modules/service-package/usecases/updateServicePackage.usecase';
import { DeleteServicePackageUseCase } from '@/modules/service-package/usecases/deleteServicePackage.usecase';
import { GetServiceVulnerabilitiesUseCase } from '@/modules/service-package/usecases/getServiceVulnerabilities.usecase';
import { UpdateServicePackageNotificationUseCase } from '@/modules/service-package/usecases/updateServicePackageNotification.usecase';
import { LogVulnerabilityViewUseCase } from '@/modules/service-package/usecases/logVulnerabilityView.usecase';
import { VulnerabilityRepository } from '@/modules/service-package/repositories/vulnerability.repository';
import { BulkImportServicePackagesUseCase } from '@/modules/service-package/usecases/bulkImportServicePackages.usecase';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  AllowAuthGuardMock,
  DenyAuthGuardMock,
} from '@test/__mocks__/auth/guards/auth.guard.mock';
import {
  createPackageRepositoryMock,
  MockedPackageRepository,
} from '@test/__mocks__/service-package/repositories/package.repository.mock';
import {
  createServicePackageRepositoryMock,
  MockedServicePackageRepository,
} from '@test/__mocks__/service-package/repositories/servicePackage.repository.mock';
import {
  createServiceRepositoryMock,
  MockedServiceRepository,
} from '@test/__mocks__/service-package/repositories/service.repository.mock';
import {
  createEnvironmentRepositoryMock,
  MockedEnvironmentRepository,
} from '@test/__mocks__/environment/repositories/environment.repository.mock';
import {
  mockActiveServicePackage,
  mockStaleServicePackage,
  mockRemovedServicePackage,
  mockPackage,
  mockOlderPackage,
  mockService,
  mockOtherCompanyService,
  validCreatePackagePayload,
  validUpdatePackagePayload,
  validBulkImportPayload,
} from '@test/__mocks__/service-package/fixtures/servicePackage.fixtures';
import {
  mockOwnerJwtPayload,
  mockAdminJwtPayload,
  mockMemberJwtPayload,
  mockOtherCompanyOwnerJwtPayload,
} from '@test/__mocks__/company/fixtures/company.fixtures';
import { mockEnvironment } from '@test/__mocks__/environment/fixtures/environment.fixtures';

/**
 * E2E tests for every path under
 *   /company/:id/environments/:envId/services/:serviceId/packages
 * (ServicePackageController).
 *
 * No PostgreSQL or Prisma is used: all repositories are fully mocked.
 * ServicePackageService and all use cases run for real so that the
 * full controller → use case → service → repository wiring is exercised,
 * including CompanyAccessGuard and CompanyManagerGuard RBAC enforcement.
 */
describe('ServicePackageController (e2e)', () => {
  let app: INestApplication;
  let mockPackageRepo: MockedPackageRepository;
  let mockServicePackageRepo: MockedServicePackageRepository;
  let mockServiceRepo: MockedServiceRepository;
  let mockEnvironmentRepo: MockedEnvironmentRepository;
  let mockJwtService: { verifyAsync: jest.Mock };

  const BASE = '/company/1/environments/1/services/1/packages';

  async function buildApp(authGuard?: {
    canActivate: (...args: unknown[]) => unknown;
  }): Promise<INestApplication> {
    let builder = Test.createTestingModule({
      controllers: [ServicePackageController],
      providers: [
        ServicePackageService,
        GetServicePackagesUseCase,
        GetServicePackageHistoryUseCase,
        CreateServicePackageUseCase,
        UpdateServicePackageUseCase,
        DeleteServicePackageUseCase,
        BulkImportServicePackagesUseCase,
        GetServiceVulnerabilitiesUseCase,
        UpdateServicePackageNotificationUseCase,
        LogVulnerabilityViewUseCase,
        {
          provide: VulnerabilityRepository,
          useValue: { findForService: jest.fn() },
        },
        { provide: PackageRepository, useValue: mockPackageRepo },
        { provide: ServicePackageRepository, useValue: mockServicePackageRepo },
        { provide: ServiceRepository, useValue: mockServiceRepo },
        { provide: EnvironmentRepository, useValue: mockEnvironmentRepo },
        {
          provide: VulnerabilityScanService,
          useValue: { scanPackages: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ServicePackageNotificationStateRepository,
          useValue: {
            findByServicePackageId: jest.fn(),
            mute: jest.fn(),
            unmute: jest.fn(),
            snooze: jest.fn(),
          },
        },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
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
    mockPackageRepo = createPackageRepositoryMock();
    mockServicePackageRepo = createServicePackageRepositoryMock();
    mockServiceRepo = createServiceRepositoryMock();
    mockEnvironmentRepo = createEnvironmentRepositoryMock();
    mockJwtService = { verifyAsync: jest.fn() };

    // Default: valid environment + service for company 1
    mockEnvironmentRepo.findById.mockResolvedValue(mockEnvironment);
    mockServiceRepo.findById.mockResolvedValue(mockService);

    app = await buildApp(new AllowAuthGuardMock(mockOwnerJwtPayload));
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /packages ───────────────────────────────────────────────────────────

  describe('GET /packages', () => {
    it('returns 200 with the active package list for a company member', async () => {
      mockServicePackageRepo.findActive.mockResolvedValue({
        data: [mockActiveServicePackage],
        total: 1,
      });

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.total).toBe(1);
          expect(res.body.data.data[0].package.name).toBe('express');
        });

      expect(mockServicePackageRepo.findActive).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: 1,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      );
    });

    it('returns 200 with an empty list when the service has no active packages', async () => {
      mockServicePackageRepo.findActive.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            error: null,
            data: { data: [], total: 0 },
          });
        });
    });

    it('passes search and ecosystem query params to the repository', async () => {
      mockServicePackageRepo.findActive.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get(BASE)
        .query({
          search: 'express',
          ecosystem: 'NPM',
          sortBy: 'introducedAt',
          sortOrder: 'desc',
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK);

      expect(mockServicePackageRepo.findActive).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'express',
          ecosystem: DependencyEcosystem.NPM,
          sortBy: 'introducedAt',
          sortOrder: 'desc',
        }),
      );
    });

    it('returns 400 for an invalid ecosystem filter', async () => {
      await request(app.getHttpServer())
        .get(BASE)
        .query({ ecosystem: 'INVALID' })
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockServicePackageRepo.findActive).not.toHaveBeenCalled();
    });

    it('returns 404 when the service does not belong to the company', async () => {
      mockServiceRepo.findById.mockResolvedValue(mockOtherCompanyService);

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockServicePackageRepo.findActive).not.toHaveBeenCalled();
    });

    it('returns 200 for a BUSINESS_MEMBER (read is allowed)', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));
      mockServicePackageRepo.findActive.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK);
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .get(BASE)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockServicePackageRepo.findActive).not.toHaveBeenCalled();
    });

    it('returns 401 when the guard rejects the request', async () => {
      app = await buildApp(new DenyAuthGuardMock());

      await request(app.getHttpServer())
        .get(BASE)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ── GET /packages/history ───────────────────────────────────────────────────

  describe('GET /packages/history', () => {
    it('returns 200 with stale and removed rows by default', async () => {
      mockServicePackageRepo.findHistory.mockResolvedValue({
        data: [mockStaleServicePackage, mockRemovedServicePackage],
        total: 2,
      });

      await request(app.getHttpServer())
        .get(`${BASE}/history`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.total).toBe(2);
        });

      expect(mockServicePackageRepo.findHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ALL',
          sortBy: 'deactivatedAt',
          sortOrder: 'desc',
        }),
      );
    });

    it('filters to STALE-only when status=STALE is passed', async () => {
      mockServicePackageRepo.findHistory.mockResolvedValue({
        data: [mockStaleServicePackage],
        total: 1,
      });

      await request(app.getHttpServer())
        .get(`${BASE}/history`)
        .query({ status: 'STALE' })
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK);

      expect(mockServicePackageRepo.findHistory).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'STALE' }),
      );
    });

    it('returns 400 for an invalid status filter', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/history`)
        .query({ status: 'ACTIVE' })
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockServicePackageRepo.findHistory).not.toHaveBeenCalled();
    });

    it('returns 200 for a BUSINESS_MEMBER (read is allowed)', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));
      mockServicePackageRepo.findHistory.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get(`${BASE}/history`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK);
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .get(`${BASE}/history`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ── POST /packages ──────────────────────────────────────────────────────────

  describe('POST /packages', () => {
    it('returns 201 when a BUSINESS_OWNER adds a new package', async () => {
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        null,
      );
      mockServicePackageRepo.create.mockResolvedValue(mockActiveServicePackage);

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe(ServicePackageStatus.ACTIVE);
          expect(res.body.data.package.name).toBe('express');
        });

      expect(mockPackageRepo.findOrCreate).toHaveBeenCalledWith(
        DependencyEcosystem.NPM,
        'express',
        '4.18.2',
      );
    });

    it('returns 201 when a BUSINESS_ADMIN adds a new package', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        null,
      );
      mockServicePackageRepo.create.mockResolvedValue(mockActiveServicePackage);

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.CREATED);
    });

    it('stales the old version and creates the new ACTIVE row when a different version exists', async () => {
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      const existingSP = {
        ...mockActiveServicePackage,
        packageId: mockOlderPackage.id,
        package: mockOlderPackage,
      };
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        existingSP,
      );
      mockServicePackageRepo.markAsStale.mockResolvedValue({
        ...existingSP,
        status: ServicePackageStatus.STALE,
      });
      mockServicePackageRepo.create.mockResolvedValue(mockActiveServicePackage);

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.CREATED);

      expect(mockServicePackageRepo.markAsStale).toHaveBeenCalledWith(
        existingSP.id,
      );
      expect(mockServicePackageRepo.create).toHaveBeenCalled();
    });

    it('returns 409 when the same version is already active for the service', async () => {
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        mockActiveServicePackage,
      );

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.CONFLICT);

      expect(mockServicePackageRepo.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the environment does not exist', async () => {
      mockEnvironmentRepo.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send({ version: '1.0.0' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });

    it('returns 400 when version is missing', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'express' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 for an invalid ecosystem', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'express', version: '4.18.2', ecosystem: 'INVALID' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to add a package', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer valid-token')
        .send(validCreatePackagePayload)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp(); // real AuthGuard

      await request(app.getHttpServer())
        .post(BASE)
        .send(validCreatePackagePayload)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });
  });

  // ── PUT /packages/:servicePackageId ─────────────────────────────────────────

  describe('PUT /packages/:servicePackageId', () => {
    it('returns 200 when a BUSINESS_OWNER updates versionRange in place', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(
        mockActiveServicePackage,
      );
      const updated = { ...mockActiveServicePackage, versionRange: '^4.19.0' };
      mockServicePackageRepo.update.mockResolvedValue(updated);

      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ versionRange: '^4.19.0' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.versionRange).toBe('^4.19.0');
        });
    });

    it('returns 200 when version changes — stales old and creates new ACTIVE row', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(
        mockActiveServicePackage,
      );
      const newPkg = { ...mockPackage, id: 3, version: '4.19.0' };
      mockPackageRepo.findOrCreate.mockResolvedValue(newPkg);
      mockServicePackageRepo.markAsStale.mockResolvedValue({
        ...mockActiveServicePackage,
        status: ServicePackageStatus.STALE,
      });
      const newSP = {
        ...mockActiveServicePackage,
        id: 11,
        packageId: 3,
        package: newPkg,
      };
      mockServicePackageRepo.create.mockResolvedValue(newSP);

      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(validUpdatePackagePayload)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.package.version).toBe('4.19.0');
        });

      expect(mockServicePackageRepo.markAsStale).toHaveBeenCalledWith(
        mockActiveServicePackage.id,
      );
    });

    it('returns 200 when a BUSINESS_ADMIN updates a package', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockServicePackageRepo.findById.mockResolvedValue(
        mockActiveServicePackage,
      );
      mockServicePackageRepo.update.mockResolvedValue(mockActiveServicePackage);

      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ versionRange: '^4.18.0' })
        .expect(HttpStatus.OK);
    });

    it('returns 404 when the service package does not exist', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put(`${BASE}/999`)
        .set('Authorization', 'Bearer valid-token')
        .send(validUpdatePackagePayload)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when the service package is not ACTIVE', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(
        mockStaleServicePackage,
      );

      await request(app.getHttpServer())
        .put(`${BASE}/${mockStaleServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(validUpdatePackagePayload)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 400 when no fields are provided', async () => {
      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockServicePackageRepo.findById).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid ecosystem', async () => {
      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ ecosystem: 'INVALID' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to update', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(validUpdatePackagePayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockServicePackageRepo.findById).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp();

      await request(app.getHttpServer())
        .put(`${BASE}/${mockActiveServicePackage.id}`)
        .send(validUpdatePackagePayload)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ── DELETE /packages/:servicePackageId ──────────────────────────────────────

  describe('DELETE /packages/:servicePackageId', () => {
    it('returns 200 with REMOVED status when a BUSINESS_OWNER deletes a package', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(
        mockActiveServicePackage,
      );
      mockServicePackageRepo.markAsRemoved.mockResolvedValue(
        mockRemovedServicePackage,
      );

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe(ServicePackageStatus.REMOVED);
          expect(res.body.data.deactivatedAt).not.toBeNull();
        });

      expect(mockServicePackageRepo.markAsRemoved).toHaveBeenCalledWith(
        mockActiveServicePackage.id,
      );
    });

    it('returns 200 when a BUSINESS_ADMIN deletes a package', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockServicePackageRepo.findById.mockResolvedValue(
        mockActiveServicePackage,
      );
      mockServicePackageRepo.markAsRemoved.mockResolvedValue(
        mockRemovedServicePackage,
      );

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.OK);
    });

    it('returns 404 when the service package does not exist', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete(`${BASE}/999`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockServicePackageRepo.markAsRemoved).not.toHaveBeenCalled();
    });

    it('returns 404 when the service package is not ACTIVE (already REMOVED)', async () => {
      mockServicePackageRepo.findById.mockResolvedValue(
        mockRemovedServicePackage,
      );

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockRemovedServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockServicePackageRepo.markAsRemoved).not.toHaveBeenCalled();
    });

    it('returns 404 when the row belongs to a different service', async () => {
      mockServicePackageRepo.findById.mockResolvedValue({
        ...mockActiveServicePackage,
        serviceId: 99,
      });

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to delete', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.FORBIDDEN);

      expect(mockServicePackageRepo.findById).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockActiveServicePackage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp();

      await request(app.getHttpServer())
        .delete(`${BASE}/${mockActiveServicePackage.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ── POST /packages/bulk ─────────────────────────────────────────────────────

  describe('POST /packages/bulk', () => {
    it('returns 201 with an import summary when a BUSINESS_OWNER bulk-imports packages', async () => {
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        null,
      );
      mockServicePackageRepo.create.mockResolvedValue(mockActiveServicePackage);

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send(validBulkImportPayload)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toMatchObject({
            added: expect.any(Number),
            updated: expect.any(Number),
            unchanged: expect.any(Number),
            staled: expect.any(Number),
          });
          expect(res.body.data.added).toBe(
            validBulkImportPayload.packages.length,
          );
        });
    });

    it('returns 201 when a BUSINESS_ADMIN bulk-imports packages', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockAdminJwtPayload));
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        null,
      );
      mockServicePackageRepo.create.mockResolvedValue(mockActiveServicePackage);

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send(validBulkImportPayload)
        .expect(HttpStatus.CREATED);
    });

    it('reports unchanged when all packages are already at the same version', async () => {
      mockPackageRepo.findOrCreate.mockResolvedValue(mockPackage);
      mockServicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        mockActiveServicePackage,
      );

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          ecosystem: DependencyEcosystem.NPM,
          packages: [{ name: 'express', version: '4.18.2' }],
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data.unchanged).toBe(1);
          expect(res.body.data.added).toBe(0);
        });
    });

    it('returns 400 when packages array is empty', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send({ ecosystem: 'NPM', packages: [] })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });

    it('returns 400 when a package item is missing name', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send({ packages: [{ version: '1.0.0' }] })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 for an invalid ecosystem', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          ecosystem: 'INVALID',
          packages: [{ name: 'express', version: '1.0.0' }],
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 404 when the service is not found', async () => {
      mockServiceRepo.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send(validBulkImportPayload)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });

    it('returns 403 when a BUSINESS_MEMBER attempts to bulk-import', async () => {
      app = await buildApp(new AllowAuthGuardMock(mockMemberJwtPayload));

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send(validBulkImportPayload)
        .expect(HttpStatus.FORBIDDEN);

      expect(mockPackageRepo.findOrCreate).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller belongs to a different company', async () => {
      app = await buildApp(
        new AllowAuthGuardMock(mockOtherCompanyOwnerJwtPayload),
      );

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .set('Authorization', 'Bearer valid-token')
        .send(validBulkImportPayload)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 401 when no Authorization header is sent', async () => {
      app = await buildApp();

      await request(app.getHttpServer())
        .post(`${BASE}/bulk`)
        .send(validBulkImportPayload)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
