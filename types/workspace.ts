import { workspaceSettingsSchema } from "@/lib/schemas/workspace";
import z from "zod";
import { AuthUser, UserType } from "./auth";

export interface WorkspaceFlowDefaults {
  projectDefaultView: "list" | "board" | "timeline";
  workflowTemplate: "lightweight" | "delivery" | "marketing" | "custom";
  requireWorkflowBeforeTasks: boolean;
  useTaskIdPrefix: boolean;
  teamVisibilityInProjects: "all" | "assigned-only";
}

export interface WorkspaceGovernanceSettings {
  allowMembersCreateProjects: boolean;
  allowMembersCreateWorkflows: boolean;
  restrictInvitesToAdmins: boolean;
  requireJoinRequestApproval: boolean;
}

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
  flowDefaults?: WorkspaceFlowDefaults;
  governance?: WorkspaceGovernanceSettings;
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

export interface WorkspaceSettingsUpdateBody {
  name?: string;
  type?: string;
  allowedDomains?: string;
  flowDefaults?: Partial<WorkspaceFlowDefaults>;
  governance?: Partial<WorkspaceGovernanceSettings>;
}

export interface WorkspaceInviteRequestBody {
  email: string;
  roles: string[];
}

export interface AcceptWorkspaceInviteRequestBody {
  token: string;
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
  teams?: Array<{
    _id: string;
    name: string;
    status: "active" | "archived";
  }>;
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

export interface ModerateWorkspaceJoinRequestBody {
  workspaceId: string;
  requestId: string;
}
