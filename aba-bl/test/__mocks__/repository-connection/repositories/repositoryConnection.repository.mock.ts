import {
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
  ServiceRepositoryConnection,
} from '@aba/database';
import {
  CreateRepositoryConnectionInput,
  RepositoryConnectionRepository,
} from '@/modules/repository-connection/repositories/repositoryConnection.repository';

export type MockedRepositoryConnectionRepository = {
  [K in keyof RepositoryConnectionRepository]: jest.Mock;
} & {
  /** Test-only: direct access to the rows, keyed by connection id. */
  rows: Map<number, ServiceRepositoryConnection>;
  /** Test-only: seed a row without going through create(). */
  seed: (
    overrides?: Partial<ServiceRepositoryConnection>,
  ) => ServiceRepositoryConnection;
};

/**
 * Stateful in-memory stand-in for RepositoryConnectionRepository so e2e tests
 * can drive whole create -> read -> rotate -> update -> delete flows (and the
 * webhook endpoint that looks rows up by token) without PostgreSQL. It
 * mirrors the real Prisma repository's semantics: serviceId and webhookToken
 * are unique, updateTriggerSettings resets pendingPushCount, and
 * recordDelivery resets it when a scan was triggered.
 *
 * `companyIdForService` tells countForCompany which company owns a service
 * (the real query joins through Service).
 */
export function createRepositoryConnectionRepositoryMock(
  companyIdForService: (serviceId: number) => number = () => 1,
): MockedRepositoryConnectionRepository {
  const rows = new Map<number, ServiceRepositoryConnection>();
  let nextId = 1;

  const byService = (serviceId: number) =>
    [...rows.values()].find((row) => row.serviceId === serviceId) ?? null;

  const seed = (overrides: Partial<ServiceRepositoryConnection> = {}) => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const row = {
      id: nextId++,
      provider: RepositoryProvider.GITHUB,
      owner: 'acme',
      name: 'billing-api',
      watchedBranch: 'main',
      webhookToken: `token-${nextId}`,
      webhookSecretEnc: 'enc(seed-secret)',
      status: RepositoryConnectionStatus.ACTIVE,
      lastPingedAt: null,
      lastTriggeredAt: null,
      triggerMode: RepositoryTriggerMode.INSTANT,
      pushCountThreshold: null,
      intervalDays: null,
      pendingPushCount: 0,
      serviceId: 1,
      connectedById: 10,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as ServiceRepositoryConnection;
    rows.set(row.id, row);
    return row;
  };

  const mock = {
    rows,
    seed,
    findByServiceId: jest.fn(async (serviceId: number) => byService(serviceId)),
    findByWebhookToken: jest.fn(
      async (token: string) =>
        [...rows.values()].find((row) => row.webhookToken === token) ?? null,
    ),
    countForCompany: jest.fn(
      async (companyId: number) =>
        [...rows.values()].filter(
          (row) => companyIdForService(row.serviceId) === companyId,
        ).length,
    ),
    create: jest.fn(async (data: CreateRepositoryConnectionInput) => {
      const now = new Date();
      const row = {
        id: nextId++,
        provider: data.provider ?? RepositoryProvider.GITHUB,
        owner: data.owner,
        name: data.name,
        watchedBranch: data.watchedBranch,
        webhookToken: data.webhookToken,
        webhookSecretEnc: data.webhookSecretEnc,
        status: RepositoryConnectionStatus.ACTIVE,
        lastPingedAt: null,
        lastTriggeredAt: null,
        triggerMode: data.triggerMode,
        pushCountThreshold: data.pushCountThreshold,
        intervalDays: data.intervalDays,
        pendingPushCount: 0,
        serviceId: data.serviceId,
        connectedById: data.connectedById,
        createdAt: now,
        updatedAt: now,
      } as ServiceRepositoryConnection;
      rows.set(row.id, row);
      return row;
    }),
    rotateSecret: jest.fn(
      async (
        id: number,
        webhookToken: string,
        webhookSecretEnc: string,
        connectedById: number,
      ) => {
        const row = { ...rows.get(id)!, webhookToken, webhookSecretEnc, connectedById };
        rows.set(id, row);
        return row;
      },
    ),
    updateTriggerSettings: jest.fn(
      async (
        id: number,
        settings: {
          triggerMode: RepositoryTriggerMode;
          pushCountThreshold: number | null;
          intervalDays: number | null;
        },
      ) => {
        const row = { ...rows.get(id)!, ...settings, pendingPushCount: 0 };
        rows.set(id, row);
        return row;
      },
    ),
    recordDelivery: jest.fn(
      async (
        id: number,
        { triggered, pendingPushCount }: { triggered: boolean; pendingPushCount?: number },
      ) => {
        const current = rows.get(id)!;
        const now = new Date();
        rows.set(id, {
          ...current,
          lastPingedAt: now,
          pendingPushCount: triggered
            ? 0
            : (pendingPushCount ?? current.pendingPushCount),
          ...(triggered && { lastTriggeredAt: now }),
        });
      },
    ),
    delete: jest.fn(async (id: number) => {
      const row = rows.get(id)!;
      rows.delete(id);
      return row;
    }),
    findDueForTimeIntervalSweep: jest.fn(async () =>
      [...rows.values()].filter(
        (row) =>
          row.triggerMode === RepositoryTriggerMode.TIME_INTERVAL &&
          row.status === RepositoryConnectionStatus.ACTIVE &&
          row.pendingPushCount > 0,
      ),
    ),
  };

  return mock as unknown as MockedRepositoryConnectionRepository;
}
