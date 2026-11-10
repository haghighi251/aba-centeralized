import { DependencyEcosystem } from '@aba/database';
import { BulkImportServicePackagesDto } from './BulkImportServicePackagesDto';

const validPackage = { name: 'express', version: '4.18.2' };

describe('BulkImportServicePackagesDto', () => {
  it('accepts a minimal payload and defaults ecosystem to NPM', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      packages: [validPackage],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ecosystem).toBe(DependencyEcosystem.NPM);
    }
  });

  it('accepts a fully valid payload with multiple packages', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      ecosystem: DependencyEcosystem.PYPI,
      packages: [
        { name: 'django', version: '4.2.0', versionRange: '>=4.0.0' },
        { name: 'requests', version: '2.31.0' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packages).toHaveLength(2);
    }
  });

  it('rejects an empty packages array', () => {
    const result = BulkImportServicePackagesDto.safeParse({ packages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 1000 packages', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      packages: Array.from({ length: 1001 }, (_, i) => ({
        name: `pkg-${i}`,
        version: '1.0.0',
      })),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing packages field', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      ecosystem: DependencyEcosystem.NPM,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a package with an empty name', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      packages: [{ name: '', version: '1.0.0' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a package with an empty version', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      packages: [{ name: 'express', version: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a package with a name longer than 255 characters', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      packages: [{ name: 'a'.repeat(256), version: '1.0.0' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid ecosystem value', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      ecosystem: 'INVALID',
      packages: [validPackage],
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 1000 packages', () => {
    const result = BulkImportServicePackagesDto.safeParse({
      packages: Array.from({ length: 1000 }, (_, i) => ({
        name: `pkg-${i}`,
        version: '1.0.0',
      })),
    });
    expect(result.success).toBe(true);
  });
});
