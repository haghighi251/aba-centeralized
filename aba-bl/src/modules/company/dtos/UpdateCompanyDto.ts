import { z } from 'zod';

export const UpdateCompanyDto = z.object({
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  country: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
});

export type UpdateCompanyDtoSchema = z.infer<typeof UpdateCompanyDto>;
