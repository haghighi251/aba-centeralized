import { z } from 'zod';

export const SuggestTestsDto = z
  .object({
    /** How many suggestions to ask for (clamped). */
    count: z.number().int().min(1).max(8).default(5),
    /** Optional free-text guidance to steer the suggestions. */
    instructions: z.string().max(1000).optional(),
  })
  .strict();
export type SuggestTestsDtoSchema = z.infer<typeof SuggestTestsDto>;

export const ImproveTestDto = z
  .object({
    instructions: z.string().max(1000).optional(),
  })
  .strict();
export type ImproveTestDtoSchema = z.infer<typeof ImproveTestDto>;

/** Internal admin grant of a token top-up (no payment gateway in this phase). */
export const GrantAiTokensDto = z
  .object({
    companyId: z.number().int().positive(),
    tokens: z.number().int().positive().max(100_000_000),
    pricePaidUsd: z.number().min(0).default(0),
    note: z.string().max(500).optional(),
  })
  .strict();
export type GrantAiTokensDtoSchema = z.infer<typeof GrantAiTokensDto>;
