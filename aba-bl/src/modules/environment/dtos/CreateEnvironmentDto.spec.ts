import { EnvironmentType } from '@aba/database';
import { CreateEnvironmentDto } from './CreateEnvironmentDto';

describe('CreateEnvironmentDto', () => {
  it('accepts a minimal payload and applies defaults', () => {
    const result = CreateEnvironmentDto.safeParse({
      teamId: 1,
      name: 'Production',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(EnvironmentType.CUSTOM);
      expect(result.data.isProduction).toBe(false);
      expect(result.data.slug).toBeUndefined();
    }
  });

  it('accepts a fully valid payload', () => {
    const result = CreateEnvironmentDto.safeParse({
      teamId: 1,
      name: 'Production',
      slug: 'production',
      type: EnvironmentType.PRODUCTION,
      isProduction: true,
      order: 4,
      description: 'Primary production environment.',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = CreateEnvironmentDto.safeParse({ teamId: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = CreateEnvironmentDto.safeParse({ teamId: 1, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing teamId', () => {
    const result = CreateEnvironmentDto.safeParse({ name: 'Production' });
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1.5])('rejects an invalid teamId value %s', (teamId) => {
    const result = CreateEnvironmentDto.safeParse({
      teamId,
      name: 'Production',
    });
    expect(result.success).toBe(false);
  });

  it.each(['Production', 'prod_1', 'prod 1', '-prod', 'prod-', 'PROD'])(
    'rejects an invalid slug "%s"',
    (slug) => {
      const result = CreateEnvironmentDto.safeParse({
        teamId: 1,
        name: 'Prod',
        slug,
      });
      expect(result.success).toBe(false);
    },
  );

  it('accepts a valid hyphenated slug', () => {
    const result = CreateEnvironmentDto.safeParse({
      teamId: 1,
      name: 'Staging EU',
      slug: 'staging-eu',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid type', () => {
    const result = CreateEnvironmentDto.safeParse({
      teamId: 1,
      name: 'Prod',
      type: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1001, 1.5])('rejects an invalid order value %s', (order) => {
    const result = CreateEnvironmentDto.safeParse({
      teamId: 1,
      name: 'Prod',
      order,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a description longer than 500 characters', () => {
    const result = CreateEnvironmentDto.safeParse({
      teamId: 1,
      name: 'Prod',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
