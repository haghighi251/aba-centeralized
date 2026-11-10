import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SetUserSettingsType } from '@/modules/users/dtos/setUserSettings';
import { GetUserSettingsType } from '@/modules/users/dtos/getUserSettings';
import { SettingsService } from '@/modules/users/services/settings/settings.service';
import { GetUserByUserIDUseCase } from '@/modules/users/usecases/getUserByUserIDUseCase';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { GetUserSettingsDomainException } from '@/modules/users/exceptions/GetUserSettingsDomainException';

@Injectable()
export class SetUserSettingsUseCase implements UseCase<
  SetUserSettingsType,
  GetUserSettingsType
> {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly getUserByUserIDUseCase: GetUserByUserIDUseCase,
  ) {}
  async execute(
    newSettings: SetUserSettingsType,
  ): Promise<GetUserSettingsType> {
    try {
      const user = await this.getUserByUserIDUseCase.execute(
        newSettings.userId,
      );
      if (!user) throw new Error('The user not found for the entry userID.');

      const userSettings =
        await this.settingsService.setUserSettings(newSettings);

      if (userSettings.isErr()) {
        if (userSettings.error instanceof ServerException) {
          throw new InternalServerErrorException(userSettings.error);
        }

        throw new GetUserSettingsDomainException(
          'There is an error in SetUserSettingsUseCase.',
        );
      }

      return userSettings.value;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred while setting the user settings: ${error}`,
      );
    }
  }
}
