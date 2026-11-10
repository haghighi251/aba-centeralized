import { z } from 'zod';

export const UpdateCompanyUserDto = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  role: z.enum(['BUSINESS_ADMIN', 'BUSINESS_MEMBER']).optional(),
  teamIds: z.array(z.number().int()).optional(),
});

export type UpdateCompanyUserDtoSchema = z.infer<typeof UpdateCompanyUserDto>;
