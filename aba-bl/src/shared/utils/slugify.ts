import { z } from 'zod';

/**
 * Derives a URL/identifier-safe slug from a free-text name, e.g.
 * "Staging EU (v2)" -> "staging-eu-v2".
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates a lowercase, hyphenated slug (e.g. "staging-eu").
 */
export const slugSchema = z
  .string()
  .min(2, { message: 'Slug should be at least 2 characters.' })
  .max(50, { message: 'Slug should not exceed 50 characters.' })
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'Slug can only contain lowercase letters, numbers and hyphens, and cannot start/end with a hyphen.',
  });
