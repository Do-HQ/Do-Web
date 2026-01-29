import { createWorkspaceSchema } from "@/lib/schemas/workspace";
import z from "zod";

export type createWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;
