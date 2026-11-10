import z from "zod";

export const RefreshResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable().optional(),
  data: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
      accessTokenExpires: z.number(),
    })
    .nullable(),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;