import { workspaceSettingsSchema } from "@/lib/schemas/workspace";
import z from "zod";
import { AuthUser } from "./auth";

export interface WorkspaceType {
  _id: string;
  name: string;
  type: string;
  ownerId: AuthUser;
  members: AuthUser[];
  slug: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  allowedDomains?: string[];
}

export interface JoinWorkspaceRequestBody {
  workspaceId: string;
}

export interface CreateWorkspaceRequestBody {
  name: string;
  type: string;
}

export type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;
