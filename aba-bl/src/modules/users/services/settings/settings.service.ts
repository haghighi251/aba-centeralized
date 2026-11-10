import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';
import { GetUserSettingsType } from '@/modules/users/dtos/getUserSettings';
import { SetUserSettingsType } from '@/modules/users/dtos/setUserSettings';
import { UserSettingsRepository } from '@/modules/users/repositories/userSettings.repository';
import { UserSettings } from '@aba/database';

function toGetUserSettingsType(settings: UserSettings): GetUserSettingsType {
  return {
    model: settings.model,
    credit: settings.credit,
    length: settings.length,
    requests_count: settings.requestsCount,
    history: (settings.history as unknown[] | null) ?? undefined,
  };
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly userSettingsRepository: UserSettingsRepository,
  ) {}

  async getUserSettings(
    userId: string,
  ): Promise<Result<GetUserSettingsType | undefined, Error>> {
    const settings = await this.userSettingsRepository.findByUserId(userId);

    if (!settings) return ok(undefined);

    return ok(toGetUserSettingsType(settings));
  }

  async setUserSettings(
    newSettings: SetUserSettingsType,
  ): Promise<Result<GetUserSettingsType | undefined, Error>> {
    if (!newSettings.userId) return err(undefined);

    const settings = await this.userSettingsRepository.upsertByUserId(
      Number(newSettings.userId),
      {
        model: newSettings.model,
        credit: newSettings.credit,
        length: newSettings.length,
        requestsCount: newSettings.requests_count,
      },
    );

    return ok(toGetUserSettingsType(settings));
  }
}
