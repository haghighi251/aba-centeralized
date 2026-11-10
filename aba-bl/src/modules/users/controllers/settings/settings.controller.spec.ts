import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { GetUserSettingsUseCase } from '@/modules/users/usecases/settings/getUserSettings.usecase';
import { SetUserSettingsUseCase } from '@/modules/users/usecases/settings/setUserSettings.usecase';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';

describe('SettingsController', () => {
  let controller: SettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: GetUserSettingsUseCase, useValue: { execute: jest.fn() } },
        { provide: SetUserSettingsUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
