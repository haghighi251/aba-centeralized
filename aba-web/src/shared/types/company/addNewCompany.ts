import { z } from "zod";

// Todo: Consider adding gender and date of birth fields in the future.
export const INewCompanySchema = z.object({
  username: z
    .string({
      required_error: "Username is required", // Custom message for missing field
      invalid_type_error: "Username must be a string", // Optional: custom message for wrong type
    })
    .min(3, { message: "Username should be at least 3 characters." }),
  email: z.string({
    required_error: "Email is required",
    invalid_type_error: "Email must be a string",
  }).min(5).email({ message: "Invalid email address." }),
  website: z.string().max(50).url({ message: "Invalid website URL." }),
  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(8, { message: "Password should be at least 8 characters." }),
  phone: z
    .string({
      invalid_type_error: "Phone number must be a string",
    })
    .max(15, { message: "Phone number should not exceed 15 characters." })
    .nullable()
    .optional(),
  address: z
    .string({
      invalid_type_error: "Address must be a string",
    })
    .max(50, { message: "Address should not exceed 50 characters." })
    .nullable()
    .optional(),
  city: z
    .string({
      invalid_type_error: "City must be a string",
    })
    .max(30, { message: "City should not exceed 30 characters." })
    .nullable()
    .optional(),
  state: z
    .string({
      invalid_type_error: "State must be a string",
    })
    .max(20, { message: "State should not exceed 20 characters." })
    .nullable()
    .optional(),
  country: z
    .string({
      invalid_type_error: "Country must be a string",
    })
    .max(20, { message: "Country should not exceed 20 characters." })
    .nullable()
    .optional(),
  postalCode: z
    .string({
      invalid_type_error: "Postal code must be a string",
    })
    .max(10, { message: "Postal code should not exceed 10 characters." })
    .nullable()
    .optional(),
  firstName: z
    .string({
      invalid_type_error: "First name must be a string",
    })
    .max(30, { message: "First name should not exceed 30 characters." })
    .nullable()
    .optional(),
  lastName: z
    .string({
      invalid_type_error: "Last name must be a string",
    })
    .max(30, { message: "Last name should not exceed 30 characters." })
    .nullable()
    .optional(),
  isAdmin: z.boolean().default(true), // Default to true for the registering user who is admin of the company
});

export const IRegisterCompanySchema = INewCompanySchema.extend({
  username: z
    .string({
      required_error: "Username is required", // Custom message for missing field
      invalid_type_error: "Username must be a string", // Optional: custom message for wrong type
    })
    .min(3, { message: "Username should be at least 3 characters." })
    .max(20, { message: "Username should not exceed 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores.",
    }),
});

export type TNewCompany = z.infer<typeof INewCompanySchema>;
export type TRegisterCompany = z.infer<typeof IRegisterCompanySchema>;
