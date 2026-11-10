import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { UserSettingsRepository } from '@/modules/users/repositories/userSettings.repository';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: UserSettingsRepository,
          useValue: {
            findByUserId: jest.fn(),
            upsertByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
