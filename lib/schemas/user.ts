import { z } from "zod";

export const updateUserSchema = z.object({
  firstName: z.string().min(2, "Firstname must be at least two characters"),
  lastName: z.string().min(2, "Lastname must be at least two characters"),
  profilePhoto: z.string().min(2, "User profile photo must be a URL"),
});
