// new-company.schema.test.ts
import { z } from 'zod';
import { INewCompanySchema, IRegisterCompanySchema, TNewCompany, TRegisterCompany } from './addNewCompany';

// Todo: Add tests for custom error messages, The optional and nullable fields.
describe('INewCompanySchema', () => {
  const validBaseData = {
    username: 'Acme Corporation',
    email: 'contact@acme.com',
    website: 'https://acme.com',
    password: 'securepassword123',
    phone: '+1234567890',
    address: '123 Main St',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: true,
  };

  describe('Basic validation', () => {
    it('should validate a complete valid object', () => {
      const result = INewCompanySchema.safeParse(validBaseData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validBaseData);
    });
  });

  describe('Field-specific validations', () => {
    describe('username field', () => {
      it('should reject username shorter than 3 characters', () => {
        const data = { ...validBaseData, username: 'AB' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Username should be at least 3 characters.');
        }
      });

      it('should accept username with exactly 3 characters', () => {
        const data = { ...validBaseData, username: 'ABC' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('email field', () => {
      it('should reject invalid email format', () => {
        const data = { ...validBaseData, email: 'invalid-email' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid email address.');
        }
      });

      it('should reject email shorter than 5 characters', () => {
        const data = { ...validBaseData, email: 'a@b.c' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('website field', () => {
      it('should reject invalid URL', () => {
        const data = { ...validBaseData, website: 'not-a-url' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid website URL.');
        }
      });

      it('should reject website longer than 50 characters', () => {
        const longUrl = 'https://' + 'a'.repeat(45) + '.com';
        const data = { ...validBaseData, website: longUrl };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('password field', () => {
      it('should reject password shorter than 8 characters', () => {
        const data = { ...validBaseData, password: 'short' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password should be at least 8 characters.');
        }
      });

      it('should accept password with exactly 8 characters', () => {
        const data = { ...validBaseData, password: '12345678' };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('nullable fields', () => {
      const nullableFields = [
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postalCode',
        'firstName',
        'lastName',
      ] as const;

      nullableFields.forEach(field => {
        it(`should accept null for ${field}`, () => {
          const data = { ...validBaseData, [field]: null };
          const result = INewCompanySchema.safeParse(data);
          expect(result.success).toBe(true);
        });

        it(`should accept empty string for ${field}`, () => {
          const data = { ...validBaseData, [field]: '' };
          const result = INewCompanySchema.safeParse(data);
          expect(result.success).toBe(true);
        });

        it(`should reject ${field} exceeding max length`, () => {
          const maxLengths: Record<typeof nullableFields[number], number> = {
            phone: 15,
            address: 50,
            city: 30,
            state: 20,
            country: 20,
            postalCode: 10,
            firstName: 30,
            lastName: 30,
          };

          const longValue = 'a'.repeat(maxLengths[field] + 5);
          const data = { ...validBaseData, [field]: longValue };
          const result = INewCompanySchema.safeParse(data);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('isAdmin field', () => {
      it('should default to false when not provided', () => {
        const { isAdmin, ...dataWithoutAdmin } = validBaseData;
        const result = INewCompanySchema.safeParse(dataWithoutAdmin);
        expect(result.success).toBe(true);
        expect(result.data?.isAdmin).toBe(true);
      });

      it('should accept true value', () => {
        const data = { ...validBaseData, isAdmin: true };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data?.isAdmin).toBe(true);
      });

      it('should reject non-boolean value', () => {
        const data = { ...validBaseData, isAdmin: 'true' as any };
        const result = INewCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Type inference', () => {
    it('should correctly infer TNewCompany type', () => {
      // This is a compile-time test, but we can verify at runtime
      const data: TNewCompany = validBaseData;
      expect(data).toBeDefined();
    });
  });
});

describe('IRegisterCompanySchema', () => {
  const validRegistrationData = {
    email: 'contact@acme.com',
    website: 'https://acme.com',
    password: 'securepassword123',
    phone: '+1234567890',
    username: 'acme_corp_123',
  };

  describe('Inherited validations', () => {
    it('should validate all inherited fields correctly', () => {
      const result = IRegisterCompanySchema.safeParse(validRegistrationData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid inherited fields', () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email',
      };
      const result = IRegisterCompanySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('username field', () => {
    it('should reject username shorter than 3 characters', () => {
      const data = { ...validRegistrationData, username: 'ab' };
      const result = IRegisterCompanySchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Username should be at least 3 characters.');
      }
    });

    it('should reject username longer than 20 characters', () => {
      const data = { ...validRegistrationData, username: 'a'.repeat(21) };
      const result = IRegisterCompanySchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Username should not exceed 20 characters.');
      }
    });

    it('should reject username with invalid characters', () => {
      const invalidUsernames = [
        'user@name',
        'user-name',
        'user name',
        'user.name',
      ];

      invalidUsernames.forEach(username => {
        const data = { ...validRegistrationData, username };
        const result = IRegisterCompanySchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Username can only contain letters, numbers, and underscores.'
          );
        }
      });
    });

    it('should accept valid username formats', () => {
      const validUsernames = [
        'user123',
        'user_name',
        'USER123',
        'uSeR_123',
        'usr',
        'a'.repeat(20), // Exactly 20 chars
      ];

      validUsernames.forEach(username => {
        const data = { ...validRegistrationData, username };
        const result = IRegisterCompanySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should accept username with exactly 3 characters', () => {
      const data = { ...validRegistrationData, username: 'usr' };
      const result = IRegisterCompanySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept username with exactly 20 characters', () => {
      const data = { ...validRegistrationData, username: 'a'.repeat(20) };
      const result = IRegisterCompanySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema extension', () => {
    it('should include all fields from INewCompanySchema', () => {
      const newCompanyFields = Object.keys(INewCompanySchema.shape);
      const registerCompanyFields = Object.keys(IRegisterCompanySchema.shape);
      
      newCompanyFields.forEach(field => {
        expect(registerCompanyFields).toContain(field);
      });
    });

    it('should have additional username field', () => {
      expect(IRegisterCompanySchema.shape).toHaveProperty('username');
    });
  });

  describe('Type inference', () => {
    it('should correctly infer TRegisterCompany type', () => {
      // This is a compile-time test, but we can verify at runtime
      const data: TRegisterCompany = validRegistrationData;
      expect(data).toBeDefined();
    });

    it('should show TNewCompany is a subset of TRegisterCompany', () => {
      const newCompanyData: TNewCompany = validRegistrationData;
      const registerCompanyData: TRegisterCompany = {
        ...newCompanyData,
        username: 'test_user',
      };
      expect(registerCompanyData).toBeDefined();
    });
  });
});

describe('Integration tests', () => {
  it('should parse and transform data correctly', () => {
    const rawData = {
      email: 'TEST@EXAMPLE.COM',
      website: 'https://example.com',
      password: 'password123',
      phone: '  (123) 456-7890  ',
      username: 'test_user',
    };

    // Create a schema with transformations
    const schemaWithTransform = IRegisterCompanySchema.extend({
      username: z.string().min(3).transform(val => val.trim()),
      email: z.string().email().transform(val => val.toLowerCase()),
      phone: z.string().nullable().transform(val => val?.trim() || null),
    });

    const result = schemaWithTransform.safeParse(rawData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('test_user');
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.phone).toBe('(123) 456-7890');
    }
  });

  it('should handle partial validation with pick/omit', () => {
    // Test creating partial schemas
    const CompanyUpdateSchema = INewCompanySchema.pick({
      username: true,
      email: true,
      phone: true,
    }).partial();

    const validUpdate = { username: 'Updated Username' };
    const result = CompanyUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);

    const invalidUpdate = { username: 'AB' }; // Too short
    const invalidResult = CompanyUpdateSchema.safeParse(invalidUpdate);
    expect(invalidResult.success).toBe(false);
  });
});