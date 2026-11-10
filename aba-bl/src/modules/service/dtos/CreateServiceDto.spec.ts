import { ServiceType } from '@aba/database';
import { CreateServiceDto } from './CreateServiceDto';

describe('CreateServiceDto', () => {
  it('accepts a minimal payload and applies defaults', () => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      baseUrl: 'https://api.example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(ServiceType.OTHER);
      expect(result.data.slug).toBeUndefined();
      expect(result.data.rateLimitConfig).toBeUndefined();
    }
  });

  it('accepts a fully valid payload', () => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      slug: 'api-gateway',
      type: ServiceType.API_GATEWAY,
      description: 'Edge API gateway.',
      baseUrl: 'https://api.example.com',
      rateLimitConfig: { windowMs: 60000, max: 100 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = CreateServiceDto.safeParse({
      baseUrl: 'https://api.example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = CreateServiceDto.safeParse({
      name: 'A',
      baseUrl: 'https://api.example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    const result = CreateServiceDto.safeParse({
      name: 'a'.repeat(101),
      baseUrl: 'https://api.example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing baseUrl', () => {
    const result = CreateServiceDto.safeParse({ name: 'API Gateway' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid baseUrl', () => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      baseUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it.each(['API Gateway', 'api_gateway', 'api gateway', '-api', 'api-', 'API'])(
    'rejects an invalid slug "%s"',
    (slug) => {
      const result = CreateServiceDto.safeParse({
        name: 'API Gateway',
        slug,
        baseUrl: 'https://api.example.com',
      });
      expect(result.success).toBe(false);
    },
  );

  it('accepts a valid hyphenated slug', () => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      slug: 'api-gateway',
      baseUrl: 'https://api.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid type', () => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      baseUrl: 'https://api.example.com',
      type: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a description longer than 500 characters', () => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      baseUrl: 'https://api.example.com',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it.each([
    { windowMs: 0, max: 100 },
    { windowMs: 60000, max: 0 },
    { windowMs: -1, max: 100 },
    { windowMs: 1.5, max: 100 },
  ])('rejects an invalid rateLimitConfig %s', (rateLimitConfig) => {
    const result = CreateServiceDto.safeParse({
      name: 'API Gateway',
      baseUrl: 'https://api.example.com',
      rateLimitConfig,
    });
    expect(result.success).toBe(false);
  });
});
