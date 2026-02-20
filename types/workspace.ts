import { workspaceSettingsSchema } from "@/lib/schemas/workspace";
import z from "zod";
import { AuthUser, UserType } from "./auth";

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

export interface CreateWorkspaceInviteRequestBody {
  email: string;
  roleIds: string[];
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

export interface WorkspaceInvite {
  _id: string;
  email: string;
  workspaceId: string;
  roleIds: WorkspaceRole[];
  token: string;
  expiresAt: string;
  accepted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface WorkspaceJoinRequest {
  _id: string;
  userId: UserType;
  workspaceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
