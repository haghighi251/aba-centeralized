import { z } from 'zod';

// Todo: Consider adding gender and date of birth fields in the future.
export const NewCompanySchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username should be at least 3 characters.' }),
  email: z.string().min(5).email({ message: 'Invalid email address.' }),
  website: z.string().max(50).url({ message: 'Invalid website URL.' }),
  password: z
    .string()
    .min(8, { message: 'Password should be at least 8 characters.' }),
  phone: z
    .string()
    .max(15, { message: 'Phone number should not exceed 15 characters.' })
    .nullable()
    .optional(),
  address: z
    .string()
    .max(50, { message: 'Address should not exceed 50 characters.' })
    .nullable()
    .optional(),
  city: z
    .string()
    .max(30, { message: 'City should not exceed 30 characters.' })
    .nullable()
    .optional(),
  state: z
    .string()
    .max(20, { message: 'State should not exceed 20 characters.' })
    .nullable()
    .optional(),
  country: z
    .string()
    .max(20, { message: 'Country should not exceed 20 characters.' })
    .nullable()
    .optional(),
  postalCode: z
    .string()
    .max(10, { message: 'Postal code should not exceed 10 characters.' })
    .nullable()
    .optional(),
  firstName: z
    .string()
    .max(30, { message: 'First name should not exceed 30 characters.' })
    .nullable()
    .optional(),
  lastName: z
    .string()
    .max(30, { message: 'Last name should not exceed 30 characters.' })
    .nullable()
    .optional(),
  isAdmin: z.boolean().default(true), // Default to true for the registering user who is admin of the company
});

export const RegisterCompanySchema = NewCompanySchema.extend({
  username: z
    .string()
    .min(3, { message: 'Username should be at least 3 characters.' })
    .max(20, { message: 'Username should not exceed 20 characters.' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores.',
    }),
});

export type TNewCompany = z.infer<typeof NewCompanySchema>;
export type TRegisterCompany = z.infer<typeof RegisterCompanySchema>;
