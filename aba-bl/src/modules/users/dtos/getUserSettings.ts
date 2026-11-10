import { z } from 'zod';

export const GetUserSettingsSchema = z.object({
  model: z.string(),
  credit: z.string(),
  length: z.string(),
  requests_count: z.string(),
  history: z.array(z.any()).optional(),
});

export type GetUserSettingsType = z.infer<typeof GetUserSettingsSchema>;
