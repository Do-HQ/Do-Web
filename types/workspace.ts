import { createWorkspaceSchema } from "@/lib/schemas/workspace";
import z from "zod";
import { AuthUser } from "./auth";

export type WorkspaceTypes = "public" | "private";

export interface WorkspaceType {
  _id: string;
  name: string;
  type: WorkspaceTypes;
  ownerId: AuthUser;
  members: AuthUser[];
  slug: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface JoinWorkspaceRequestBody {
  workspaceId: string;
}

export interface CreateWorkspaceRequestBody {
  name: string;
  type: WorkspaceTypes;
}
