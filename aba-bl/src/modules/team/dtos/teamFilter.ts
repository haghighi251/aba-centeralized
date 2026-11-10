import { z } from 'zod';
import { TeamStatus } from '@aba/database';

export const TeamFilterDto = z.object({
  search: z.string().max(100).optional(),
  status: z.nativeEnum(TeamStatus).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type TeamFilterDtoSchema = z.infer<typeof TeamFilterDto>;

export type TTeamFilter = TeamFilterDtoSchema & {
  companyId: number;
};
