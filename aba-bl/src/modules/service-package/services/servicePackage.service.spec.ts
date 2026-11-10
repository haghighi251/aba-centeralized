import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  DependencyEcosystem,
  Environment,
  EnvironmentStatus,
  EnvironmentType,
  Service,
  ServicePackageStatus,
  ServiceStatus,
  ServiceType,
} from '@aba/database';
import { ServicePackageService } from './servicePackage.service';
import { PackageRepository } from '@/modules/service-package/repositories/package.repository';
import { ServicePackageRepository } from '@/modules/service-package/repositories/servicePackage.repository';
import { ServicePackageNotificationStateRepository } from '@/modules/service-package/repositories/servicePackageNotificationState.repository';
import { VulnerabilityScanService } from '@/modules/service-package/services/vulnerability-scan.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { ActivityEventType } from '@aba/database';

describe('ServicePackageService', () => {
  let svc: ServicePackageService;
  let packageRepo: jest.Mocked<PackageRepository>;
  let servicePackageRepo: jest.Mocked<ServicePackageRepository>;
  let serviceRepo: jest.Mocked<ServiceRepository>;
  let environmentRepo: jest.Mocked<EnvironmentRepository>;
  let vulnerabilityScanService: jest.Mocked<VulnerabilityScanService>;
  let notificationStateRepo: jest.Mocked<ServicePackageNotificationStateRepository>;
  let activityLogRepo: jest.Mocked<ActivityLogRepository>;

  const mockEnvironment: Environment = {
    id: 1,
    name: 'Production',
    slug: 'production',
    type: EnvironmentType.PRODUCTION,
    isProduction: true,
    order: 1,
    description: null,
    status: EnvironmentStatus.ACTIVE,
    companyId: 1,
    teamId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Environment;

  const mockService: Service = {
    id: 1,
    name: 'API GW',
    slug: 'api-gw',
    type: ServiceType.API_GATEWAY,
    description: null,
    baseUrl: 'https://api.example.com',
    rateLimitConfig: null,
    status: ServiceStatus.ACTIVE,
    companyId: 1,
    environmentId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as unknown as Service;

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
      providers: [
        ServicePackageService,
        {
          provide: PackageRepository,
          useValue: { findOrCreate: jest.fn() },
        },
        {
          provide: ServicePackageRepository,
          useValue: {
            findActive: jest.fn(),
            findHistory: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findActiveByServiceAndPackageName: jest.fn(),
            markAsStale: jest.fn(),
            markAsRemoved: jest.fn(),
          },
        },
        {
          provide: ServiceRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: EnvironmentRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: VulnerabilityScanService,
          useValue: { scanPackages: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ServicePackageNotificationStateRepository,
          useValue: { mute: jest.fn(), unmute: jest.fn(), snooze: jest.fn() },
        },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    svc = module.get(ServicePackageService);
    packageRepo = module.get(PackageRepository);
    servicePackageRepo = module.get(ServicePackageRepository);
    serviceRepo = module.get(ServiceRepository);
    environmentRepo = module.get(EnvironmentRepository);
    vulnerabilityScanService = module.get(VulnerabilityScanService);
    notificationStateRepo = module.get(
      ServicePackageNotificationStateRepository,
    );
    activityLogRepo = module.get(ActivityLogRepository);
  });

  function seedValidServiceLookup() {
    environmentRepo.findById.mockResolvedValue(mockEnvironment);
    serviceRepo.findById.mockResolvedValue(mockService);
  }

  // ── getActivePackages ───────────────────────────────────────────────────────

  describe('getActivePackages', () => {
    it('returns the active package list for the service', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findActive.mockResolvedValue({
        data: [mockSP],
        total: 1,
      });

      const result = await svc.getActivePackages({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ data: [mockSP], total: 1 });
      }
    });

    it('returns NotFoundException when environment not found', async () => {
      environmentRepo.findById.mockResolvedValue(null);

      const result = await svc.getActivePackages({
        companyId: 1,
        environmentId: 999,
        serviceId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when service belongs to a different environment', async () => {
      environmentRepo.findById.mockResolvedValue(mockEnvironment);
      serviceRepo.findById.mockResolvedValue({
        ...mockService,
        environmentId: 99,
      });

      const result = await svc.getActivePackages({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });

  // ── getPackageHistory ────────────────────────────────────────────────────────

  describe('getPackageHistory', () => {
    it('returns history rows for the service', async () => {
      seedValidServiceLookup();
      const staled = { ...mockSP, status: ServicePackageStatus.STALE };
      servicePackageRepo.findHistory.mockResolvedValue({
        data: [staled],
        total: 1,
      });

      const result = await svc.getPackageHistory({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        status: 'ALL',
        sortBy: 'deactivatedAt',
        sortOrder: 'desc',
      });

      expect(result.isOk()).toBe(true);
    });

    it('returns NotFoundException when service not found', async () => {
      environmentRepo.findById.mockResolvedValue(mockEnvironment);
      serviceRepo.findById.mockResolvedValue(null);

      const result = await svc.getPackageHistory({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        status: 'ALL',
        sortBy: 'deactivatedAt',
        sortOrder: 'desc',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });

  // ── createPackage ────────────────────────────────────────────────────────────

  describe('createPackage', () => {
    it('creates an ACTIVE row when no existing active package with that name', async () => {
      seedValidServiceLookup();
      packageRepo.findOrCreate.mockResolvedValue(mockPkg);
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        null,
      );
      servicePackageRepo.create.mockResolvedValue(mockSP);

      const result = await svc.createPackage(1, 1, 1, 5, {
        name: 'express',
        version: '4.18.2',
        ecosystem: DependencyEcosystem.NPM,
      });

      expect(result.isOk()).toBe(true);
      expect(servicePackageRepo.markAsStale).not.toHaveBeenCalled();
      expect(servicePackageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ package: { connect: { id: 1 } } }),
      );
      expect(vulnerabilityScanService.scanPackages).toHaveBeenCalledWith(
        [mockPkg],
        1,
        1,
      );
      expect(activityLogRepo.create).not.toHaveBeenCalled();
    });

    it('stales the existing row and creates a new one when version differs', async () => {
      seedValidServiceLookup();
      const oldPkg = { ...mockPkg, id: 2, version: '4.17.0' };
      const newPkg = { ...mockPkg, id: 1, version: '4.18.2' };
      const existingSP = { ...mockSP, id: 9, packageId: 2, package: oldPkg };

      packageRepo.findOrCreate.mockResolvedValue(newPkg);
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        existingSP,
      );
      servicePackageRepo.markAsStale.mockResolvedValue({
        ...existingSP,
        status: ServicePackageStatus.STALE,
      });
      servicePackageRepo.create.mockResolvedValue(mockSP);

      const result = await svc.createPackage(1, 1, 1, 5, {
        name: 'express',
        version: '4.18.2',
        ecosystem: DependencyEcosystem.NPM,
      });

      expect(result.isOk()).toBe(true);
      expect(servicePackageRepo.markAsStale).toHaveBeenCalledWith(9);
      expect(servicePackageRepo.create).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.PACKAGE_UPDATED,
        actorUserId: 5,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: mockSP.id,
        metadata: { packageName: newPkg.name, newVersion: newPkg.version },
      });
    });

    it('returns ConflictException when the same version is already active', async () => {
      seedValidServiceLookup();
      packageRepo.findOrCreate.mockResolvedValue(mockPkg);
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        mockSP,
      );

      const result = await svc.createPackage(1, 1, 1, 5, {
        name: 'express',
        version: '4.18.2',
        ecosystem: DependencyEcosystem.NPM,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictException);
    });

    it('returns NotFoundException when environment not found', async () => {
      environmentRepo.findById.mockResolvedValue(null);

      const result = await svc.createPackage(1, 999, 1, 5, {
        name: 'express',
        version: '4.18.2',
        ecosystem: DependencyEcosystem.NPM,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });

  // ── updatePackage ────────────────────────────────────────────────────────────

  describe('updatePackage', () => {
    it('updates versionRange in place when version is unchanged', async () => {
      seedValidServiceLookup();
      const updated = { ...mockSP, versionRange: '^4.19.0' };
      servicePackageRepo.findById.mockResolvedValue(mockSP);
      servicePackageRepo.update.mockResolvedValue(updated);

      const result = await svc.updatePackage(1, 1, 1, 10, 5, {
        versionRange: '^4.19.0',
      });

      expect(result.isOk()).toBe(true);
      expect(servicePackageRepo.update).toHaveBeenCalledWith(10, {
        versionRange: '^4.19.0',
      });
      expect(servicePackageRepo.markAsStale).not.toHaveBeenCalled();
      expect(activityLogRepo.create).not.toHaveBeenCalled();
    });

    it('stales current row, creates new one, and logs PACKAGE_UPDATED when version changes', async () => {
      seedValidServiceLookup();
      const newPkg = { ...mockPkg, id: 2, version: '4.19.0' };
      servicePackageRepo.findById.mockResolvedValue(mockSP);
      packageRepo.findOrCreate.mockResolvedValue(newPkg);
      servicePackageRepo.markAsStale.mockResolvedValue({
        ...mockSP,
        status: ServicePackageStatus.STALE,
      });
      const newSP = { ...mockSP, id: 11, packageId: 2, package: newPkg };
      servicePackageRepo.create.mockResolvedValue(newSP);

      const result = await svc.updatePackage(1, 1, 1, 10, 5, {
        version: '4.19.0',
      });

      expect(result.isOk()).toBe(true);
      expect(servicePackageRepo.markAsStale).toHaveBeenCalledWith(10);
      expect(servicePackageRepo.create).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.PACKAGE_UPDATED,
        actorUserId: 5,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: newSP.id,
        metadata: {
          packageName: mockSP.package.name,
          previousVersion: mockSP.package.version,
          newVersion: '4.19.0',
        },
      });
    });

    it('returns NotFoundException when the active service package is not found', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(null);

      const result = await svc.updatePackage(1, 1, 1, 999, 5, {
        version: '4.19.0',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the row belongs to a different service', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue({
        ...mockSP,
        serviceId: 99,
      });

      const result = await svc.updatePackage(1, 1, 1, 10, 5, {
        version: '4.19.0',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the row is not ACTIVE', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue({
        ...mockSP,
        status: ServicePackageStatus.STALE,
      });

      const result = await svc.updatePackage(1, 1, 1, 10, 5, {
        version: '4.19.0',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });

  // ── removePackage ────────────────────────────────────────────────────────────

  describe('removePackage', () => {
    it('marks the active row as REMOVED', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(mockSP);
      const removed = { ...mockSP, status: ServicePackageStatus.REMOVED };
      servicePackageRepo.markAsRemoved.mockResolvedValue(removed);

      const result = await svc.removePackage(1, 1, 1, 10, 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe(ServicePackageStatus.REMOVED);
      }
      expect(servicePackageRepo.markAsRemoved).toHaveBeenCalledWith(10);
      expect(activityLogRepo.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.PACKAGE_REMOVED,
        actorUserId: 5,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: mockSP.id,
        metadata: {
          packageName: mockSP.package.name,
          version: mockSP.package.version,
        },
      });
    });

    it('returns NotFoundException when the active service package is not found', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(null);

      const result = await svc.removePackage(1, 1, 1, 999, 5);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the row is not ACTIVE', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue({
        ...mockSP,
        status: ServicePackageStatus.REMOVED,
      });

      const result = await svc.removePackage(1, 1, 1, 10, 5);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });

  // ── bulkImport ───────────────────────────────────────────────────────────────

  describe('bulkImport', () => {
    it('reports new packages as added', async () => {
      seedValidServiceLookup();
      packageRepo.findOrCreate.mockResolvedValue(mockPkg);
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        null,
      );
      servicePackageRepo.create.mockResolvedValue(mockSP);

      const result = await svc.bulkImport(1, 1, 1, 5, DependencyEcosystem.NPM, [
        { name: 'express', version: '4.18.2' },
        { name: 'lodash', version: '4.17.21' },
      ]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          added: 2,
          updated: 0,
          unchanged: 0,
          staled: 0,
        });
      }
      expect(activityLogRepo.create).not.toHaveBeenCalled();
    });

    it('reports unchanged packages when the same version is already active', async () => {
      seedValidServiceLookup();
      packageRepo.findOrCreate.mockResolvedValue(mockPkg);
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        mockSP,
      );

      const result = await svc.bulkImport(1, 1, 1, 5, DependencyEcosystem.NPM, [
        { name: 'express', version: '4.18.2' },
      ]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          added: 0,
          updated: 0,
          unchanged: 1,
          staled: 0,
        });
      }
    });

    it('stales the old version, adds the new one, and logs PACKAGE_UPDATED when version differs', async () => {
      seedValidServiceLookup();
      const oldPkg = { ...mockPkg, id: 2, version: '4.17.0' };
      const newPkg = { ...mockPkg, id: 1, version: '4.18.2' };
      const existingSP = { ...mockSP, packageId: 2, package: oldPkg };

      packageRepo.findOrCreate.mockResolvedValue(newPkg);
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        existingSP,
      );
      servicePackageRepo.markAsStale.mockResolvedValue({
        ...existingSP,
        status: ServicePackageStatus.STALE,
      });
      servicePackageRepo.create.mockResolvedValue(mockSP);

      const result = await svc.bulkImport(1, 1, 1, 5, DependencyEcosystem.NPM, [
        { name: 'express', version: '4.18.2' },
      ]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          added: 1,
          updated: 0,
          unchanged: 0,
          staled: 1,
        });
      }
      expect(activityLogRepo.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.PACKAGE_UPDATED,
        actorUserId: 5,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: mockSP.id,
        metadata: {
          packageName: 'express',
          previousVersion: oldPkg.version,
          newVersion: '4.18.2',
          via: 'bulk_import',
        },
      });
    });

    it('reports updated when only versionRange changes on an unchanged version', async () => {
      seedValidServiceLookup();
      packageRepo.findOrCreate.mockResolvedValue(mockPkg);
      const existingSP = { ...mockSP, versionRange: '^4.17.0' };
      servicePackageRepo.findActiveByServiceAndPackageName.mockResolvedValue(
        existingSP,
      );
      servicePackageRepo.update.mockResolvedValue({
        ...existingSP,
        versionRange: '^4.18.0',
      });

      const result = await svc.bulkImport(1, 1, 1, 5, DependencyEcosystem.NPM, [
        { name: 'express', version: '4.18.2', versionRange: '^4.18.0' },
      ]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.updated).toBe(1);
      }
      expect(activityLogRepo.create).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the service is not found', async () => {
      environmentRepo.findById.mockResolvedValue(null);

      const result = await svc.bulkImport(
        1,
        1,
        999,
        5,
        DependencyEcosystem.NPM,
        [{ name: 'express', version: '4.18.2' }],
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });

  // ── updateNotificationPreference ────────────────────────────────────────────

  describe('updateNotificationPreference', () => {
    const mockState = {
      id: 1,
      muted: false,
      mutedAt: null,
      mutedByUserId: null,
      lastNotifiedAt: null,
      nextNotifyAt: null,
      servicePackageId: 10,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    it('mutes the package and logs a PACKAGE_MUTED activity entry', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(mockSP);
      notificationStateRepo.mute.mockResolvedValue({
        ...mockState,
        muted: true,
        mutedByUserId: 5,
      });

      const result = await svc.updateNotificationPreference(1, 1, 1, 10, 5, {
        action: 'MUTE',
      });

      expect(result.isOk()).toBe(true);
      expect(notificationStateRepo.mute).toHaveBeenCalledWith(10, 5);
      expect(activityLogRepo.create).toHaveBeenCalledWith({
        eventType: ActivityEventType.PACKAGE_MUTED,
        actorUserId: 5,
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 10,
        metadata: undefined,
      });
    });

    it('unmutes the package and logs a PACKAGE_UNMUTED activity entry', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(mockSP);
      notificationStateRepo.unmute.mockResolvedValue(mockState);

      const result = await svc.updateNotificationPreference(1, 1, 1, 10, 5, {
        action: 'UNMUTE',
      });

      expect(result.isOk()).toBe(true);
      expect(notificationStateRepo.unmute).toHaveBeenCalledWith(10);
      expect(activityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.PACKAGE_UNMUTED,
        }),
      );
    });

    it('snoozes the package until the given date and logs it in the metadata', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(mockSP);
      const until = new Date('2026-08-15T00:00:00.000Z');
      notificationStateRepo.snooze.mockResolvedValue({
        ...mockState,
        nextNotifyAt: until,
      });

      const result = await svc.updateNotificationPreference(1, 1, 1, 10, 5, {
        action: 'SNOOZE',
        until,
      });

      expect(result.isOk()).toBe(true);
      expect(notificationStateRepo.snooze).toHaveBeenCalledWith(10, until);
      expect(activityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.PACKAGE_SNOOZED,
          metadata: { until: until.toISOString() },
        }),
      );
    });

    it('returns NotFoundException when the service package does not exist', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue(null);

      const result = await svc.updateNotificationPreference(1, 1, 1, 999, 5, {
        action: 'MUTE',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
      expect(notificationStateRepo.mute).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the package belongs to a different service', async () => {
      seedValidServiceLookup();
      servicePackageRepo.findById.mockResolvedValue({
        ...mockSP,
        serviceId: 99,
      });

      const result = await svc.updateNotificationPreference(1, 1, 1, 10, 5, {
        action: 'MUTE',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });

    it('returns NotFoundException when the environment/service is not found', async () => {
      environmentRepo.findById.mockResolvedValue(null);

      const result = await svc.updateNotificationPreference(1, 1, 999, 10, 5, {
        action: 'MUTE',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundException);
    });
  });
});
