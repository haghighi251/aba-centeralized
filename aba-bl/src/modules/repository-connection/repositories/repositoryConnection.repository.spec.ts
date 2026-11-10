import { RepositoryConnectionRepository } from './repositoryConnection.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import {
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
} from '@aba/database';

describe('RepositoryConnectionRepository', () => {
  let repository: RepositoryConnectionRepository;
  let prisma: { serviceRepositoryConnection: Record<string, jest.Mock> };

  const mockConnection = {
    id: 1,
    provider: RepositoryProvider.GITHUB,
    owner: 'acme',
    name: 'billing-api',
    watchedBranch: 'main',
    webhookToken: 'token-1',
    webhookSecretEnc: 'enc-secret',
    status: RepositoryConnectionStatus.ACTIVE,
    lastPingedAt: null,
    lastTriggeredAt: null,
    triggerMode: RepositoryTriggerMode.INSTANT,
    pushCountThreshold: null,
    intervalDays: null,
    pendingPushCount: 0,
    serviceId: 5,
    connectedById: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      serviceRepositoryConnection: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new RepositoryConnectionRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('findByServiceId', () => {
    it('looks up a connection by serviceId', async () => {
      prisma.serviceRepositoryConnection.findUnique.mockResolvedValue(
        mockConnection,
      );

      const result = await repository.findByServiceId(5);

      expect(result).toBe(mockConnection);
      expect(
        prisma.serviceRepositoryConnection.findUnique,
      ).toHaveBeenCalledWith({ where: { serviceId: 5 } });
    });

    it('returns null when no connection exists for the service', async () => {
      prisma.serviceRepositoryConnection.findUnique.mockResolvedValue(null);

      const result = await repository.findByServiceId(999);

      expect(result).toBeNull();
    });
  });

  describe('findByWebhookToken', () => {
    it('looks up a connection by webhookToken', async () => {
      prisma.serviceRepositoryConnection.findUnique.mockResolvedValue(
        mockConnection,
      );

      const result = await repository.findByWebhookToken('token-1');

      expect(result).toBe(mockConnection);
      expect(
        prisma.serviceRepositoryConnection.findUnique,
      ).toHaveBeenCalledWith({ where: { webhookToken: 'token-1' } });
    });
  });

  describe('countForCompany', () => {
    it('counts connections across every service owned by the company', async () => {
      prisma.serviceRepositoryConnection.count.mockResolvedValue(3);

      const result = await repository.countForCompany(10);

      expect(result).toBe(3);
      expect(prisma.serviceRepositoryConnection.count).toHaveBeenCalledWith({
        where: { service: { companyId: 10 } },
      });
    });
  });

  describe('create', () => {
    it('creates a connection with the given cadence settings', async () => {
      prisma.serviceRepositoryConnection.create.mockResolvedValue(
        mockConnection,
      );

      const result = await repository.create({
        provider: RepositoryProvider.GITHUB,
        owner: 'acme',
        name: 'billing-api',
        watchedBranch: 'main',
        webhookToken: 'token-1',
        webhookSecretEnc: 'enc-secret',
        serviceId: 5,
        connectedById: 1,
        triggerMode: RepositoryTriggerMode.INSTANT,
        pushCountThreshold: null,
        intervalDays: null,
      });

      expect(result).toBe(mockConnection);
      expect(prisma.serviceRepositoryConnection.create).toHaveBeenCalledWith({
        data: {
          provider: RepositoryProvider.GITHUB,
          owner: 'acme',
          name: 'billing-api',
          watchedBranch: 'main',
          webhookToken: 'token-1',
          webhookSecretEnc: 'enc-secret',
          triggerMode: RepositoryTriggerMode.INSTANT,
          pushCountThreshold: null,
          intervalDays: null,
          service: { connect: { id: 5 } },
          connectedBy: { connect: { id: 1 } },
        },
      });
    });
  });

  describe('rotateSecret', () => {
    it('updates the token, secret, and connectedBy', async () => {
      const rotated = { ...mockConnection, webhookToken: 'token-2' };
      prisma.serviceRepositoryConnection.update.mockResolvedValue(rotated);

      const result = await repository.rotateSecret(
        1,
        'token-2',
        'enc-secret-2',
        7,
      );

      expect(result).toBe(rotated);
      expect(prisma.serviceRepositoryConnection.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          webhookToken: 'token-2',
          webhookSecretEnc: 'enc-secret-2',
          connectedBy: { connect: { id: 7 } },
        },
      });
    });
  });

  describe('updateTriggerSettings', () => {
    it('updates cadence fields and resets pendingPushCount', async () => {
      const updated = {
        ...mockConnection,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
      };
      prisma.serviceRepositoryConnection.update.mockResolvedValue(updated);

      const result = await repository.updateTriggerSettings(1, {
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        pushCountThreshold: 5,
        intervalDays: null,
      });

      expect(result).toBe(updated);
      expect(prisma.serviceRepositoryConnection.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 5,
          intervalDays: null,
          pendingPushCount: 0,
        },
      });
    });
  });

  describe('recordDelivery', () => {
    it('sets lastPingedAt and lastTriggeredAt and resets pendingPushCount when triggered', async () => {
      prisma.serviceRepositoryConnection.update.mockResolvedValue(
        mockConnection,
      );

      await repository.recordDelivery(1, { triggered: true });

      const call = prisma.serviceRepositoryConnection.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 1 });
      expect(call.data.pendingPushCount).toBe(0);
      expect(call.data.lastPingedAt).toBeInstanceOf(Date);
      expect(call.data.lastTriggeredAt).toBeInstanceOf(Date);
    });

    it('sets pendingPushCount without touching lastTriggeredAt when not triggered', async () => {
      prisma.serviceRepositoryConnection.update.mockResolvedValue(
        mockConnection,
      );

      await repository.recordDelivery(1, {
        triggered: false,
        pendingPushCount: 3,
      });

      const call = prisma.serviceRepositoryConnection.update.mock.calls[0][0];
      expect(call.data.pendingPushCount).toBe(3);
      expect(call.data.lastTriggeredAt).toBeUndefined();
    });

    it('leaves pendingPushCount untouched when not triggered and no count is given (e.g. a ping event)', async () => {
      prisma.serviceRepositoryConnection.update.mockResolvedValue(
        mockConnection,
      );

      await repository.recordDelivery(1, { triggered: false });

      const call = prisma.serviceRepositoryConnection.update.mock.calls[0][0];
      expect(call.data.pendingPushCount).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes the connection', async () => {
      prisma.serviceRepositoryConnection.delete.mockResolvedValue(
        mockConnection,
      );

      const result = await repository.delete(1);

      expect(result).toBe(mockConnection);
      expect(prisma.serviceRepositoryConnection.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findDueForTimeIntervalSweep', () => {
    it('queries for active TIME_INTERVAL connections with a pending count', async () => {
      prisma.serviceRepositoryConnection.findMany.mockResolvedValue([
        mockConnection,
      ]);

      const result = await repository.findDueForTimeIntervalSweep();

      expect(result).toEqual([mockConnection]);
      expect(prisma.serviceRepositoryConnection.findMany).toHaveBeenCalledWith({
        where: {
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          status: RepositoryConnectionStatus.ACTIVE,
          pendingPushCount: { gt: 0 },
        },
      });
    });
  });
});
