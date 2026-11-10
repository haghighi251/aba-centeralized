import { z } from 'zod';

export const UserLoginCredentialsDto = z
  .object({
    username: z
      .string()
      .min(3, { message: 'Username should be at least 3 characters.' })
      .optional(),
    email: z.string().email({ message: 'Invalid email format.' }).optional(),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(8, { message: 'Password should be at least 8 characters.' }),
  })
  .refine((data) => data.username || data.email, {
    message: 'Either username or email must be provided.',
    path: ['username', 'email'],
  });

export type UserLoginCredentialsDtoSchema = z.infer<
  typeof UserLoginCredentialsDto
>;
