import { UpdateCompanyDto } from './UpdateCompanyDto';

describe('UpdateCompanyDto', () => {
  it('accepts an empty payload since all fields are optional', () => {
    const result = UpdateCompanyDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a fully valid payload', () => {
    const result = UpdateCompanyDto.safeParse({
      email: 'company@example.com',
      website: 'https://example.com',
      address: '123 Main St',
      city: 'Metropolis',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = UpdateCompanyDto.safeParse({ email: 'invalid-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid website url', () => {
    const result = UpdateCompanyDto.safeParse({ website: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it.each([
    ['address', 101],
    ['city', 51],
    ['state', 51],
    ['country', 51],
    ['postalCode', 21],
  ])('rejects %s exceeding its max length', (field, length) => {
    const result = UpdateCompanyDto.safeParse({ [field]: 'a'.repeat(length) });
    expect(result.success).toBe(false);
  });
});
