import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from '@/modules/users/controllers/users.controller';
import { SettingsController } from '@/modules/users/controllers/settings/settings.controller';
import { SettingsService } from '@/modules/users/services/settings/settings.service';
import { UsersModule } from './users.module';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { UserSettingsRepository } from '@/modules/users/repositories/userSettings.repository';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';
import { GetUserSettingsUseCase } from '@/modules/users/usecases/settings/getUserSettings.usecase';
import { SetUserSettingsUseCase } from '@/modules/users/usecases/settings/setUserSettings.usecase';
import { GetUserByUserIDUseCase } from '@/modules/users/usecases/getUserByUserIDUseCase';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';

describe('UsersModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(UserRepository)
      .useValue({})
      .overrideProvider(UserSettingsRepository)
      .useValue({})
      .overrideProvider(EmailServerService)
      .useValue({ sendMail: jest.fn() })
      .overrideProvider(JwtService)
      .useValue({ signAsync: jest.fn(), verifyAsync: jest.fn() })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  describe('Controllers', () => {
    it('should provide UsersController', () => {
      expect(module.get(UsersController)).toBeDefined();
    });

    it('should provide SettingsController', () => {
      expect(module.get(SettingsController)).toBeDefined();
    });
  });

  describe('Providers', () => {
    it('should provide SettingsService', () => {
      expect(module.get(SettingsService)).toBeDefined();
    });

    it('should provide GetUserSettingsUseCase', () => {
      expect(module.get(GetUserSettingsUseCase)).toBeDefined();
    });

    it('should provide SetUserSettingsUseCase', () => {
      expect(module.get(SetUserSettingsUseCase)).toBeDefined();
    });

    it('should provide GetUserByUserIDUseCase', () => {
      expect(module.get(GetUserByUserIDUseCase)).toBeDefined();
    });

    it('should provide EmailServerService', () => {
      expect(module.get(EmailServerService)).toBeDefined();
    });
  });

  describe('Exports', () => {
    it('should export UserRepository', () => {
      expect(module.get(UserRepository)).toBeDefined();
    });

    it('should export UserSettingsRepository', () => {
      expect(module.get(UserSettingsRepository)).toBeDefined();
    });

    it('should export SettingsService', () => {
      expect(module.get(SettingsService)).toBeDefined();
    });
  });
});
