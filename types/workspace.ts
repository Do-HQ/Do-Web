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

export interface WorkspaceInviteRequestBody {
  email: string;
  roles: string[];
}

export interface WorkspaceRole {
  _id: string;
  name: string;
}

export interface WorkspacePerson {
  _id: string;
  workspaceId: string;
  userId: AuthUser;
  roles: WorkspaceRole[];
  score: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
