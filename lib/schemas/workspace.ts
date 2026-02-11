import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(3, "Workspace name must be at least 3 characters"),
  type: z.string(),
});

export const workspaceSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name is too short")
    .max(80, "Workspace name must be under 80 characters"),

  type: z.string(),

  allowedDomains: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val
          .split(",")
          .map((d) => d.trim())
          .every((d) =>
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(
              d,
            ),
          ),
      "Enter valid comma-separated domains (e.g. example.com, foo.bar)",
    ),
});
