import { AddCompanyUserDto } from './AddCompanyUserDto';

describe('AddCompanyUserDto', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'BUSINESS_MEMBER' as const,
    password: 'StrongPass123',
  };

  it('accepts a fully valid payload', () => {
    const result = AddCompanyUserDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts a payload without optional name fields', () => {
    const { firstName, lastName, ...rest } = validData;
    const result = AddCompanyUserDto.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email address', () => {
    const result = AddCompanyUserDto.safeParse({
      ...validData,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Invalid email address.');
    }
  });

  it('rejects a role outside the allowed enum', () => {
    const result = AddCompanyUserDto.safeParse({
      ...validData,
      role: 'BUSINESS_OWNER',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = AddCompanyUserDto.safeParse({
      ...validData,
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe(
        'Password must be at least 8 characters.',
      );
    }
  });

  it('rejects firstName/lastName longer than 50 characters', () => {
    const result = AddCompanyUserDto.safeParse({
      ...validData,
      firstName: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing required fields', () => {
    const result = AddCompanyUserDto.safeParse({});
    expect(result.success).toBe(false);
  });
});
