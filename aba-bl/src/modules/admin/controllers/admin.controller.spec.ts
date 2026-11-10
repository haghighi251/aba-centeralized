import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminGuard } from '@/modules/admin/guards/admin.guard';
import { createResponse } from '@/shared/utils/createResponse';
import { ActivityEventType } from '@aba/database';

const mockCompany = {
  id: 1,
  username: 'acme',
  email: 'acme@example.com',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
  findCompaniesWithVulnerabilitySummary: jest.fn(),
};

const mockSubscriptionPlanRepo = {
  exists: jest.fn(),
};

const mockActivityLogRepo = {
  findAll: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: CompanyRepository, useValue: mockRepo },
        {
          provide: SubscriptionPlanRepository,
          useValue: mockSubscriptionPlanRepo,
        },
        { provide: ActivityLogRepository, useValue: mockActivityLogRepo },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  // ── GET /admin/companies ──────────────────────────────────────────────────

  describe('getCompanies', () => {
    it('returns companies with KPIs', async () => {
      mockRepo.findAllWithBusinessOwner.mockResolvedValue({
        data: [mockCompany],
        total: 1,
      });
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      const result = await controller.getCompanies({});

      expect(mockRepo.findAllWithBusinessOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      );
      expect(result).toEqual(
        createResponse(true, null, {
          data: [mockCompany],
          total: 1,
          kpis: mockKpis,
        }),
      );
    });

    it('passes pagination and filter params through', async () => {
      mockRepo.findAllWithBusinessOwner.mockResolvedValue({
        data: [],
        total: 0,
      });
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      await controller.getCompanies({
        page: '2' as any,
        limit: '10' as any,
        search: 'acme',
        status: 'ACTIVE' as any,
      });

      expect(mockRepo.findAllWithBusinessOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
          search: 'acme',
          status: 'ACTIVE',
        }),
      );
    });

    it('only returns companies that have a BUSINESS_OWNER user', async () => {
      // The repository method itself enforces this; the controller must call the right method
      mockRepo.findAllWithBusinessOwner.mockResolvedValue({
        data: [],
        total: 0,
      });
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      await controller.getCompanies({});

      // The owner-filtered method must be called — not any unfiltered variant
      expect(mockRepo.findAllWithBusinessOwner).toHaveBeenCalledTimes(1);
    });

    it('propagates repository errors', async () => {
      mockRepo.findAllWithBusinessOwner.mockRejectedValue(
        new Error('db error'),
      );
      mockRepo.getStatusSummary.mockResolvedValue(mockKpis);

      await expect(controller.getCompanies({})).rejects.toThrow('db error');
    });
  });

  // ── PATCH /admin/companies/:id/status ─────────────────────────────────────

  describe('updateCompanyStatus', () => {
    it('updates status successfully', async () => {
      const updated = { ...mockCompany, status: 'INACTIVE' };
      mockRepo.exists.mockResolvedValue(true);
      mockRepo.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateCompanyStatus(1, {
        status: 'INACTIVE',
      });

      expect(mockRepo.updateStatus).toHaveBeenCalledWith(1, 'INACTIVE');
      expect(result).toEqual(createResponse(true, null, updated));
    });

    it.each(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])(
      'accepts valid status %s',
      async (status) => {
        mockRepo.exists.mockResolvedValue(true);
        mockRepo.updateStatus.mockResolvedValue({ ...mockCompany, status });

        const result = await controller.updateCompanyStatus(1, { status });
        expect(result.success).toBe(true);
      },
    );

    it('throws NotFoundException when company does not exist', async () => {
      mockRepo.exists.mockResolvedValue(false);

      await expect(
        controller.updateCompanyStatus(999, { status: 'ACTIVE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when status is invalid', async () => {
      await expect(
        controller.updateCompanyStatus(1, { status: 'DELETED' } as any),
      ).rejects.toThrow();
    });

    it('propagates repository errors', async () => {
      mockRepo.exists.mockResolvedValue(true);
      mockRepo.updateStatus.mockRejectedValue(new Error('db error'));

      await expect(
        controller.updateCompanyStatus(1, { status: 'ACTIVE' }),
      ).rejects.toThrow('db error');
    });
  });

  // ── GET /admin/companies/vulnerability-summary ─────────────────────────────

  describe('getCompaniesWithVulnerabilities', () => {
    const mockSummary = {
      ...mockCompany,
      vulnerablePackageCount: 3,
      affectedServiceCount: 2,
      notificationCount: 5,
      hasPrimaryOwner: true,
    };

    it('returns the paginated vulnerability summary', async () => {
      mockRepo.findCompaniesWithVulnerabilitySummary.mockResolvedValue({
        data: [mockSummary],
        total: 1,
      });

      const result = await controller.getCompaniesWithVulnerabilities({});

      expect(
        mockRepo.findCompaniesWithVulnerabilitySummary,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      );
      expect(result).toEqual(
        createResponse(true, null, { data: [mockSummary], total: 1 }),
      );
    });

    it('passes pagination and filter params through', async () => {
      mockRepo.findCompaniesWithVulnerabilitySummary.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.getCompaniesWithVulnerabilities({
        page: '2' as any,
        limit: '10' as any,
        search: 'acme',
        status: 'ACTIVE' as any,
      });

      expect(
        mockRepo.findCompaniesWithVulnerabilitySummary,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
          search: 'acme',
          status: 'ACTIVE',
        }),
      );
    });
  });

  // ── GET /admin/activity-logs ────────────────────────────────────────────────

  describe('getActivityLogs', () => {
    it('returns the paginated activity log feed with default pagination', async () => {
      const rows = [{ id: 1, eventType: ActivityEventType.NOTIFICATION_SENT }];
      mockActivityLogRepo.findAll.mockResolvedValue({ data: rows, total: 1 });

      const result = await controller.getActivityLogs({});

      expect(mockActivityLogRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        companyId: undefined,
        environmentId: undefined,
        serviceId: undefined,
        eventType: undefined,
        from: undefined,
        to: undefined,
      });
      expect(result).toEqual(
        createResponse(true, null, { data: rows, total: 1 }),
      );
    });

    it('parses all filter query params', async () => {
      mockActivityLogRepo.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.getActivityLogs({
        page: '2',
        limit: '10',
        companyId: '1',
        environmentId: '2',
        serviceId: '3',
        eventType: 'PACKAGE_MUTED',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      });

      expect(mockActivityLogRepo.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        companyId: 1,
        environmentId: 2,
        serviceId: 3,
        eventType: 'PACKAGE_MUTED',
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-02-01T00:00:00.000Z'),
      });
    });
  });
});
