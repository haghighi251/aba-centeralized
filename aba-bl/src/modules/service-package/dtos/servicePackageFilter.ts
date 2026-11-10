import { z } from 'zod';
import { DependencyEcosystem } from '@aba/database';

export const ServicePackageFilterDto = z.object({
  search: z.string().max(100).optional(),
  ecosystem: z.nativeEnum(DependencyEcosystem).optional(),
  sortBy: z.enum(['name', 'introducedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const ServicePackageHistoryFilterDto = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['STALE', 'REMOVED', 'ALL']).default('ALL'),
  sortBy: z.enum(['name', 'deactivatedAt']).default('deactivatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ServicePackageFilterDtoSchema = z.infer<
  typeof ServicePackageFilterDto
>;
export type ServicePackageHistoryFilterDtoSchema = z.infer<
  typeof ServicePackageHistoryFilterDto
>;

export type TServicePackageFilter = ServicePackageFilterDtoSchema & {
  companyId: number;
  environmentId: number;
  serviceId: number;
};

export type TServicePackageHistoryFilter =
  ServicePackageHistoryFilterDtoSchema & {
    companyId: number;
    environmentId: number;
    serviceId: number;
  };
