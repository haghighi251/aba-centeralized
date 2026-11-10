import { UpdateCompanyUserDto } from './UpdateCompanyUserDto';

describe('UpdateCompanyUserDto', () => {
  it('accepts an empty payload since all fields are optional', () => {
    const result = UpdateCompanyUserDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a fully valid payload', () => {
    const result = UpdateCompanyUserDto.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      role: 'BUSINESS_ADMIN',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a role outside the allowed enum', () => {
    const result = UpdateCompanyUserDto.safeParse({ role: 'BUSINESS_OWNER' });
    expect(result.success).toBe(false);
  });

  it('rejects firstName longer than 50 characters', () => {
    const result = UpdateCompanyUserDto.safeParse({
      firstName: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects lastName longer than 50 characters', () => {
    const result = UpdateCompanyUserDto.safeParse({
      lastName: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});
