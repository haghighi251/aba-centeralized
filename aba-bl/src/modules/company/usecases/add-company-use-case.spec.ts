// add-company.use-case.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AddCompanyUseCase } from './add-company-use-case';
import { AddNewCompanyService } from '../services/add-new-company/add-new-company.service';
import { TRegisterCompany } from '../dtos/addNewCompanyDto';
import { InternalServerErrorException } from '@nestjs/common';
import { AddUserDomainException } from '@/modules/users/exceptions/AddUserDomainError';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { ok, err, Result } from 'neverthrow';

// Mock the dependencies
const mockAddNewCompanyService = {
  addNewCompany: jest.fn(),
};

describe('AddCompanyUseCase', () => {
  let useCase: AddCompanyUseCase;
  let companyService: jest.Mocked<AddNewCompanyService>;

  const validCompanyData: TRegisterCompany = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddCompanyUseCase,
        {
          provide: AddNewCompanyService,
          useValue: mockAddNewCompanyService,
        },
      ],
    }).compile();

    useCase = module.get<AddCompanyUseCase>(AddCompanyUseCase);
    companyService = module.get(AddNewCompanyService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return true when company service successfully adds a company', async () => {
      // Arrange
      companyService.addNewCompany.mockResolvedValue(ok(true));

      // Act
      const result = await useCase.execute(validCompanyData);

      // Assert
      expect(result).toBe(true);
      expect(companyService.addNewCompany).toHaveBeenCalledWith(
        validCompanyData,
      );
    });

    it('should throw AddUserDomainException when service returns a generic Error', async () => {
      // Arrange
      const genericError = new Error('Some service error');
      companyService.addNewCompany.mockResolvedValue(err(genericError));

      // Act & Assert
      await expect(useCase.execute(validCompanyData)).rejects.toThrow(
        AddUserDomainException,
      );
      await expect(useCase.execute(validCompanyData)).rejects.toThrow(
        'Failed to add new company: Some service error',
      );
      expect(companyService.addNewCompany).toHaveBeenCalledWith(
        validCompanyData,
      );
    });

    it('should throw InternalServerErrorException when service returns ServerException', async () => {
      // Arrange
      // If the constructor expects 2 arguments: serverType and messages array
      const serverException = new (ServerException as any)('DATABASE', [
        'Database connection failed',
      ]);
      companyService.addNewCompany.mockResolvedValue(err(serverException));

      // Act & Assert
      await expect(useCase.execute(validCompanyData)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(companyService.addNewCompany).toHaveBeenCalledWith(
        validCompanyData,
      );
    });

    it('should throw InternalServerErrorException when service throws an unexpected error', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected service error');
      companyService.addNewCompany.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(useCase.execute(validCompanyData)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(useCase.execute(validCompanyData)).rejects.toThrow(
        'An error occurred while adding the new company: Error: Unexpected service error',
      );
      expect(companyService.addNewCompany).toHaveBeenCalledWith(
        validCompanyData,
      );
    });

    it('should handle null or undefined service result', async () => {
      // Arrange
      companyService.addNewCompany.mockResolvedValue(ok(null as any));

      // Act
      const result = await useCase.execute(validCompanyData);

      // Assert
      expect(result).toBe(true); // The use case returns true regardless of the service's return value
      expect(companyService.addNewCompany).toHaveBeenCalledWith(
        validCompanyData,
      );
    });

    it('should propagate Zod validation errors from invalid input (if not validated before)', async () => {
      // Note: This test assumes the DTO validation happens elsewhere (e.g., in the controller)
      // If validation happens in the use case, we need to test that separately

      // For now, we test that invalid data still gets passed to the service
      const invalidCompanyData = {
        ...validCompanyData,
        email: 'invalid-email', // Invalid email
      } as any;

      companyService.addNewCompany.mockResolvedValue(ok(true));

      // Act
      const result = await useCase.execute(invalidCompanyData);

      // Assert
      expect(result).toBe(true);
      expect(companyService.addNewCompany).toHaveBeenCalledWith(
        invalidCompanyData,
      );
    });

    describe('error handling edge cases', () => {
      it('should handle nested errors in ServerException', async () => {
        // Arrange
        const nestedError = new Error('Nested error');
        // const serverException = new ServerException('Server error', nestedError);
        const serverException = new (ServerException as any)('DATABASE', [
          nestedError,
        ]);
        companyService.addNewCompany.mockResolvedValue(err(serverException));

        // Act & Assert
        await expect(useCase.execute(validCompanyData)).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it('should handle empty error messages', async () => {
        // Arrange
        const emptyError = new Error('');
        companyService.addNewCompany.mockResolvedValue(err(emptyError));

        // Act & Assert
        await expect(useCase.execute(validCompanyData)).rejects.toThrow(
          AddUserDomainException,
        );
      });

      it('should handle non-Error objects in service result', async () => {
        // Arrange
        const nonErrorObject = { message: 'Not an Error instance' };
        companyService.addNewCompany.mockResolvedValue(
          err(nonErrorObject as any),
        );

        // Act & Assert
        await expect(useCase.execute(validCompanyData)).rejects.toThrow(
          AddUserDomainException,
        );
      });
    });

    describe('integration with service layer', () => {
      it('should correctly pass all company data to service', async () => {
        // Arrange
        companyService.addNewCompany.mockResolvedValue(ok(true));
        const completeCompanyData: TRegisterCompany = {
          email: 'another@company.com',
          website: 'https://another.com',
          password: 'AnotherPass123!',
          phone: null,
          address: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
          firstName: null,
          lastName: null,
          isAdmin: false,
          username: 'another_user',
        };

        // Act
        const result = await useCase.execute(completeCompanyData);

        // Assert
        expect(result).toBe(true);
        expect(companyService.addNewCompany).toHaveBeenCalledWith(
          completeCompanyData,
        );
      });

      it('should handle service returning false (edge case)', async () => {
        // Arrange
        companyService.addNewCompany.mockResolvedValue(ok(false));

        // Act
        const result = await useCase.execute(validCompanyData);

        // Assert
        expect(result).toBe(true); // The use case still returns true even if service returns false
      });
    });
  });

  describe('UseCase interface implementation', () => {
    it('should implement UseCase interface correctly', () => {
      // This is a type-level test, but we can verify the structure
      expect(typeof useCase.execute).toBe('function');
      expect(useCase.execute.length).toBe(1); // Should accept one parameter
    });

    it('should have correct return type (Promise<boolean>)', async () => {
      // Arrange
      companyService.addNewCompany.mockResolvedValue(ok(true));

      // Act
      const result = useCase.execute(validCompanyData);

      // Assert
      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(typeof resolvedResult).toBe('boolean');
    });
  });
});

// Test helper for creating test data
describe('Test Data Validation', () => {
  // Import the Zod schema to validate test data
  const { RegisterCompanySchema } = require('../dtos/addNewCompanyDto');

  it('should have valid test data according to Zod schema', () => {
    const validCompanyData: TRegisterCompany = {
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

    const result = RegisterCompanySchema.safeParse(validCompanyData);
    expect(result.success).toBe(true);
  });

  it('should fail with invalid test data', () => {
    const invalidCompanyData = {
      name: 'AB', // Too short
      email: 'invalid-email',
      website: 'not-a-url',
      password: 'short',
      username: 'ab', // Too short
    } as any;

    const result = RegisterCompanySchema.safeParse(invalidCompanyData);
    expect(result.success).toBe(false);
  });
});
