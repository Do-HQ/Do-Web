import { AuthUser } from "./auth";

export type TeamVisibility = "open" | "private";
export type TeamStatus = "active" | "archived";
export type TeamMemberRole = "lead" | "member" | "observer";
export type TeamWorkloadMode = "balanced" | "lead-driven" | "self-managed";

export interface WorkspaceTeamPolicy {
  restrictTeamCreation: boolean;
  requireLeadBeforeActivation: boolean;
  allowMultiTeamMembership: boolean;
  autoAssignInvitedMembers: boolean;
  defaultVisibility: TeamVisibility;
  defaultWorkloadMode: TeamWorkloadMode;
}

export interface WorkspaceTeam {
  _id: string;
  workspaceId: string;
  name: string;
  key: string;
  leadUserId: string | AuthUser | null;
  leadUser?: AuthUser | null;
  visibility: TeamVisibility;
  description?: string;
  status: TeamStatus;
  activeProjectsCount: number;
  workloadMode: TeamWorkloadMode;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTeamMember {
  _id: string;
  workspaceId: string;
  teamId: string;
  userId: AuthUser;
  role: TeamMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceTeamRequestBody {
  name: string;
  key: string;
  leadUserId?: string | null;
  visibility?: TeamVisibility;
  description?: string;
  workloadMode?: TeamWorkloadMode;
}

export interface UpdateWorkspaceTeamRequestBody {
  name?: string;
  key?: string;
  leadUserId?: string | null;
  visibility?: TeamVisibility;
  description?: string;
}

export interface AddWorkspaceTeamMembersRequestBody {
  members: Array<{
    userId: string;
    role: TeamMemberRole;
  }>;
}

export interface UpdateWorkspaceTeamMemberRequestBody {
  role: TeamMemberRole;
}

export type UpdateWorkspaceTeamPolicyRequestBody = WorkspaceTeamPolicy;
