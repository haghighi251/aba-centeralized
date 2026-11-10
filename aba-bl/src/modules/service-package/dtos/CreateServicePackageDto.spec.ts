import { DependencyEcosystem } from '@aba/database';
import { CreateServicePackageDto } from './CreateServicePackageDto';

describe('CreateServicePackageDto', () => {
  it('accepts a minimal payload and defaults ecosystem to NPM', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'express',
      version: '4.18.2',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ecosystem).toBe(DependencyEcosystem.NPM);
      expect(result.data.versionRange).toBeUndefined();
    }
  });

  it('accepts a fully valid payload', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'express',
      version: '4.18.2',
      versionRange: '^4.18.0',
      ecosystem: DependencyEcosystem.NPM,
    });

    expect(result.success).toBe(true);
  });

  it('accepts non-NPM ecosystems', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'django',
      version: '4.2.0',
      ecosystem: DependencyEcosystem.PYPI,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ecosystem).toBe(DependencyEcosystem.PYPI);
    }
  });

  it('rejects a missing name', () => {
    const result = CreateServicePackageDto.safeParse({ version: '1.0.0' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = CreateServicePackageDto.safeParse({
      name: '',
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name longer than 255 characters', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'a'.repeat(256),
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing version', () => {
    const result = CreateServicePackageDto.safeParse({ name: 'express' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty version', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'express',
      version: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a version longer than 100 characters', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'express',
      version: '1'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a versionRange longer than 100 characters', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'express',
      version: '4.18.2',
      versionRange: '^'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid ecosystem value', () => {
    const result = CreateServicePackageDto.safeParse({
      name: 'express',
      version: '1.0.0',
      ecosystem: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});
