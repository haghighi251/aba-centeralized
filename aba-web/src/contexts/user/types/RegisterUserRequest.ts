// import { z } from 'zod';

// import { GenderType } from '@/shared/types/user/userProfile';

// export type RegisterUserRequest = z.infer<typeof RegisterUserSchema>;

// export const RegisterUserSchema = z.object({
//     csrfToken: z.string(),
//     loginUserName: z.string(),
//     email: z.string().email(),
//     firstName: z.string(),
//     lastName: z.string(),
//     gender: z.nativeEnum(GenderType),
//     dateOfBirth: z.date(),
//     phoneNumber: z.string(),
//     phoneNumberPrefix: z.string().optional(),
//     password: z
//         .string()
//         .min(8, { message: 'Password must be at least 8 characters long.' })
//         .regex(
//             /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/,
//             {
//                 message:
//                     'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.',
//             },
//         ),
// });

// We made this type in the /shared/types/user and this file must be removed.
