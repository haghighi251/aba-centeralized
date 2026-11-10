import { Test, TestingModule } from '@nestjs/testing';
import { DependencyEcosystem } from '@aba/database';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import {
  ServiceRepository,
  ServiceDueForRescan,
} from '@/modules/service/repositories/service.repository';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';
import { KAFKA_TOPICS } from '@/modules/kafka/kafka.constants';

describe('PackageRescanSchedulerService', () => {
  let service: PackageRescanSchedulerService;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let kafkaClient: jest.Mocked<KafkaClientService>;
  let mockProducerSend: jest.Mock;

  const activePackage = {
    id: 100,
    ecosystem: DependencyEcosystem.NPM,
    name: 'lodash',
    version: '4.17.15',
  };
  const now = new Date('2026-07-07T00:00:00.000Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  function candidate(
    overrides: Partial<ServiceDueForRescan>,
  ): ServiceDueForRescan {
    return {
      id: 1,
      companyId: 10,
      lastScannedAt: null,
      rescanIntervalDays: 7,
      activePackages: [activePackage],
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockProducerSend = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageRescanSchedulerService,
        {
          provide: ServiceRepository,
          useValue: { findServicesEligibleForRescan: jest.fn() },
        },
        {
          provide: KafkaClientService,
          useValue: {
            getProducer: jest
              .fn()
              .mockResolvedValue({ send: mockProducerSend }),
          },
        },
      ],
    }).compile();

    service = module.get(PackageRescanSchedulerService);
    serviceRepository = module.get(ServiceRepository);
    kafkaClient = module.get(KafkaClientService);
  });

  it('publishes package.scan for a service that has never been scanned', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([
      candidate({}),
    ]);

    await service.runOnce(now);

    expect(mockProducerSend).toHaveBeenCalledTimes(1);
    const call = mockProducerSend.mock.calls[0][0];
    expect(call.topic).toBe(KAFKA_TOPICS.PACKAGE_SCAN);
    const message = JSON.parse(call.messages[0].value);
    expect(message).toEqual({
      scanId: expect.any(String),
      companyId: 10,
      serviceId: 1,
      packages: [activePackage],
    });
  });

  it('skips a service whose last scan is still within the plan interval', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([
      candidate({
        id: 2,
        lastScannedAt: new Date(now.getTime() - 1 * DAY_MS),
        rescanIntervalDays: 7,
      }),
    ]);

    await service.runOnce(now);

    expect(mockProducerSend).not.toHaveBeenCalled();
  });

  it('publishes for a service whose last scan is exactly at the interval boundary', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([
      candidate({
        id: 3,
        lastScannedAt: new Date(now.getTime() - 7 * DAY_MS),
        rescanIntervalDays: 7,
      }),
    ]);

    await service.runOnce(now);

    expect(mockProducerSend).toHaveBeenCalledTimes(1);
  });

  it('publishes for a service whose last scan is older than the plan interval', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([
      candidate({
        id: 4,
        lastScannedAt: new Date(now.getTime() - 8 * DAY_MS),
        rescanIntervalDays: 7,
      }),
    ]);

    await service.runOnce(now);

    expect(mockProducerSend).toHaveBeenCalledTimes(1);
  });

  it('skips a due service that has zero active packages', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([
      candidate({ id: 5, activePackages: [] }),
    ]);

    await service.runOnce(now);

    expect(mockProducerSend).not.toHaveBeenCalled();
  });

  it('does not fetch a producer at all when nothing is due', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([]);

    await service.runOnce(now);

    expect(kafkaClient.getProducer).not.toHaveBeenCalled();
  });

  it('publishes independently for multiple due services, tolerating a per-service publish failure', async () => {
    serviceRepository.findServicesEligibleForRescan.mockResolvedValue([
      candidate({ id: 6, companyId: 1 }),
      candidate({ id: 7, companyId: 2 }),
    ]);
    mockProducerSend
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('broker down'));

    await expect(service.runOnce(now)).resolves.toBeUndefined();

    expect(mockProducerSend).toHaveBeenCalledTimes(2);
  });

  describe('publishScanForService', () => {
    it('publishes a package.scan message for the given service', async () => {
      await service.publishScanForService({
        id: 42,
        companyId: 10,
        activePackages: [activePackage],
      });

      expect(mockProducerSend).toHaveBeenCalledTimes(1);
      const call = mockProducerSend.mock.calls[0][0];
      expect(call.topic).toBe(KAFKA_TOPICS.PACKAGE_SCAN);
      expect(call.messages[0].key).toBe('42');
      const message = JSON.parse(call.messages[0].value);
      expect(message).toEqual({
        scanId: expect.any(String),
        companyId: 10,
        serviceId: 42,
        packages: [activePackage],
      });
    });

    it('logs and swallows a Kafka send failure instead of throwing', async () => {
      mockProducerSend.mockRejectedValueOnce(new Error('broker down'));

      await expect(
        service.publishScanForService({
          id: 1,
          companyId: 1,
          activePackages: [],
        }),
      ).resolves.toBeUndefined();
    });
  });
});
