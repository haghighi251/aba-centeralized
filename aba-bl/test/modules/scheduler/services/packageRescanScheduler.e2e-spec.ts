import { Test, TestingModule } from '@nestjs/testing';
import { DependencyEcosystem } from '@aba/database';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import {
  ServiceRepository,
  ServiceDueForRescan,
} from '@/modules/service/repositories/service.repository';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';
import { KAFKA_TOPICS } from '@/modules/kafka/kafka.constants';

/**
 * "E2E" here means the real PackageRescanSchedulerService wired up through
 * Nest's DI container, exercising the whole scheduler -> repository ->
 * Kafka-producer call chain for every eligibility/freshness scenario. Only
 * the repository (DB access) and the Kafka producer itself are mocked —
 * there's no live Kafka broker or Postgres in this test, matching this
 * repo's existing e2e-spec convention of mocking repositories rather than
 * hitting real infrastructure.
 */
describe('PackageRescanSchedulerService (e2e)', () => {
  let moduleRef: TestingModule;
  let scheduler: PackageRescanSchedulerService;
  let mockServiceRepo: { findServicesEligibleForRescan: jest.Mock };
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
    mockServiceRepo = { findServicesEligibleForRescan: jest.fn() };
    mockProducerSend = jest.fn().mockResolvedValue(undefined);

    moduleRef = await Test.createTestingModule({
      providers: [
        PackageRescanSchedulerService,
        { provide: ServiceRepository, useValue: mockServiceRepo },
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

    scheduler = moduleRef.get(PackageRescanSchedulerService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('publishes package.scan for every due service and skips every non-due one in a single tick', async () => {
    mockServiceRepo.findServicesEligibleForRescan.mockResolvedValue([
      candidate({ id: 1, lastScannedAt: null }), // never scanned -> due
      candidate({ id: 2, lastScannedAt: new Date(now.getTime() - 1 * DAY_MS) }), // fresh -> not due
      candidate({ id: 3, lastScannedAt: new Date(now.getTime() - 8 * DAY_MS) }), // stale -> due
      candidate({ id: 4, activePackages: [] }), // due but nothing to scan -> skipped
    ]);

    await scheduler.runOnce(now);

    expect(mockProducerSend).toHaveBeenCalledTimes(2);

    const publishedServiceIds = mockProducerSend.mock.calls
      .map((call) => JSON.parse(call[0].messages[0].value).serviceId)
      .sort();
    expect(publishedServiceIds).toEqual([1, 3]);

    for (const call of mockProducerSend.mock.calls) {
      expect(call[0].topic).toBe(KAFKA_TOPICS.PACKAGE_SCAN);
      const message = JSON.parse(call[0].messages[0].value);
      expect(message.packages).toEqual([activePackage]);
      expect(typeof message.scanId).toBe('string');
    }
  });

  it('publishes nothing and never fetches a producer when the repository returns no eligible services', async () => {
    mockServiceRepo.findServicesEligibleForRescan.mockResolvedValue([]);

    await scheduler.runOnce(now);

    expect(mockProducerSend).not.toHaveBeenCalled();
  });
});
