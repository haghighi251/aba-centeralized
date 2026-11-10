import { z } from 'zod';
import { RepositoryTriggerMode } from '@aba/database';
import { refineTriggerSettings } from '@/modules/repository-connection/dtos/CreateRepositoryConnectionDto';

export const UpdateRepositoryConnectionTriggerSettingsDto = z
  .object({
    triggerMode: z.nativeEnum(RepositoryTriggerMode),
    pushCountThreshold: z.number().int().positive().optional(),
    intervalDays: z.number().int().positive().optional(),
  })
  .superRefine(refineTriggerSettings);

export type UpdateRepositoryConnectionTriggerSettingsDtoSchema = z.infer<
  typeof UpdateRepositoryConnectionTriggerSettingsDto
>;
