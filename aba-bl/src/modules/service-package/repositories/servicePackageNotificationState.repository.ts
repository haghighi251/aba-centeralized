import { Injectable } from '@nestjs/common';
import { ServicePackageNotificationState } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class ServicePackageNotificationStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByServicePackageId(
    servicePackageId: number,
  ): Promise<ServicePackageNotificationState | null> {
    return this.prisma.servicePackageNotificationState.findUnique({
      where: { servicePackageId },
    });
  }

  async mute(
    servicePackageId: number,
    mutedByUserId: number,
  ): Promise<ServicePackageNotificationState> {
    return this.prisma.servicePackageNotificationState.upsert({
      where: { servicePackageId },
      create: {
        servicePackageId,
        muted: true,
        mutedAt: new Date(),
        mutedByUserId,
      },
      update: { muted: true, mutedAt: new Date(), mutedByUserId },
    });
  }

  async unmute(
    servicePackageId: number,
  ): Promise<ServicePackageNotificationState> {
    return this.prisma.servicePackageNotificationState.upsert({
      where: { servicePackageId },
      create: {
        servicePackageId,
        muted: false,
        mutedAt: null,
        mutedByUserId: null,
      },
      update: { muted: false, mutedAt: null, mutedByUserId: null },
    });
  }

  async snooze(
    servicePackageId: number,
    until: Date,
  ): Promise<ServicePackageNotificationState> {
    return this.prisma.servicePackageNotificationState.upsert({
      where: { servicePackageId },
      create: { servicePackageId, muted: false, nextNotifyAt: until },
      update: { muted: false, nextNotifyAt: until },
    });
  }
}
