import { z } from "zod";

export const ServerResponseSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().nullable().optional(),
});

export type ServerResponse = z.infer<typeof ServerResponseSchema>;