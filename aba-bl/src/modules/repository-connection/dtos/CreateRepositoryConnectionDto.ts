import { z } from 'zod';
import { RepositoryProvider, RepositoryTriggerMode } from '@aba/database';

/**
 * Shared validation for "does this trigger-mode + params combination make
 * sense" — used by both the create DTO (fields optional; omitted means
 * "compute a default") and UpdateRepositoryConnectionTriggerSettingsDto
 * (triggerMode required there).
 */
export function refineTriggerSettings(
  data: {
    triggerMode?: RepositoryTriggerMode;
    pushCountThreshold?: number;
    intervalDays?: number;
  },
  ctx: z.RefinementCtx,
): void {
  if (
    data.triggerMode === RepositoryTriggerMode.PUSH_COUNT &&
    !data.pushCountThreshold
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'pushCountThreshold is required when triggerMode is PUSH_COUNT.',
      path: ['pushCountThreshold'],
    });
  }
  if (
    data.triggerMode === RepositoryTriggerMode.TIME_INTERVAL &&
    !data.intervalDays
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'intervalDays is required when triggerMode is TIME_INTERVAL.',
      path: ['intervalDays'],
    });
  }
}

export const CreateRepositoryConnectionDto = z
  .object({
    // Which Git host the webhook comes from. Omitted means GITHUB so existing
    // clients keep working unchanged.
    provider: z.nativeEnum(RepositoryProvider).default(RepositoryProvider.GITHUB),
    owner: z.string().min(1, { message: 'Owner is required.' }).max(255),
    name: z
      .string()
      .min(1, { message: 'Repository name is required.' })
      .max(255),
    watchedBranch: z.string().min(1).max(255).default('main'),
    // All three omitted (the common case) means "compute a default from
    // the company's plan + whether this service's environment is
    // production" — see RepositoryConnectionService.create().
    triggerMode: z.nativeEnum(RepositoryTriggerMode).optional(),
    pushCountThreshold: z.number().int().positive().optional(),
    intervalDays: z.number().int().positive().optional(),
  })
  .superRefine(refineTriggerSettings);

export type CreateRepositoryConnectionDtoSchema = z.infer<
  typeof CreateRepositoryConnectionDto
>;
