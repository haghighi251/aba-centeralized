import { z } from 'zod';
import { EnvironmentType, EnvironmentStatus } from '@aba/database';

export const UpdateEnvironmentDto = z.object({
  teamId: z
    .number()
    .int()
    .positive({ message: 'teamId must be a positive integer.' })
    .optional(),
  name: z
    .string()
    .min(2, { message: 'Name should be at least 2 characters.' })
    .max(100, { message: 'Name should not exceed 100 characters.' })
    .optional(),
  slug: z
    .string()
    .min(2, { message: 'Slug should be at least 2 characters.' })
    .max(50, { message: 'Slug should not exceed 50 characters.' })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message:
        'Slug can only contain lowercase letters, numbers and hyphens, and cannot start/end with a hyphen.',
    })
    .optional(),
  type: z.nativeEnum(EnvironmentType).optional(),
  isProduction: z.boolean().optional(),
  order: z
    .number()
    .int()
    .min(1, { message: 'Order must be a positive integer.' })
    .max(1000, { message: 'Order must not exceed 1000.' })
    .optional(),
  description: z
    .string()
    .max(500, { message: 'Description should not exceed 500 characters.' })
    .nullable()
    .optional(),
  status: z.nativeEnum(EnvironmentStatus).optional(),
});

export type UpdateEnvironmentDtoSchema = z.infer<typeof UpdateEnvironmentDto>;
