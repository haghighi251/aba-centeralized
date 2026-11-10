import { z } from "zod";
import { ServerResponseSchema } from "@/shared/types/ServerResponse";

export const APIResponseSchema = z.object({
  success: z.boolean({
    message: "You have to add the success option in your result.",
  }),
  error: z.string().optional(),
  data: z.union([z.array(ServerResponseSchema), z.null()]),
});

export type APIResponse = z.infer<typeof APIResponseSchema>;
