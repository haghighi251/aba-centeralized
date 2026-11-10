import { ServiceType, ServiceStatus } from '@aba/database';
import { ServiceFilterDto } from './serviceFilter';

describe('ServiceFilterDto', () => {
  it('applies defaults for sortBy and sortOrder when given an empty payload', () => {
    const result = ServiceFilterDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('name');
      expect(result.data.sortOrder).toBe('asc');
    }
  });

  it('accepts a fully valid payload', () => {
    const result = ServiceFilterDto.safeParse({
      search: 'gateway',
      type: ServiceType.API_GATEWAY,
      status: ServiceStatus.ACTIVE,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid sortBy value', () => {
    const result = ServiceFilterDto.safeParse({ sortBy: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sortOrder value', () => {
    const result = ServiceFilterDto.safeParse({ sortOrder: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid type filter value', () => {
    const result = ServiceFilterDto.safeParse({ type: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = ServiceFilterDto.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects a search string longer than 100 characters', () => {
    const result = ServiceFilterDto.safeParse({ search: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
