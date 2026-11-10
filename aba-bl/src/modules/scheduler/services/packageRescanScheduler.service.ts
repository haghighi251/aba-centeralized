import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';
import { KAFKA_TOPICS } from '@/modules/kafka/kafka.constants';
import { PackageScanMessage } from '@/modules/kafka/types/packageScanMessages';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The "Scheduler" module named in aba-bl/CLAUDE.md: on a cron tick, finds
 * every active service whose company's subscription plan promises automatic
 * rescanning (SubscriptionPlan.rescanIntervalDays) and whose last full scan
 * (Service.lastScannedAt) is overdue, then publishes one package.scan event
 * per due service for the Vulnerability Fetcher Worker to pick up.
 *
 * This is entirely separate from the manual add-package/bulk-import scan
 * path (VulnerabilityScanService.scanPackages) — that one only checks
 * newly-changed packages in-process and is left untouched. Only this
 * scheduled path can fulfil a plan's "promised timerange" guarantee, since
 * it's the only one that checks the service's *entire* active package set.
 */
@Injectable()
export class PackageRescanSchedulerService {
  private readonly logger = new Logger(PackageRescanSchedulerService.name);

  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly kafkaClient: KafkaClientService,
  ) {}

  @Cron(process.env.RESCAN_POLL_CRON || CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    await this.runOnce();
  }

  /**
   * Exposed separately from handleCron() so tests (and a future manual
   * "run now" admin action) can trigger a tick without waiting on @Cron.
   */
  async runOnce(now: Date = new Date()): Promise<void> {
    const candidates =
      await this.serviceRepository.findServicesEligibleForRescan();
    const dueServices = candidates.filter(
      (service) =>
        this.isDue(service.lastScannedAt, service.rescanIntervalDays, now) &&
        service.activePackages.length > 0,
    );

    if (!dueServices.length) {
      this.logger.debug('No services due for a plan-driven rescan this tick.');
      return;
    }

    await Promise.allSettled(
      dueServices.map((service) => this.publishScanForService(service)),
    );

    this.logger.log(
      `Published package.scan for ${dueServices.length} due service(s).`,
    );
  }

  /**
   * Publishes a single package.scan message for one service. Shared by the
   * cron path above (one call per due service) and the GitHub-webhook
   * trigger path (RepositoryConnection scan-on-publish), so both routes to
   * "rescan this service's currently-registered packages" go through the
   * exact same message shape and topic. Never throws — a Kafka failure is
   * logged and swallowed so callers (e.g. a webhook handler that must still
   * answer GitHub with 200) don't have to handle it specially.
   */
  async publishScanForService(service: {
    id: number;
    companyId: number;
    activePackages: PackageScanMessage['packages'];
  }): Promise<void> {
    const producer = await this.kafkaClient.getProducer();
    const message: PackageScanMessage = {
      scanId: randomUUID(),
      companyId: service.companyId,
      serviceId: service.id,
      packages: service.activePackages,
    };

    await producer
      .send({
        topic: KAFKA_TOPICS.PACKAGE_SCAN,
        messages: [
          { key: String(service.id), value: JSON.stringify(message) },
        ],
      })
      .catch((error) => {
        this.logger.error(
          `Failed to publish package.scan for service ${service.id}`,
          error?.message,
        );
      });
  }

  private isDue(
    lastScannedAt: Date | null,
    rescanIntervalDays: number,
    now: Date,
  ): boolean {
    if (!lastScannedAt) return true;
    const dueAt = lastScannedAt.getTime() + rescanIntervalDays * MS_PER_DAY;
    return dueAt <= now.getTime();
  }
}
