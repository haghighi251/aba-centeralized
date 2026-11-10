import { DependencyEcosystem } from '@aba/database';
import {
  ServicePackageFilterDto,
  ServicePackageHistoryFilterDto,
} from './servicePackageFilter';

describe('ServicePackageFilterDto', () => {
  it('applies defaults when no fields are provided', () => {
    const result = ServicePackageFilterDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('name');
      expect(result.data.sortOrder).toBe('asc');
      expect(result.data.search).toBeUndefined();
      expect(result.data.ecosystem).toBeUndefined();
    }
  });

  it('accepts valid filter values', () => {
    const result = ServicePackageFilterDto.safeParse({
      search: 'express',
      ecosystem: DependencyEcosystem.NPM,
      sortBy: 'introducedAt',
      sortOrder: 'desc',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid sortBy', () => {
    const result = ServicePackageFilterDto.safeParse({ sortBy: 'version' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sortOrder', () => {
    const result = ServicePackageFilterDto.safeParse({ sortOrder: 'random' });
    expect(result.success).toBe(false);
  });

  it('rejects a search string longer than 100 characters', () => {
    const result = ServicePackageFilterDto.safeParse({
      search: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid ecosystem', () => {
    const result = ServicePackageFilterDto.safeParse({ ecosystem: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('ServicePackageHistoryFilterDto', () => {
  it('applies defaults when no fields are provided', () => {
    const result = ServicePackageHistoryFilterDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ALL');
      expect(result.data.sortBy).toBe('deactivatedAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('accepts status STALE', () => {
    const result = ServicePackageHistoryFilterDto.safeParse({
      status: 'STALE',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status REMOVED', () => {
    const result = ServicePackageHistoryFilterDto.safeParse({
      status: 'REMOVED',
    });
    expect(result.success).toBe(true);
  });

  it('accepts sortBy name', () => {
    const result = ServicePackageHistoryFilterDto.safeParse({ sortBy: 'name' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = ServicePackageHistoryFilterDto.safeParse({
      status: 'ACTIVE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sortBy', () => {
    const result = ServicePackageHistoryFilterDto.safeParse({
      sortBy: 'version',
    });
    expect(result.success).toBe(false);
  });
});
