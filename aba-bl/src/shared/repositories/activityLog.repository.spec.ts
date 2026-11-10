import { ActivityLogRepository } from './activityLog.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { ActivityEventType } from '@aba/database';

describe('ActivityLogRepository', () => {
  let repository: ActivityLogRepository;
  let prisma: {
    activityLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      activityLog: {
        create: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    repository = new ActivityLogRepository(prisma as unknown as PrismaService);
  });

  it('writes a row with all fields provided', async () => {
    await repository.create({
      eventType: ActivityEventType.PACKAGE_MUTED,
      actorUserId: 5,
      companyId: 1,
      environmentId: 2,
      serviceId: 3,
      servicePackageId: 10,
      metadata: { foo: 'bar' },
    });

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        eventType: ActivityEventType.PACKAGE_MUTED,
        actorUserId: 5,
        companyId: 1,
        environmentId: 2,
        serviceId: 3,
        servicePackageId: 10,
        metadata: { foo: 'bar' },
      },
    });
  });

  it('defaults optional actor/entity fields to null when omitted', async () => {
    await repository.create({
      eventType: ActivityEventType.NOTIFICATION_SENT,
      companyId: 1,
    });

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        eventType: ActivityEventType.NOTIFICATION_SENT,
        actorUserId: null,
        companyId: 1,
        environmentId: null,
        serviceId: null,
        servicePackageId: null,
        metadata: undefined,
      },
    });
  });

  describe('findAll', () => {
    it('paginates with defaults when no filter fields are given', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      const result = await repository.findAll({});

      expect(result).toEqual({ data: [], total: 0 });
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { timestamp: 'desc' },
      });
      expect(prisma.activityLog.count).toHaveBeenCalledWith({ where: {} });
    });

    it('applies company, environment, service, and event-type filters', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await repository.findAll({
        page: 2,
        limit: 10,
        companyId: 1,
        environmentId: 2,
        serviceId: 3,
        eventType: ActivityEventType.PACKAGE_MUTED,
      });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 1,
          environmentId: 2,
          serviceId: 3,
          eventType: ActivityEventType.PACKAGE_MUTED,
        },
        skip: 10,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
    });

    it('applies a time-range filter with both bounds', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-02-01T00:00:00.000Z');

      await repository.findAll({ from, to });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { gte: from, lte: to } },
        }),
      );
    });

    it('applies a time-range filter with only a lower bound', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);
      const from = new Date('2026-01-01T00:00:00.000Z');

      await repository.findAll({ from });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { gte: from } },
        }),
      );
    });
  });
});
