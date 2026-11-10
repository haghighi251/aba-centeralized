import { z } from 'zod';
import { slugSchema } from '@/shared/utils/slugify';

export const CreateTeamDto = z.object({
  name: z
    .string()
    .min(2, { message: 'Name should be at least 2 characters.' })
    .max(100, { message: 'Name should not exceed 100 characters.' }),
  // If omitted, the slug is derived from the name.
  slug: slugSchema.optional(),
  description: z
    .string()
    .max(500, { message: 'Description should not exceed 500 characters.' })
    .optional(),
});

export type CreateTeamDtoSchema = z.infer<typeof CreateTeamDto>;
