import { z } from 'zod';
import { ServiceType, ServiceStatus } from '@aba/database';

export const ServiceFilterDto = z.object({
  search: z.string().max(100).optional(),
  type: z.nativeEnum(ServiceType).optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ServiceFilterDtoSchema = z.infer<typeof ServiceFilterDto>;

export type TServiceFilter = ServiceFilterDtoSchema & {
  companyId: number;
  environmentId: number;
};
