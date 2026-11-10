import { z } from 'zod';
import { ServiceType, ServiceStatus } from '@aba/database';
import { slugSchema } from '@/shared/utils/slugify';
import { RateLimitConfigSchema } from '@/modules/service/dtos/CreateServiceDto';

export const UpdateServiceDto = z.object({
  name: z
    .string()
    .min(2, { message: 'Name should be at least 2 characters.' })
    .max(100, { message: 'Name should not exceed 100 characters.' })
    .optional(),
  slug: slugSchema.optional(),
  type: z.nativeEnum(ServiceType).optional(),
  description: z
    .string()
    .max(500, { message: 'Description should not exceed 500 characters.' })
    .nullable()
    .optional(),
  baseUrl: z
    .string()
    .url({ message: 'baseUrl must be a valid URL.' })
    .optional(),
  rateLimitConfig: RateLimitConfigSchema.nullable().optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
});

export type UpdateServiceDtoSchema = z.infer<typeof UpdateServiceDto>;
