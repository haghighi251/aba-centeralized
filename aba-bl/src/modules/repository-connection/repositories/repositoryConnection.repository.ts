import { Injectable } from '@nestjs/common';
import {
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
  ServiceRepositoryConnection,
} from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

export type CreateRepositoryConnectionInput = {
  provider: RepositoryProvider;
  owner: string;
  name: string;
  watchedBranch: string;
  webhookToken: string;
  webhookSecretEnc: string;
  serviceId: number;
  connectedById: number;
  triggerMode: RepositoryTriggerMode;
  pushCountThreshold: number | null;
  intervalDays: number | null;
};

/**
 * Not a BaseRepository — like ServicePackageNotificationStateRepository, this
 * table isn't a listable/filterable resource: it's a per-service singleton
 * (serviceId is unique) plus a lookup-by-token path the webhook module needs.
 */
@Injectable()
export class RepositoryConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByServiceId(
    serviceId: number,
  ): Promise<ServiceRepositoryConnection | null> {
    return this.prisma.serviceRepositoryConnection.findUnique({
      where: { serviceId },
    });
  }

  async findByWebhookToken(
    webhookToken: string,
  ): Promise<ServiceRepositoryConnection | null> {
    return this.prisma.serviceRepositoryConnection.findUnique({
      where: { webhookToken },
    });
  }

  /**
   * Count of connections across every service owned by this company, for
   * enforcing SubscriptionPlan.maxMonitoredBranches at creation time.
   */
  async countForCompany(companyId: number): Promise<number> {
    return this.prisma.serviceRepositoryConnection.count({
      where: { service: { companyId } },
    });
  }

  async create(
    data: CreateRepositoryConnectionInput,
  ): Promise<ServiceRepositoryConnection> {
    return this.prisma.serviceRepositoryConnection.create({
      data: {
        provider: data.provider,
        owner: data.owner,
        name: data.name,
        watchedBranch: data.watchedBranch,
        webhookToken: data.webhookToken,
        webhookSecretEnc: data.webhookSecretEnc,
        triggerMode: data.triggerMode,
        pushCountThreshold: data.pushCountThreshold,
        intervalDays: data.intervalDays,
        service: { connect: { id: data.serviceId } },
        connectedBy: { connect: { id: data.connectedById } },
      },
    });
  }

  async rotateSecret(
    id: number,
    webhookToken: string,
    webhookSecretEnc: string,
    connectedById: number,
  ): Promise<ServiceRepositoryConnection> {
    return this.prisma.serviceRepositoryConnection.update({
      where: { id },
      data: {
        webhookToken,
        webhookSecretEnc,
        connectedBy: { connect: { id: connectedById } },
      },
    });
  }

  async updateTriggerSettings(
    id: number,
    settings: {
      triggerMode: RepositoryTriggerMode;
      pushCountThreshold: number | null;
      intervalDays: number | null;
    },
  ): Promise<ServiceRepositoryConnection> {
    return this.prisma.serviceRepositoryConnection.update({
      where: { id },
      data: {
        triggerMode: settings.triggerMode,
        pushCountThreshold: settings.pushCountThreshold,
        intervalDays: settings.intervalDays,
        // Changing cadence starts a fresh batching window — an old
        // pending count under the previous mode/threshold isn't
        // meaningful under the new one.
        pendingPushCount: 0,
      },
    });
  }

  /**
   * Records a verified webhook delivery. `pendingPushCount`, when given,
   * overwrites the counter (the webhook controller passes the
   * already-incremented value for a matching push/release, or omits it for
   * non-matching events like `ping`). `triggered: true` always resets it to
   * 0 regardless, since a scan just consumed whatever had accumulated.
   */
  async recordDelivery(
    id: number,
    {
      triggered,
      pendingPushCount,
    }: { triggered: boolean; pendingPushCount?: number },
  ): Promise<void> {
    const now = new Date();
    await this.prisma.serviceRepositoryConnection.update({
      where: { id },
      data: {
        lastPingedAt: now,
        pendingPushCount: triggered ? 0 : pendingPushCount,
        ...(triggered && { lastTriggeredAt: now }),
      },
    });
  }

  async delete(id: number): Promise<ServiceRepositoryConnection> {
    return this.prisma.serviceRepositoryConnection.delete({ where: { id } });
  }

  /**
   * Candidates for RepositoryTriggerSweepService: TIME_INTERVAL connections
   * that have accumulated at least one un-scanned matching push. Whether
   * enough of intervalDays has actually elapsed varies per row, so — same
   * pattern as ServiceRepository.findServicesEligibleForRescan() — that
   * freshness check happens in the caller, not this WHERE clause.
   */
  async findDueForTimeIntervalSweep(): Promise<ServiceRepositoryConnection[]> {
    return this.prisma.serviceRepositoryConnection.findMany({
      where: {
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
        status: RepositoryConnectionStatus.ACTIVE,
        pendingPushCount: { gt: 0 },
      },
    });
  }
}
