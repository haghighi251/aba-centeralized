import { z } from 'zod';

export const ResetPasswordDto = z.object({
  token: z.string().min(1, { message: 'Token is required.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
});

export type ResetPasswordDtoSchema = z.infer<typeof ResetPasswordDto>;
