import { z } from 'zod';

/**
 * Trigger a manual ("Run now") test run for a service.
 * - Omit everything to run every active page on the service.
 * - `pageId` restricts the run to one page.
 * - `definitionId` (with its `pageId`) runs a single test.
 */
export const CreateTestRunDto = z
  .object({
    pageId: z.number().int().positive().optional(),
    definitionId: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => !v.definitionId || !!v.pageId, {
    message: 'pageId is required when definitionId is provided.',
    path: ['pageId'],
  });

export type CreateTestRunDtoSchema = z.infer<typeof CreateTestRunDto>;
