import { z } from 'zod';

export const AddCompanyUserDto = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: z.string().email({ message: 'Invalid email address.' }),
  role: z.enum(['BUSINESS_ADMIN', 'BUSINESS_MEMBER']),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
  teamIds: z.array(z.number().int()).optional(),
});

export type AddCompanyUserDtoSchema = z.infer<typeof AddCompanyUserDto>;
