import { z } from 'zod';

export const RefreshTokenDto = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required.' })
    .min(1, { message: 'Refresh token is required.' }),
});

export type RefreshTokenDtoSchema = z.infer<typeof RefreshTokenDto>;
