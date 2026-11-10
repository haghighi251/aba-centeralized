import { z } from 'zod';
import { TestAuthKind, TestPageType } from '@aba/database';

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

/**
 * Non-secret access posture a target's tests assert against. The credential
 * itself is never here — it goes in `authSecret` (plaintext in transit,
 * encrypted at rest) and is surfaced to the executor only via the internal
 * materials endpoint.
 */
export const AccessConfigSchema = z
  .object({
    /** Whether this page requires an auth token to be accessed normally. */
    tokenRequired: z.boolean().optional(),
    /** Expected HTTP status when the page is called WITHOUT auth (negative test). */
    expectedStatusWithoutAuth: z.number().int().min(100).max(599).optional(),
    /** Extra non-secret headers sent with every request to this page. */
    customHeaders: z.record(z.string()).optional(),
    /** IPs/CIDRs the customer expects to be the only ones allowed (asserted, not enforced). */
    ipAllowlist: z.array(z.string()).optional(),
    /** How long a request/token is expected to stay valid, in seconds. */
    requestValiditySeconds: z.number().int().positive().optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const CreateTestPageDto = z
  .object({
    name: z
      .string()
      .min(2, { message: 'Name should be at least 2 characters.' })
      .max(100, { message: 'Name should not exceed 100 characters.' }),
    description: z.string().max(500).optional(),
    pageType: z.nativeEnum(TestPageType).default(TestPageType.CUSTOM),
    /** Relative path resolved against Service.baseUrl, e.g. "/api/login". */
    path: z.string().max(2000).optional(),
    /** Full URL; takes precedence over path when set. */
    absoluteUrl: z
      .string()
      .url({ message: 'absoluteUrl must be a valid URL.' })
      .optional(),
    method: z.enum(HTTP_METHODS).default('GET'),
    accessConfig: AccessConfigSchema.optional(),
    authKind: z.nativeEnum(TestAuthKind).default(TestAuthKind.NONE),
    /** Plaintext credential; encrypted before persistence. Never returned. */
    authSecret: z.string().max(4000).optional(),
  })
  .refine((v) => Boolean(v.path) || Boolean(v.absoluteUrl), {
    message: 'Either path or absoluteUrl must be provided.',
    path: ['path'],
  })
  .refine((v) => v.authKind === TestAuthKind.NONE || Boolean(v.authSecret), {
    message: 'authSecret is required when authKind is not NONE.',
    path: ['authSecret'],
  });

export type CreateTestPageDtoSchema = z.infer<typeof CreateTestPageDto>;
