import { z } from 'zod';
import { TeamStatus } from '@aba/database';
import { slugSchema } from '@/shared/utils/slugify';

export const UpdateTeamDto = z.object({
  name: z
    .string()
    .min(2, { message: 'Name should be at least 2 characters.' })
    .max(100, { message: 'Name should not exceed 100 characters.' })
    .optional(),
  slug: slugSchema.optional(),
  description: z
    .string()
    .max(500, { message: 'Description should not exceed 500 characters.' })
    .nullable()
    .optional(),
  status: z.nativeEnum(TeamStatus).optional(),
});

export type UpdateTeamDtoSchema = z.infer<typeof UpdateTeamDto>;
