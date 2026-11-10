import { Test, TestingModule } from '@nestjs/testing';
import { AddNewCompanyService } from './add-new-company.service';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import { ConflictException } from '@nestjs/common';
import { TRegisterCompany } from '@/modules/company/dtos/addNewCompanyDto';
import * as bcrypt from 'bcrypt';
import { CompanyStatus, UserRole, UserStatus } from '@aba/database';

// Mock bcrypt to control hash function
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('AddNewCompanyService', () => {
  let service: AddNewCompanyService;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let subscriptionPlanRepository: jest.Mocked<SubscriptionPlanRepository>;

  const mockCompanyData: TRegisterCompany = {
    email: 'test@company.com',
    website: 'https://testcompany.com',
    password: 'TestPassword123!',
    phone: '+1234567890',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    country: 'Test Country',
    postalCode: '12345',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: true,
    username: 'johndoe',
  };

  const mockCompany = {
    id: 1,
    email: 'test@company.com',
    website: 'https://testcompany.com',
    status: CompanyStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    country: 'Test Country',
    postalCode: '12345',
    phone: '+1234567890',
    username: 'johndoe',
    payAsYouGo: false,
    subscriptionPlanId: null,
    primaryOwnerId: null,
  };

  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@company.com',
    phone: '+1234567890',
    avatar: '',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    companyId: 1,
    password: 'hashed_password',
    username: 'johndoe',
    resetToken: null,
    resetTokenExpiry: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddNewCompanyService,
        {
          provide: CompanyRepository,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailOrName: jest.fn(),
            createWithAdminUser: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findByEmailOrPhone: jest.fn(),
          },
        },
        {
          provide: SubscriptionPlanRepository,
          useValue: {
            findDefault: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AddNewCompanyService>(AddNewCompanyService);
    companyRepository = module.get(CompanyRepository);
    userRepository = module.get(UserRepository);
    subscriptionPlanRepository = module.get(SubscriptionPlanRepository);
    subscriptionPlanRepository.findDefault.mockResolvedValue(null);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('addNewCompany', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should successfully create a new company when no conflicts exist', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      userRepository.findByEmailOrPhone.mockResolvedValue(null);

      const mockHashedPassword = 'hashed_password_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      companyRepository.createWithAdminUser.mockResolvedValue(true);

      // Act
      const result = await service.addNewCompany(mockCompanyData);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(true);

      expect(companyRepository.findByEmail).toHaveBeenCalledTimes(0);
      expect(companyRepository.findByEmailOrName).toHaveBeenCalledWith(
        mockCompanyData.email,
        mockCompanyData.username,
      );
      expect(userRepository.findByEmailOrPhone).toHaveBeenCalledWith(
        mockCompanyData.email,
        mockCompanyData.phone,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(mockCompanyData.password, 10);
      expect(companyRepository.createWithAdminUser).toHaveBeenCalledWith({
        ...mockCompanyData,
        password: mockHashedPassword,
        subscriptionPlanId: null,
      });
    });

    it('should assign the default subscription plan to the new company', async () => {
      subscriptionPlanRepository.findDefault.mockResolvedValue({
        id: 7,
      } as any);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      userRepository.findByEmailOrPhone.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_123');
      companyRepository.createWithAdminUser.mockResolvedValue(true as any);

      await service.addNewCompany(mockCompanyData);

      expect(companyRepository.createWithAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionPlanId: 7 }),
      );
    });

    it('should return ConflictException when company with same username or email exists', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      const existingCompany = {
        ...mockCompany,
        username: mockCompanyData.username,
      };
      companyRepository.findByEmailOrName.mockResolvedValue(existingCompany);

      // Act
      const result = await service.addNewCompany(mockCompanyData);

      // Assert
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        'A company with the same email or username already exists.',
      );
      expect(userRepository.findByEmailOrPhone).not.toHaveBeenCalled();
    });

    it('should return ConflictException when user with same email exists', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      const existingUser = {
        ...mockUser,
        id: 1,
        email: mockCompanyData.email,
        username: 'existing',
      };
      userRepository.findByEmailOrPhone.mockResolvedValue(existingUser);

      // Act
      const result = await service.addNewCompany(mockCompanyData);

      // Assert
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        'There is a user with the same email, username or phone number in our database.',
      );
      expect(userRepository.findByEmailOrPhone).toHaveBeenCalledWith(
        mockCompanyData.email,
        mockCompanyData.phone,
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should return ConflictException when user with same phone exists', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      const existingUser = {
        ...mockUser,
        id: 1,
        phone: mockCompanyData.phone,
        email: 'different@email.com',
      };
      userRepository.findByEmailOrPhone.mockResolvedValue(existingUser);

      // Act
      const result = await service.addNewCompany(mockCompanyData);

      // Assert
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        'There is a user with the same email, username or phone number in our database.',
      );
    });

    it('should handle Prisma unique constraint violation (P2002) in main try-catch', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      userRepository.findByEmailOrPhone.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`email`)',
      };
      companyRepository.createWithAdminUser.mockRejectedValue(prismaError);

      // Act & Assert
      // Since the service throws an error in the catch block, we expect it to throw
      await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
        'Unique constraint violation. The company or user already exists.',
      );
    });

    it('should rethrow other non-P2002 errors', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      userRepository.findByEmailOrPhone.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const dbError = new Error('Database connection failed');
      companyRepository.createWithAdminUser.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle null phone number when checking for existing users', async () => {
      // Arrange
      const companyDataWithoutPhone: TRegisterCompany = {
        ...mockCompanyData,
        phone: null,
      };

      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      userRepository.findByEmailOrPhone.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      companyRepository.createWithAdminUser.mockResolvedValue(true);

      // Act
      const result = await service.addNewCompany(companyDataWithoutPhone);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(userRepository.findByEmailOrPhone).toHaveBeenCalledWith(
        companyDataWithoutPhone.email,
        null,
      );
    });

    it('should handle bcrypt hash failure', async () => {
      // Arrange
      companyRepository.findByEmail.mockResolvedValue(null);
      companyRepository.findByEmailOrName.mockResolvedValue(null);
      userRepository.findByEmailOrPhone.mockResolvedValue(null);

      const hashError = new Error('bcrypt hash failed');
      (bcrypt.hash as jest.Mock).mockRejectedValue(hashError);

      // Act & Assert
      await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
        'bcrypt hash failed',
      );
      expect(companyRepository.createWithAdminUser).not.toHaveBeenCalled();
    });

    it('should handle multiple concurrent company checks correctly', async () => {
      // Arrange
      // Simulate that both findByEmail and findByEmailOrName return the same company
      const existingCompany = { ...mockCompany };
      companyRepository.findByEmail.mockResolvedValue(existingCompany);
      companyRepository.findByEmailOrName.mockResolvedValue(existingCompany);

      // Act
      const result = await service.addNewCompany(mockCompanyData);

      // Assert
      expect(result.isErr()).toBe(true);
      // Should still only throw one conflict exception
      expect(userRepository.findByEmailOrPhone).not.toHaveBeenCalled();
    });

    describe('createCompanyWithAdminUser (private method)', () => {
      it('should handle Prisma unique constraint violation', async () => {
        // Arrange
        const prismaError = {
          code: 'P2002',
          message: 'Unique constraint failed',
        };
        companyRepository.createWithAdminUser.mockRejectedValue(prismaError);

        // Act & Assert
        // We need to call the private method indirectly through the public method
        // but we can test that the error is properly caught and re-thrown
        companyRepository.findByEmail.mockResolvedValue(null);
        companyRepository.findByEmailOrName.mockResolvedValue(null);
        userRepository.findByEmailOrPhone.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

        await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
          ConflictException,
        );
        await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
          'Unique constraint violation. The company or user already exists.',
        );
      });

      it('should rethrow non-P2002 errors from repository', async () => {
        // Arrange
        const repositoryError = new Error('Repository error');
        companyRepository.createWithAdminUser.mockRejectedValue(
          repositoryError,
        );

        companyRepository.findByEmail.mockResolvedValue(null);
        companyRepository.findByEmailOrName.mockResolvedValue(null);
        userRepository.findByEmailOrPhone.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

        // Act & Assert
        await expect(service.addNewCompany(mockCompanyData)).rejects.toThrow(
          'Repository error',
        );
      });

      it('should return true when company is created successfully', async () => {
        // Arrange
        companyRepository.findByEmail.mockResolvedValue(null);
        companyRepository.findByEmailOrName.mockResolvedValue(null);
        userRepository.findByEmailOrPhone.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
        companyRepository.createWithAdminUser.mockResolvedValue(true);

        // Act
        const result = await service.addNewCompany(mockCompanyData);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBe(true);
      });

      it('should NOT return true even if createWithAdminUser returns falsy value (edge case)', async () => {
        // Arrange
        companyRepository.findByEmail.mockResolvedValue(null);
        companyRepository.findByEmailOrName.mockResolvedValue(null);
        userRepository.findByEmailOrPhone.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
        companyRepository.createWithAdminUser.mockResolvedValue(null as any);

        // Act
        const result = await service.addNewCompany(mockCompanyData);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBe(false);
      });
    });

    describe('Edge cases and validation', () => {
      it('should handle empty string for nullable fields', async () => {
        // Arrange
        const companyDataWithEmptyStrings: TRegisterCompany = {
          ...mockCompanyData,
          phone: '',
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          firstName: '',
          lastName: '',
        };

        companyRepository.findByEmail.mockResolvedValue(null);
        companyRepository.findByEmailOrName.mockResolvedValue(null);
        userRepository.findByEmailOrPhone.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
        companyRepository.createWithAdminUser.mockResolvedValue(true);

        // Act
        const result = await service.addNewCompany(companyDataWithEmptyStrings);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(userRepository.findByEmailOrPhone).toHaveBeenCalledWith(
          companyDataWithEmptyStrings.email,
          '',
        );
      });

      it('should handle very long password (bcrypt should handle it)', async () => {
        // Arrange
        const longPassword = 'a'.repeat(100);
        const companyDataWithLongPassword: TRegisterCompany = {
          ...mockCompanyData,
          password: longPassword,
        };

        companyRepository.findByEmail.mockResolvedValue(null);
        companyRepository.findByEmailOrName.mockResolvedValue(null);
        userRepository.findByEmailOrPhone.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_long_password');
        companyRepository.createWithAdminUser.mockResolvedValue(true);

        // Act
        const result = await service.addNewCompany(companyDataWithLongPassword);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
      });
    });
  });
});
