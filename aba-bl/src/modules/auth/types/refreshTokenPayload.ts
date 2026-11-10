import { z } from 'zod';

// Define payload schema — must match the payload signed by AuthService#issueTokens
export const refreshTokenPayloadSchema = z.object({
  sub: z.number(),
  username: z.string(),
  role: z.string(),
  companyId: z.number(),
});
