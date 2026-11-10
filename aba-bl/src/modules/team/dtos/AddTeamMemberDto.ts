import { z } from 'zod';

export const AddTeamMemberDto = z.object({
  userId: z.number().int().positive(),
});

export type AddTeamMemberDtoSchema = z.infer<typeof AddTeamMemberDto>;
