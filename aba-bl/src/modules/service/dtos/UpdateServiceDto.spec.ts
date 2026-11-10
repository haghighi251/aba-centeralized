import { ServiceType, ServiceStatus } from '@aba/database';
import { UpdateServiceDto } from './UpdateServiceDto';

describe('UpdateServiceDto', () => {
  it('accepts an empty payload since all fields are optional', () => {
    const result = UpdateServiceDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a fully valid payload', () => {
    const result = UpdateServiceDto.safeParse({
      name: 'Payments API',
      slug: 'payments-api',
      type: ServiceType.MICROSERVICE,
      description: 'Handles payments.',
      baseUrl: 'https://payments.example.com',
      rateLimitConfig: { windowMs: 60000, max: 50 },
      status: ServiceStatus.ARCHIVED,
    });

    expect(result.success).toBe(true);
  });

  it('allows description to be cleared with null', () => {
    const result = UpdateServiceDto.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('allows rateLimitConfig to be cleared with null', () => {
    const result = UpdateServiceDto.safeParse({ rateLimitConfig: null });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid slug', () => {
    const result = UpdateServiceDto.safeParse({ slug: 'Not Valid!' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid type', () => {
    const result = UpdateServiceDto.safeParse({ type: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = UpdateServiceDto.safeParse({ status: 'DELETED' });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = UpdateServiceDto.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid baseUrl', () => {
    const result = UpdateServiceDto.safeParse({ baseUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid rateLimitConfig', () => {
    const result = UpdateServiceDto.safeParse({
      rateLimitConfig: { windowMs: -1, max: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a description longer than 500 characters', () => {
    const result = UpdateServiceDto.safeParse({
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
