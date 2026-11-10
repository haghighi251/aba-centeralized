import { z } from 'zod';
import { ServiceType } from '@aba/database';
import { slugSchema } from '@/shared/utils/slugify';

export const RateLimitConfigSchema = z.object({
  windowMs: z
    .number()
    .int()
    .positive({ message: 'windowMs must be a positive integer.' }),
  max: z
    .number()
    .int()
    .positive({ message: 'max must be a positive integer.' }),
});

export const CreateServiceDto = z.object({
  name: z
    .string()
    .min(2, { message: 'Name should be at least 2 characters.' })
    .max(100, { message: 'Name should not exceed 100 characters.' }),
  // If omitted, the slug is derived from the name.
  slug: slugSchema.optional(),
  type: z.nativeEnum(ServiceType).default(ServiceType.OTHER),
  description: z
    .string()
    .max(500, { message: 'Description should not exceed 500 characters.' })
    .optional(),
  baseUrl: z.string().url({ message: 'baseUrl must be a valid URL.' }),
  rateLimitConfig: RateLimitConfigSchema.optional(),
});

export type CreateServiceDtoSchema = z.infer<typeof CreateServiceDto>;
