import { Test, TestingModule } from '@nestjs/testing';
import {
  ActivityEventType,
  DependencyEcosystem,
  RepositoryConnectionStatus,
  RepositoryTriggerMode,
  ServiceRepositoryConnection,
} from '@aba/database';
import { RepositoryTriggerSweepService } from '@/modules/scheduler/services/repositoryTriggerSweep.service';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';

describe('RepositoryTriggerSweepService', () => {
  let service: RepositoryTriggerSweepService;
  let repositoryConnectionRepository: jest.Mocked<RepositoryConnectionRepository>;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let packageRescanSchedulerService: jest.Mocked<PackageRescanSchedulerService>;
  let activityLogRepository: jest.Mocked<ActivityLogRepository>;

  const now = new Date('2026-07-07T00:00:00.000Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  const activePackage = {
    id: 100,
    ecosystem: DependencyEcosystem.NPM,
    name: 'lodash',
    version: '4.17.15',
  };

  const mockService = {
    id: 5,
    companyId: 10,
    environmentId: 20,
    activePackages: [activePackage],
  };

  function connection(
    overrides: Partial<ServiceRepositoryConnection>,
  ): ServiceRepositoryConnection {
    return {
      id: 1,
      provider: 'GITHUB',
      owner: 'acme',
      name: 'billing-api',
      watchedBranch: 'dev',
      webhookToken: 'token-1',
      webhookSecretEnc: 'enc',
      status: RepositoryConnectionStatus.ACTIVE,
      lastPingedAt: null,
      lastTriggeredAt: null,
      triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
      pushCountThreshold: null,
      intervalDays: 7,
      pendingPushCount: 1,
      serviceId: 5,
      connectedById: 1,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as ServiceRepositoryConnection;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoryTriggerSweepService,
        {
          provide: RepositoryConnectionRepository,
          useValue: {
            findDueForTimeIntervalSweep: jest.fn(),
            recordDelivery: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ServiceRepository,
          useValue: { findByIdWithActivePackages: jest.fn() },
        },
        {
          provide: PackageRescanSchedulerService,
          useValue: { publishScanForService: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ActivityLogRepository,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(RepositoryTriggerSweepService);
    repositoryConnectionRepository = module.get(RepositoryConnectionRepository);
    serviceRepository = module.get(ServiceRepository);
    packageRescanSchedulerService = module.get(PackageRescanSchedulerService);
    activityLogRepository = module.get(ActivityLogRepository);
  });

  it('does nothing when no connections are candidates', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([]);

    await service.runOnce(now);

    expect(serviceRepository.findByIdWithActivePackages).not.toHaveBeenCalled();
    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
  });

  it('treats a connection that has never been triggered as due immediately', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
      connection({ lastTriggeredAt: null }),
    ]);
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);

    await service.runOnce(now);

    expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalledWith(
      mockService,
    );
  });

  it('skips a connection whose interval has not yet elapsed', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
      connection({
        lastTriggeredAt: new Date(now.getTime() - 1 * DAY_MS),
        intervalDays: 7,
      }),
    ]);

    await service.runOnce(now);

    expect(serviceRepository.findByIdWithActivePackages).not.toHaveBeenCalled();
    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
  });

  it('triggers a connection whose interval has fully elapsed', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
      connection({
        id: 7,
        lastTriggeredAt: new Date(now.getTime() - 8 * DAY_MS),
        intervalDays: 7,
      }),
    ]);
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(mockService);

    await service.runOnce(now);

    expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalledWith(
      mockService,
    );
    expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(7, {
      triggered: true,
    });
    expect(activityLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: mockService.companyId,
        environmentId: mockService.environmentId,
        serviceId: mockService.id,
        metadata: { via: 'time_interval_sweep', branch: 'dev' },
      }),
    );
  });

  it('defaults to a 7-day interval when intervalDays is null', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
      connection({
        lastTriggeredAt: new Date(now.getTime() - 6 * DAY_MS),
        intervalDays: null,
      }),
    ]);

    await service.runOnce(now);

    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
  });

  it('skips and logs a warning when the underlying service no longer exists', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
      connection({ lastTriggeredAt: null }),
    ]);
    serviceRepository.findByIdWithActivePackages.mockResolvedValue(null);

    await service.runOnce(now);

    expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    expect(repositoryConnectionRepository.recordDelivery).not.toHaveBeenCalled();
  });

  it('tolerates one connection failing without blocking the others', async () => {
    repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
      connection({ id: 1, lastTriggeredAt: null }),
      connection({ id: 2, lastTriggeredAt: null }),
    ]);
    serviceRepository.findByIdWithActivePackages
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(mockService);

    await expect(service.runOnce(now)).resolves.toBeUndefined();

    expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalledTimes(1);
  });

  describe('extra scenarios', () => {
    it('handleCron delegates to runOnce', async () => {
      const spy = jest.spyOn(service, 'runOnce').mockResolvedValue(undefined);

      await service.handleCron();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('treats a connection whose interval ends exactly now as due', async () => {
      repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
        connection({
          intervalDays: 7,
          lastTriggeredAt: new Date(now.getTime() - 7 * DAY_MS),
        }),
      ]);
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(
        mockService as any,
      );

      await service.runOnce(now);

      expect(packageRescanSchedulerService.publishScanForService).toHaveBeenCalledTimes(1);
    });

    it('skips a connection that is one millisecond short of its interval', async () => {
      repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
        connection({
          intervalDays: 7,
          lastTriggeredAt: new Date(now.getTime() - 7 * DAY_MS + 1),
        }),
      ]);

      await service.runOnce(now);

      expect(packageRescanSchedulerService.publishScanForService).not.toHaveBeenCalled();
    });

    it('only triggers the due connections out of a mixed batch', async () => {
      repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
        connection({
          id: 1,
          serviceId: 5,
          intervalDays: 1,
          lastTriggeredAt: new Date(now.getTime() - 2 * DAY_MS),
        }),
        connection({
          id: 2,
          serviceId: 6,
          intervalDays: 30,
          lastTriggeredAt: new Date(now.getTime() - 2 * DAY_MS),
        }),
        connection({ id: 3, serviceId: 7, lastTriggeredAt: null }),
      ]);
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(
        mockService as any,
      );

      await service.runOnce(now);

      expect(serviceRepository.findByIdWithActivePackages).toHaveBeenCalledTimes(2);
      expect(serviceRepository.findByIdWithActivePackages).toHaveBeenCalledWith(5);
      expect(serviceRepository.findByIdWithActivePackages).toHaveBeenCalledWith(7);
      expect(serviceRepository.findByIdWithActivePackages).not.toHaveBeenCalledWith(6);
    });

    it('does not record a delivery or log an activity when publishing the scan fails', async () => {
      repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
        connection({ lastTriggeredAt: null }),
      ]);
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(
        mockService as any,
      );
      packageRescanSchedulerService.publishScanForService.mockRejectedValue(
        new Error('kafka down'),
      );

      await expect(service.runOnce(now)).resolves.toBeUndefined();

      expect(repositoryConnectionRepository.recordDelivery).not.toHaveBeenCalled();
      expect(activityLogRepository.create).not.toHaveBeenCalled();
    });

    it('marks the connection as triggered (resetting its pending count) after a successful scan', async () => {
      repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
        connection({ id: 9, lastTriggeredAt: null }),
      ]);
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(
        mockService as any,
      );

      await service.runOnce(now);

      expect(repositoryConnectionRepository.recordDelivery).toHaveBeenCalledWith(9, {
        triggered: true,
      });
    });

    it('logs the branch and the time_interval_sweep trigger source', async () => {
      repositoryConnectionRepository.findDueForTimeIntervalSweep.mockResolvedValue([
        connection({ watchedBranch: 'release', lastTriggeredAt: null }),
      ]);
      serviceRepository.findByIdWithActivePackages.mockResolvedValue(
        mockService as any,
      );

      await service.runOnce(now);

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
          metadata: { via: 'time_interval_sweep', branch: 'release' },
        }),
      );
    });
  });
});
