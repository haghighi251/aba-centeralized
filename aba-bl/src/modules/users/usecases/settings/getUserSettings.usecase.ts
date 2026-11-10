import { UseCase } from '@/modules/shared/types/useCase';
import { SettingsService } from '@/modules/users/services/settings/settings.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GetUserByUserIDUseCase } from '@/modules/users/usecases/getUserByUserIDUseCase';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { GetUserSettingsType } from '@/modules/users/dtos/getUserSettings';
import { GetUserSettingsDomainException } from '@/modules/users/exceptions/GetUserSettingsDomainException';

@Injectable()
export class GetUserSettingsUseCase implements UseCase<
  { id: string },
  GetUserSettingsType
> {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly getUserByUserIDUseCase: GetUserByUserIDUseCase,
  ) {}
  async execute({ id }: { id: string }): Promise<GetUserSettingsType> {
    try {
      const user = await this.getUserByUserIDUseCase.execute(id);
      if (!user) throw new Error('The user not found for the entry userID.');

      const userSettings = await this.settingsService.getUserSettings(id);

      if (userSettings.isErr()) {
        if (userSettings.error instanceof ServerException) {
          throw new InternalServerErrorException(userSettings.error);
        }

        throw new GetUserSettingsDomainException(
          'There is an error in GetUserSettingsUseCase.',
        );
      }

      return userSettings.value;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred while getting the user settings: ${error}`,
      );
    }
  }
}
