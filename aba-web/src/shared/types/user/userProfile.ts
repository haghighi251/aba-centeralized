import { z } from "zod";
import { IRegisterUserSchema } from "@/shared/types/user/registerUserSchema";
import { GenderType } from "@/shared/types/user/genderType";

export const IUserProfileSchema = IRegisterUserSchema.extend({
  userId: z.string(),
});

export type TUserProfile = z.infer<typeof IUserProfileSchema>;

export { GenderType };
