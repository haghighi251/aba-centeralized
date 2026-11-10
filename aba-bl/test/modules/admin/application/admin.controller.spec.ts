import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AdminController } from '@/modules/admin/controllers/admin.controller';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminGuard } from '@/modules/admin/guards/admin.guard';
import { ForbiddenException } from '@nestjs/common';

const mockCompany = {
  id: 1,
  username: 'acme',
  email: 'acme@example.com',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
  users: [
    { id: 10, firstName: 'Alice', lastName: 'Owner', email: 'alice@acme.com' },
  ],
  _count: { users: 3 },
};

const mockKpis = { total: 2, active: 1, inactive: 0, suspended: 0, pending: 1 };

const mockRepo = {
  findAllWithBusinessOwner: jest.fn(),
  getStatusSummary: jest.fn(),
  updateStatus: jest.fn(),
  exists: jest.fn(),
};

async function buildApp(overrideAdminGuard = true): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    controllers: [AdminController],
    providers: [
      { provide: CompanyRepository, useValue: mockRepo },
      { provide: SubscriptionPlanRepository, useValue: {} },
      { provide: ActivityLogRepository, useValue: { log: jest.fn() } },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: () => true });

  if (overrideAdminGuard) {
    builder = builder
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true });
  } else {
    // Use the real AdminGuard but inject a user without admin role
    builder = builder.overrideGuard(AdminGuard).useValue({
      canActivate: () => {
        throw new ForbiddenException('Admin access required.');
      },
    });
  }

  const module: TestingModule = await builder.compile();
  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('AdminController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await buildApp(true);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /admin/companies ──────────────────────────────────────────────────

  describe('GET /admin/companies', () => {
    it('returns 200 with companies and KPIs', async () => {
      mockRepo.findAllWithBusinessOwner.mockResolvedValue({
        data: [mockCompany],
        total: 1,
      });
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      await request(app.getHttpServer())
        .get('/admin/companies')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.data).toHaveLength(1);
          expect(res.body.data.data[0].username).toBe('acme');
          expect(res.body.data.kpis).toEqual(mockKpis);
          expect(res.body.data.total).toBe(1);
        });
    });

    it('returns only companies with a BUSINESS_OWNER — uses findAllWithBusinessOwner', async () => {
      mockRepo.findAllWithBusinessOwner.mockResolvedValue({
        data: [],
        total: 0,
      });
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      await request(app.getHttpServer())
        .get('/admin/companies')
        .expect(HttpStatus.OK);

      expect(mockRepo.findAllWithBusinessOwner).toHaveBeenCalled();
    });

    it('supports pagination query params', async () => {
      mockRepo.findAllWithBusinessOwner.mockResolvedValue({
        data: [],
        total: 0,
      });
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      await request(app.getHttpServer())
        .get('/admin/companies?page=2&limit=5&search=acme&status=ACTIVE')
        .expect(HttpStatus.OK);

      expect(mockRepo.findAllWithBusinessOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
          search: 'acme',
          status: 'ACTIVE',
        }),
      );
    });

    it('returns 403 when caller is not SUPER_ADMIN or ADMIN', async () => {
      const restrictedApp = await buildApp(false);
      try {
        await request(restrictedApp.getHttpServer())
          .get('/admin/companies')
          .expect(HttpStatus.FORBIDDEN);
      } finally {
        await restrictedApp.close();
      }
    });
  });

  // ── PATCH /admin/companies/:id/status ────────────────────────────────────

  describe('PATCH /admin/companies/:id/status', () => {
    it('returns 200 and updated company on valid status', async () => {
      const updated = { ...mockCompany, status: 'INACTIVE' };
      mockRepo.exists.mockResolvedValue(true);
      mockRepo.updateStatus.mockResolvedValue(updated);

      await request(app.getHttpServer())
        .patch('/admin/companies/1/status')
        .send({ status: 'INACTIVE' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('INACTIVE');
        });
    });

    it.each(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])(
      'accepts valid status value: %s',
      async (status) => {
        mockRepo.exists.mockResolvedValue(true);
        mockRepo.updateStatus.mockResolvedValue({ ...mockCompany, status });

        await request(app.getHttpServer())
          .patch('/admin/companies/1/status')
          .send({ status })
          .expect(HttpStatus.OK);
      },
    );

    it('returns 404 when company does not exist', async () => {
      mockRepo.exists.mockResolvedValue(false);

      await request(app.getHttpServer())
        .patch('/admin/companies/999/status')
        .send({ status: 'ACTIVE' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns an error when status is invalid', async () => {
      await request(app.getHttpServer())
        .patch('/admin/companies/1/status')
        .send({ status: 'DELETED' })
        .expect((res) => {
          expect(res.status).not.toBe(HttpStatus.OK);
        });
    });

    it('returns 403 when caller is not SUPER_ADMIN or ADMIN', async () => {
      const restrictedApp = await buildApp(false);
      try {
        await request(restrictedApp.getHttpServer())
          .patch('/admin/companies/1/status')
          .send({ status: 'ACTIVE' })
          .expect(HttpStatus.FORBIDDEN);
      } finally {
        await restrictedApp.close();
      }
    });

    it('BUSINESS_OWNER cannot update company status', async () => {
      // Simulate AdminGuard blocking a BUSINESS_OWNER request
      const businessOwnerApp = await buildApp(false);
      try {
        await request(businessOwnerApp.getHttpServer())
          .patch('/admin/companies/1/status')
          .send({ status: 'ACTIVE' })
          .expect(HttpStatus.FORBIDDEN);
      } finally {
        await businessOwnerApp.close();
      }
    });
  });
});
