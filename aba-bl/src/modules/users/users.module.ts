import { Module } from '@nestjs/common';
import { UsersController } from '@/modules/users/controllers/users.controller';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';
import { SettingsController } from '@/modules/users/controllers/settings/settings.controller';
import { SettingsService } from '@/modules/users/services/settings/settings.service';
import { GetUserSettingsUseCase } from '@/modules/users/usecases/settings/getUserSettings.usecase';
import { GetUserByUserIDUseCase } from '@/modules/users/usecases/getUserByUserIDUseCase';
import { SetUserSettingsUseCase } from '@/modules/users/usecases/settings/setUserSettings.usecase';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { UserSettingsRepository } from '@/modules/users/repositories/userSettings.repository';
@Module({
  controllers: [UsersController, SettingsController],
  providers: [
    UserRepository,
    UserSettingsRepository,
    EmailServerService,
    GetUserSettingsUseCase,
    SetUserSettingsUseCase,
    GetUserByUserIDUseCase,
    SettingsService,
  ],
  exports: [UserRepository, UserSettingsRepository, SettingsService],
})
export class UsersModule {}
