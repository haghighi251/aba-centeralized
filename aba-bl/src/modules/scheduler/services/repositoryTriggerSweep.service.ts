import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityEventType } from '@aba/database';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Daily sweep for ServiceRepositoryConnection rows in TIME_INTERVAL mode.
 * The GitHub webhook (GithubWebhookController) only ever accumulates
 * pendingPushCount for these — this is the only place that decides "enough
 * time has passed, and something actually happened, so scan now."
 *
 * Distinct from PackageRescanSchedulerService's own cron tick: that one
 * scans every service on the company's promised plan interval regardless
 * of GitHub activity; this one only fires for a connection that's had at
 * least one un-scanned matching push since its last scan.
 */
@Injectable()
export class RepositoryTriggerSweepService {
  private readonly logger = new Logger(RepositoryTriggerSweepService.name);

  constructor(
    private readonly repositoryConnectionRepository: RepositoryConnectionRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly packageRescanSchedulerService: PackageRescanSchedulerService,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  @Cron(
    process.env.REPOSITORY_TRIGGER_SWEEP_CRON ||
      CronExpression.EVERY_DAY_AT_1AM,
  )
  async handleCron(): Promise<void> {
    await this.runOnce();
  }

  /**
   * Exposed separately from handleCron() so tests can trigger a tick
   * without waiting on @Cron, same pattern as PackageRescanSchedulerService.
   */
  async runOnce(now: Date = new Date()): Promise<void> {
    const candidates =
      await this.repositoryConnectionRepository.findDueForTimeIntervalSweep();
    const due = candidates.filter((connection) =>
      this.isDue(connection.lastTriggeredAt, connection.intervalDays, now),
    );

    if (!due.length) {
      this.logger.debug(
        'No repository connections due for a time-interval scan this tick.',
      );
      return;
    }

    await Promise.allSettled(due.map((connection) => this.triggerOne(connection)));

    this.logger.log(`Triggered ${due.length} time-interval repository scan(s).`);
  }

  private async triggerOne(connection: {
    id: number;
    serviceId: number;
    watchedBranch: string;
  }): Promise<void> {
    try {
      const service = await this.serviceRepository.findByIdWithActivePackages(
        connection.serviceId,
      );
      if (!service) {
        this.logger.warn(
          `Skipping repository connection ${connection.id}: service ${connection.serviceId} no longer exists.`,
        );
        return;
      }

      await this.packageRescanSchedulerService.publishScanForService(service);
      await this.repositoryConnectionRepository.recordDelivery(connection.id, {
        triggered: true,
      });
      await this.activityLogRepository.create({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: service.companyId,
        environmentId: service.environmentId,
        serviceId: service.id,
        metadata: { via: 'time_interval_sweep', branch: connection.watchedBranch },
      });
    } catch (error) {
      this.logger.error(
        `Failed to sweep-trigger repository connection ${connection.id}`,
        error?.message,
      );
    }
  }

  private isDue(
    lastTriggeredAt: Date | null,
    intervalDays: number | null,
    now: Date,
  ): boolean {
    if (!lastTriggeredAt) return true;
    const days = intervalDays ?? 7;
    const dueAt = lastTriggeredAt.getTime() + days * MS_PER_DAY;
    return dueAt <= now.getTime();
  }
}
