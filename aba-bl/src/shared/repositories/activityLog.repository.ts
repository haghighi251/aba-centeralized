import { Injectable } from '@nestjs/common';
import { ActivityEventType, ActivityLog, Prisma } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

export interface CreateActivityLogInput {
  eventType: ActivityEventType;
  actorUserId?: number | null;
  companyId: number;
  environmentId?: number | null;
  serviceId?: number | null;
  servicePackageId?: number | null;
  metadata?: Prisma.InputJsonValue;
}

export interface ActivityLogFilter {
  page?: number;
  limit?: number;
  companyId?: number;
  environmentId?: number;
  serviceId?: number;
  eventType?: ActivityEventType;
  from?: Date;
  to?: Date;
}

/**
 * Generic audit trail: "actor did eventType to this entity at this time."
 * Distinct from the pre-existing Log model, which is purely technical/error
 * logging. Written from multiple modules (service-package actions, admin
 * reporting reads it back) — kept in shared/ rather than any one module.
 */
@Injectable()
export class ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateActivityLogInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        companyId: input.companyId,
        environmentId: input.environmentId ?? null,
        serviceId: input.serviceId ?? null,
        servicePackageId: input.servicePackageId ?? null,
        metadata: input.metadata,
      },
    });
  }

  /**
   * Paginated, filterable feed for the admin log-browser screen — by
   * company, company+environment, service, event type, and/or time range.
   */
  async findAll(
    filter: ActivityLogFilter,
  ): Promise<{ data: ActivityLog[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      companyId,
      environmentId,
      serviceId,
      eventType,
      from,
      to,
    } = filter;

    const where: Prisma.ActivityLogWhereInput = {
      ...(companyId !== undefined && { companyId }),
      ...(environmentId !== undefined && { environmentId }),
      ...(serviceId !== undefined && { serviceId }),
      ...(eventType !== undefined && { eventType }),
      ...((from || to) && {
        timestamp: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, total };
  }
}
