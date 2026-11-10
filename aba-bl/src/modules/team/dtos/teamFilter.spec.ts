import { TeamStatus } from '@aba/database';
import { TeamFilterDto } from './teamFilter';

describe('TeamFilterDto', () => {
  it('applies defaults for sortBy and sortOrder when given an empty payload', () => {
    const result = TeamFilterDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('name');
      expect(result.data.sortOrder).toBe('asc');
    }
  });

  it('accepts a fully valid payload', () => {
    const result = TeamFilterDto.safeParse({
      search: 'platform',
      status: TeamStatus.ACTIVE,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid sortBy value', () => {
    const result = TeamFilterDto.safeParse({ sortBy: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sortOrder value', () => {
    const result = TeamFilterDto.safeParse({ sortOrder: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = TeamFilterDto.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });
});
