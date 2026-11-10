import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';

const mockEmailServerService = {
  sendMail: jest.fn().mockResolvedValue(undefined),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: EmailServerService, useValue: mockEmailServerService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllUsers returns the stub message', () => {
    expect(controller.getAllUsers()).toBe('This action returns all users');
  });

  it('getUser returns the provided id', () => {
    expect(controller.getUser('123' as any)).toBe('123');
  });

  it('sendEmail sends a welcome email', async () => {
    await controller.sendEmail();

    expect(mockEmailServerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'haghighi251@gmail.com',
        subject: 'Welcome to Our Service!',
      }),
    );
  });
});
