import { ServicePackageNotificationStateRepository } from './servicePackageNotificationState.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

describe('ServicePackageNotificationStateRepository', () => {
  let repository: ServicePackageNotificationStateRepository;
  let prisma: { servicePackageNotificationState: Record<string, jest.Mock> };

  const mockState = { id: 1, muted: false, servicePackageId: 10 };

  beforeEach(() => {
    prisma = {
      servicePackageNotificationState: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new ServicePackageNotificationStateRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('finds a state row by servicePackageId', async () => {
    prisma.servicePackageNotificationState.findUnique.mockResolvedValue(
      mockState,
    );

    const result = await repository.findByServicePackageId(10);

    expect(result).toBe(mockState);
    expect(
      prisma.servicePackageNotificationState.findUnique,
    ).toHaveBeenCalledWith({
      where: { servicePackageId: 10 },
    });
  });

  it('mutes: creates if absent, updates the muted fields if present', async () => {
    prisma.servicePackageNotificationState.upsert.mockResolvedValue({
      ...mockState,
      muted: true,
    });

    await repository.mute(10, 5);

    expect(prisma.servicePackageNotificationState.upsert).toHaveBeenCalledWith({
      where: { servicePackageId: 10 },
      create: {
        servicePackageId: 10,
        muted: true,
        mutedAt: expect.any(Date),
        mutedByUserId: 5,
      },
      update: { muted: true, mutedAt: expect.any(Date), mutedByUserId: 5 },
    });
  });

  it('unmutes: clears muted fields', async () => {
    prisma.servicePackageNotificationState.upsert.mockResolvedValue(mockState);

    await repository.unmute(10);

    expect(prisma.servicePackageNotificationState.upsert).toHaveBeenCalledWith({
      where: { servicePackageId: 10 },
      create: {
        servicePackageId: 10,
        muted: false,
        mutedAt: null,
        mutedByUserId: null,
      },
      update: { muted: false, mutedAt: null, mutedByUserId: null },
    });
  });

  it('snoozes: sets nextNotifyAt without muting', async () => {
    const until = new Date('2026-08-15T00:00:00.000Z');
    prisma.servicePackageNotificationState.upsert.mockResolvedValue({
      ...mockState,
      nextNotifyAt: until,
    });

    await repository.snooze(10, until);

    expect(prisma.servicePackageNotificationState.upsert).toHaveBeenCalledWith({
      where: { servicePackageId: 10 },
      create: { servicePackageId: 10, muted: false, nextNotifyAt: until },
      update: { muted: false, nextNotifyAt: until },
    });
  });
});
