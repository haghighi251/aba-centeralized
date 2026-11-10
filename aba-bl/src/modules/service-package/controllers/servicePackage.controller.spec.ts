import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DependencyEcosystem, ServicePackageStatus } from '@aba/database';
import { ServicePackageController } from './servicePackage.controller';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { GetServicePackagesUseCase } from '@/modules/service-package/usecases/getServicePackages.usecase';
import { GetServicePackageHistoryUseCase } from '@/modules/service-package/usecases/getServicePackageHistory.usecase';
import { CreateServicePackageUseCase } from '@/modules/service-package/usecases/createServicePackage.usecase';
import { UpdateServicePackageUseCase } from '@/modules/service-package/usecases/updateServicePackage.usecase';
import { DeleteServicePackageUseCase } from '@/modules/service-package/usecases/deleteServicePackage.usecase';
import { BulkImportServicePackagesUseCase } from '@/modules/service-package/usecases/bulkImportServicePackages.usecase';
import { GetServiceVulnerabilitiesUseCase } from '@/modules/service-package/usecases/getServiceVulnerabilities.usecase';
import { UpdateServicePackageNotificationUseCase } from '@/modules/service-package/usecases/updateServicePackageNotification.usecase';
import { LogVulnerabilityViewUseCase } from '@/modules/service-package/usecases/logVulnerabilityView.usecase';

const mockReq = { user: { sub: 5 } } as any;

describe('ServicePackageController', () => {
  let controller: ServicePackageController;
  let getPackagesUseCase: jest.Mocked<GetServicePackagesUseCase>;
  let getHistoryUseCase: jest.Mocked<GetServicePackageHistoryUseCase>;
  let createUseCase: jest.Mocked<CreateServicePackageUseCase>;
  let updateUseCase: jest.Mocked<UpdateServicePackageUseCase>;
  let deleteUseCase: jest.Mocked<DeleteServicePackageUseCase>;
  let bulkImportUseCase: jest.Mocked<BulkImportServicePackagesUseCase>;
  let getVulnerabilitiesUseCase: jest.Mocked<GetServiceVulnerabilitiesUseCase>;
  let updateNotificationUseCase: jest.Mocked<UpdateServicePackageNotificationUseCase>;
  let logVulnerabilityViewUseCase: jest.Mocked<LogVulnerabilityViewUseCase>;

  const mockPkg = {
    id: 1,
    ecosystem: DependencyEcosystem.NPM,
    name: 'express',
    version: '4.18.2',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockSP = {
    id: 10,
    status: ServicePackageStatus.ACTIVE,
    versionRange: '^4.18.0',
    introducedAt: new Date('2024-01-01T00:00:00.000Z'),
    deactivatedAt: null,
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 1,
    package: mockPkg,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicePackageController],
      providers: [
        {
          provide: GetServicePackagesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetServicePackageHistoryUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateServicePackageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateServicePackageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteServicePackageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: BulkImportServicePackagesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetServiceVulnerabilitiesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateServicePackageNotificationUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: LogVulnerabilityViewUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyAccessGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyManagerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(ServicePackageController);
    getPackagesUseCase = module.get(GetServicePackagesUseCase);
    getHistoryUseCase = module.get(GetServicePackageHistoryUseCase);
    createUseCase = module.get(CreateServicePackageUseCase);
    updateUseCase = module.get(UpdateServicePackageUseCase);
    deleteUseCase = module.get(DeleteServicePackageUseCase);
    bulkImportUseCase = module.get(BulkImportServicePackagesUseCase);
    getVulnerabilitiesUseCase = module.get(GetServiceVulnerabilitiesUseCase);
    updateNotificationUseCase = module.get(
      UpdateServicePackageNotificationUseCase,
    );
    logVulnerabilityViewUseCase = module.get(LogVulnerabilityViewUseCase);
  });

  // ── getPackages ─────────────────────────────────────────────────────────────

  describe('getPackages', () => {
    it('returns the active package list wrapped in a response envelope', async () => {
      getPackagesUseCase.execute.mockResolvedValue({
        data: [mockSP],
        total: 1,
      });

      const result = await controller.getPackages(1, 1, 1, {
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: { data: [mockSP], total: 1 },
      });
      expect(getPackagesUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getPackagesUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.getPackages(1, 1, 999, { sortBy: 'name', sortOrder: 'asc' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getPackageHistory ────────────────────────────────────────────────────────

  describe('getPackageHistory', () => {
    it('returns history rows wrapped in a response envelope', async () => {
      const staled = { ...mockSP, status: ServicePackageStatus.STALE };
      getHistoryUseCase.execute.mockResolvedValue({ data: [staled], total: 1 });

      const result = await controller.getPackageHistory(1, 1, 1, {
        status: 'ALL',
        sortBy: 'deactivatedAt',
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: { data: [staled], total: 1 },
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getHistoryUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.getPackageHistory(1, 1, 999, {
          status: 'ALL',
          sortBy: 'deactivatedAt',
          sortOrder: 'desc',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── createPackage ────────────────────────────────────────────────────────────

  describe('createPackage', () => {
    const dto = {
      name: 'express',
      version: '4.18.2',
      ecosystem: DependencyEcosystem.NPM,
    };

    it('returns the created package in a response envelope', async () => {
      createUseCase.execute.mockResolvedValue(mockSP);

      const result = await controller.createPackage(1, 1, 1, dto, mockReq);

      expect(result).toEqual({ success: true, error: null, data: mockSP });
      expect(createUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        actingUserId: 5,
        dto,
      });
    });

    it('propagates a ConflictException from the use case', async () => {
      createUseCase.execute.mockRejectedValue(
        new ConflictException('already active'),
      );

      await expect(
        controller.createPackage(1, 1, 1, dto, mockReq),
      ).rejects.toThrow(ConflictException);
    });

    it('propagates a NotFoundException from the use case', async () => {
      createUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.createPackage(1, 1, 999, dto, mockReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updatePackage ────────────────────────────────────────────────────────────

  describe('updatePackage', () => {
    it('returns the updated package in a response envelope', async () => {
      const updated = { ...mockSP, versionRange: '^4.19.0' };
      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.updatePackage(
        1,
        1,
        1,
        10,
        { version: '4.19.0' },
        mockReq,
      );

      expect(result).toEqual({ success: true, error: null, data: updated });
      expect(updateUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 10,
        actingUserId: 5,
        dto: { version: '4.19.0' },
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      updateUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.updatePackage(1, 1, 1, 999, { version: '4.19.0' }, mockReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates a ConflictException from the use case', async () => {
      updateUseCase.execute.mockRejectedValue(
        new ConflictException('already active'),
      );

      await expect(
        controller.updatePackage(1, 1, 1, 10, { version: '4.18.2' }, mockReq),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── deletePackage ────────────────────────────────────────────────────────────

  describe('deletePackage', () => {
    it('returns the REMOVED package in a response envelope', async () => {
      const removed = { ...mockSP, status: ServicePackageStatus.REMOVED };
      deleteUseCase.execute.mockResolvedValue(removed);

      const result = await controller.deletePackage(1, 1, 1, 10, mockReq);

      expect(result).toEqual({ success: true, error: null, data: removed });
      expect(deleteUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 10,
        actingUserId: 5,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      deleteUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.deletePackage(1, 1, 1, 999, mockReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── bulkImport ───────────────────────────────────────────────────────────────

  describe('bulkImport', () => {
    const dto = {
      ecosystem: DependencyEcosystem.NPM,
      packages: [
        { name: 'express', version: '4.18.2' },
        { name: 'lodash', version: '4.17.21' },
      ],
    };

    it('returns the import summary in a response envelope', async () => {
      const summary = { added: 2, updated: 0, unchanged: 0, staled: 0 };
      bulkImportUseCase.execute.mockResolvedValue(summary);

      const result = await controller.bulkImport(1, 1, 1, dto, mockReq);

      expect(result).toEqual({ success: true, error: null, data: summary });
      expect(bulkImportUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        actingUserId: 5,
        dto,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      bulkImportUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.bulkImport(1, 1, 999, dto, mockReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getVulnerabilities ───────────────────────────────────────────────────────

  describe('getVulnerabilities', () => {
    it('returns the vulnerability list wrapped in a response envelope', async () => {
      getVulnerabilitiesUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await controller.getVulnerabilities(
        1,
        1,
        1,
        'HIGH',
        'lodash',
      );

      expect(result).toEqual({
        success: true,
        error: null,
        data: { data: [], total: 0 },
      });
      expect(getVulnerabilitiesUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        severity: 'HIGH',
        search: 'lodash',
      });
    });
  });

  // ── updateNotificationPreference ────────────────────────────────────────────

  describe('updateNotificationPreference', () => {
    const mockState = { id: 1, muted: true, servicePackageId: 10 };

    it('returns the updated notification state in a response envelope', async () => {
      updateNotificationUseCase.execute.mockResolvedValue(mockState as any);
      const req = { user: { sub: 5 } } as any;

      const result = await controller.updateNotificationPreference(
        1,
        1,
        1,
        10,
        { action: 'MUTE' },
        req,
      );

      expect(result).toEqual({ success: true, error: null, data: mockState });
      expect(updateNotificationUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 10,
        actingUserId: 5,
        dto: { action: 'MUTE' },
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      updateNotificationUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );
      const req = { user: { sub: 5 } } as any;

      await expect(
        controller.updateNotificationPreference(
          1,
          1,
          1,
          999,
          { action: 'UNMUTE' },
          req,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── logVulnerabilityView ─────────────────────────────────────────────────────

  describe('logVulnerabilityView', () => {
    it('logs the view and returns a null-data envelope', async () => {
      logVulnerabilityViewUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.logVulnerabilityView(
        1,
        1,
        1,
        'vuln-uuid-1',
        mockReq,
      );

      expect(result).toEqual({ success: true, error: null, data: null });
      expect(logVulnerabilityViewUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        vulnerabilityId: 'vuln-uuid-1',
        actingUserId: 5,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      logVulnerabilityViewUseCase.execute.mockRejectedValue(
        new NotFoundException('not found'),
      );

      await expect(
        controller.logVulnerabilityView(1, 1, 999, 'vuln-uuid-1', mockReq),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
