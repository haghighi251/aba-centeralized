import { z } from 'zod';
import { TestAuthKind, TestPageStatus, TestPageType } from '@aba/database';
import {
  AccessConfigSchema,
  HTTP_METHODS,
} from '@/modules/test-page/dtos/CreateTestPageDto';

/**
 * All fields optional. `authSecret` is write-only: when present it re-encrypts
 * the stored credential; when omitted the existing secret is left untouched.
 * Sending authKind: NONE clears the stored secret (handled in the service).
 */
export const UpdateTestPageDto = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    pageType: z.nativeEnum(TestPageType).optional(),
    path: z.string().max(2000).nullable().optional(),
    absoluteUrl: z.string().url().nullable().optional(),
    method: z.enum(HTTP_METHODS).optional(),
    accessConfig: AccessConfigSchema.nullable().optional(),
    authKind: z.nativeEnum(TestAuthKind).optional(),
    authSecret: z.string().max(4000).nullable().optional(),
    status: z.nativeEnum(TestPageStatus).optional(),
  })
  .strict();

export type UpdateTestPageDtoSchema = z.infer<typeof UpdateTestPageDto>;
