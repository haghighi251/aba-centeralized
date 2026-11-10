import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases the input', () => {
    expect(slugify('Production')).toBe('production');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Staging EU')).toBe('staging-eu');
  });

  it('collapses non-alphanumeric runs into a single hyphen', () => {
    expect(slugify('Staging EU (v2)!!')).toBe('staging-eu-v2');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -Dev-  ')).toBe('dev');
  });

  it('keeps numbers', () => {
    expect(slugify('Region 51')).toBe('region-51');
  });
});
