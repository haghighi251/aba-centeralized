import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import { Prisma, UserSettings } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class UserSettingsRepository extends BaseRepository<
  UserSettings,
  Prisma.UserSettingsCreateInput,
  Prisma.UserSettingsUpdateInput,
  Prisma.UserSettingsWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.UserSettingsCreateInput): Promise<UserSettings> {
    try {
      return await this.prisma.userSettings.create({ data });
    } catch (error) {
      this.handleError(error, 'UserSettings');
    }
  }

  async findById(id: string | number): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({
      where: { id: this.normalizeId(id) },
    });
  }

  async findByUserId(userId: string | number): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({
      where: { userId: this.normalizeId(userId) },
    });
  }

  async findAll(
    filter: Prisma.UserSettingsWhereInput,
  ): Promise<{ data: UserSettings[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.userSettings.findMany({ where: filter }),
      this.prisma.userSettings.count({ where: filter }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.UserSettingsUpdateInput,
  ): Promise<UserSettings> {
    try {
      return await this.prisma.userSettings.update({
        where: { id: this.normalizeId(id) },
        data,
      });
    } catch (error) {
      this.handleError(error, 'UserSettings');
    }
  }

  async delete(id: string | number): Promise<UserSettings> {
    try {
      return await this.prisma.userSettings.delete({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'UserSettings');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const count = await this.prisma.userSettings.count({
      where: { id: this.normalizeId(id) },
    });
    return count > 0;
  }

  async upsertByUserId(
    userId: number,
    data: {
      model: string;
      credit: string;
      length: string;
      requestsCount: string;
    },
  ): Promise<UserSettings> {
    try {
      return await this.prisma.userSettings.upsert({
        where: { userId },
        create: { ...data, userId },
        update: { ...data },
      });
    } catch (error) {
      this.handleError(error, 'UserSettings');
    }
  }
}
