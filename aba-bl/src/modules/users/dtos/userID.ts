import { z } from 'zod';

export const UserIdSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'Invalid user id.' }),
});

export type UserIdSchemaType = z.infer<typeof UserIdSchema>;
