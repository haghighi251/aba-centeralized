import { z } from 'zod';

export const ForgotPasswordDto = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

export type ForgotPasswordDtoSchema = z.infer<typeof ForgotPasswordDto>;
