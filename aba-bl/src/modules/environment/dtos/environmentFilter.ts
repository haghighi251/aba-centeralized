import { z } from 'zod';
import { EnvironmentType, EnvironmentStatus } from '@aba/database';

export const EnvironmentFilterDto = z.object({
  search: z.string().max(100).optional(),
  teamId: z.coerce.number().int().positive().optional(),
  type: z.nativeEnum(EnvironmentType).optional(),
  status: z.nativeEnum(EnvironmentStatus).optional(),
  sortBy: z.enum(['order', 'name', 'createdAt']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type EnvironmentFilterDtoSchema = z.infer<typeof EnvironmentFilterDto>;

export type TEnvironmentFilter = EnvironmentFilterDtoSchema & {
  companyId: number;
};
