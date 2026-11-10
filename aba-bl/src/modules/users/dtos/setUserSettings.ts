import { z } from 'zod';
import { GetUserSettingsSchema } from './getUserSettings';

export const SetUserSettingsSchema = GetUserSettingsSchema.extend({
  userId: z.string().optional(),
});

export type SetUserSettingsType = z.infer<typeof SetUserSettingsSchema>;
