import { z } from "zod";
import { ServerResponseSchema } from "@/shared/types/ServerResponse"; // your existing

// The exact shape we expect from the backend's login endpoint
export const LoginDataSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.string(),
    companyId: z.string(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    accessTokenExpires: z.number(),
  }),
});

export const LoginResponseSchema = ServerResponseSchema.extend({
  data: LoginDataSchema,
});

export type LoginData = z.infer<typeof LoginDataSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;