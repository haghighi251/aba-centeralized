import { z } from 'zod';
import { EnvironmentType } from '@aba/database';

const slugSchema = z
  .string()
  .min(2, { message: 'Slug should be at least 2 characters.' })
  .max(50, { message: 'Slug should not exceed 50 characters.' })
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'Slug can only contain lowercase letters, numbers and hyphens, and cannot start/end with a hyphen.',
  });

export const CreateEnvironmentDto = z.object({
  teamId: z
    .number()
    .int()
    .positive({ message: 'teamId must be a positive integer.' }),
  name: z
    .string()
    .min(2, { message: 'Name should be at least 2 characters.' })
    .max(100, { message: 'Name should not exceed 100 characters.' }),
  // If omitted, the slug is derived from the name.
  slug: slugSchema.optional(),
  type: z.nativeEnum(EnvironmentType).default(EnvironmentType.CUSTOM),
  isProduction: z.boolean().default(false),
  // Pipeline order (1=Dev, 2=Test, 3=Staging, 4=Prod, ...). If omitted, the
  // environment is appended to the end of the company's pipeline.
  order: z
    .number()
    .int()
    .min(1, { message: 'Order must be a positive integer.' })
    .max(1000, { message: 'Order must not exceed 1000.' })
    .optional(),
  description: z
    .string()
    .max(500, { message: 'Description should not exceed 500 characters.' })
    .optional(),
});

export type CreateEnvironmentDtoSchema = z.infer<typeof CreateEnvironmentDto>;
