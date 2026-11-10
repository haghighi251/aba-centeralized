import { DependencyEcosystem } from '@aba/database';
import { UpdateServicePackageDto } from './UpdateServicePackageDto';

describe('UpdateServicePackageDto', () => {
  it('accepts a version-only payload', () => {
    const result = UpdateServicePackageDto.safeParse({ version: '4.19.0' });
    expect(result.success).toBe(true);
  });

  it('accepts a versionRange-only payload', () => {
    const result = UpdateServicePackageDto.safeParse({
      versionRange: '^4.19.0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a null versionRange to clear the range', () => {
    const result = UpdateServicePackageDto.safeParse({ versionRange: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.versionRange).toBeNull();
    }
  });

  it('accepts an ecosystem-only payload', () => {
    const result = UpdateServicePackageDto.safeParse({
      ecosystem: DependencyEcosystem.PYPI,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all fields together', () => {
    const result = UpdateServicePackageDto.safeParse({
      version: '4.19.0',
      versionRange: '^4.19.0',
      ecosystem: DependencyEcosystem.NPM,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty payload (no fields provided)', () => {
    const result = UpdateServicePackageDto.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an empty version string', () => {
    const result = UpdateServicePackageDto.safeParse({ version: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a version longer than 100 characters', () => {
    const result = UpdateServicePackageDto.safeParse({
      version: '1'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a versionRange longer than 100 characters', () => {
    const result = UpdateServicePackageDto.safeParse({
      versionRange: '^'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid ecosystem', () => {
    const result = UpdateServicePackageDto.safeParse({ ecosystem: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
