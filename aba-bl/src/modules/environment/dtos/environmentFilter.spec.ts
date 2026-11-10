import { EnvironmentType, EnvironmentStatus } from '@aba/database';
import { EnvironmentFilterDto } from './environmentFilter';

describe('EnvironmentFilterDto', () => {
  it('applies defaults for sortBy and sortOrder when given an empty payload', () => {
    const result = EnvironmentFilterDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('order');
      expect(result.data.sortOrder).toBe('asc');
    }
  });

  it('accepts a fully valid payload', () => {
    const result = EnvironmentFilterDto.safeParse({
      search: 'prod',
      teamId: 1,
      type: EnvironmentType.PRODUCTION,
      status: EnvironmentStatus.ACTIVE,
      sortBy: 'name',
      sortOrder: 'desc',
    });

    expect(result.success).toBe(true);
  });

  it('coerces a numeric string teamId', () => {
    const result = EnvironmentFilterDto.safeParse({ teamId: '1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.teamId).toBe(1);
    }
  });

  it('rejects an invalid sortBy value', () => {
    const result = EnvironmentFilterDto.safeParse({ sortBy: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sortOrder value', () => {
    const result = EnvironmentFilterDto.safeParse({ sortOrder: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid type filter value', () => {
    const result = EnvironmentFilterDto.safeParse({ type: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = EnvironmentFilterDto.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });
});
