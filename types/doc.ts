import { Pagination } from "@/types";

export type WorkspaceDocAccessScope = "workspace" | "assigned";
export type WorkspaceDocPermission = "view" | "edit";
export type WorkspaceDocLinkScope = "workspace" | "public";
export type WorkspaceDocPublishState = "draft" | "review" | "published";

export interface WorkspaceDocUserSummary {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl: string;
}

export interface WorkspaceDocTeamSummary {
  id: string;
  name: string;
  key: string;
  status: "active" | "archived";
}

export interface WorkspaceDocProjectSummary {
  id: string;
  name: string;
  archived: boolean;
}

export interface WorkspaceDocRecord {
  id: string;
  workspaceId: string;
  title: string;
  icon: string;
  summary: string;
  publishState: WorkspaceDocPublishState;
  category: string;
  tags: string[];
  confidenceScore: number;
  featured: boolean;
  pinned: boolean;
  content: unknown[];
  accessScope: WorkspaceDocAccessScope;
  workspacePermission: WorkspaceDocPermission;
  assignedPermission: WorkspaceDocPermission;
  assignedUsers: WorkspaceDocUserSummary[];
  assignedTeams: WorkspaceDocTeamSummary[];
  assignedProjects: WorkspaceDocProjectSummary[];
  assignedUserIds: string[];
  assignedTeamIds: string[];
  assignedProjectIds: string[];
  linkSharing: {
    enabled: boolean;
    scope: WorkspaceDocLinkScope;
    permission: WorkspaceDocPermission;
    token: string;
  };
  archived: boolean;
  createdBy: WorkspaceDocUserSummary | null;
  updatedBy: WorkspaceDocUserSummary | null;
  lastEditedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  canEdit: boolean;
}

export interface WorkspaceDocsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  archived?: boolean;
}

export interface WorkspaceDocsListResponseBody {
  docs: WorkspaceDocRecord[];
  pagination: Pagination;
}

export interface CreateWorkspaceDocRequestBody {
  title: string;
  icon?: string;
  summary?: string;
  publishState?: WorkspaceDocPublishState;
  category?: string;
  tags?: string[];
  confidenceScore?: number;
  featured?: boolean;
  pinned?: boolean;
  content?: unknown[];
  accessScope?: WorkspaceDocAccessScope;
  workspacePermission?: WorkspaceDocPermission;
  assignedPermission?: WorkspaceDocPermission;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
  assignedProjectIds?: string[];
  linkSharingEnabled?: boolean;
  linkSharingScope?: WorkspaceDocLinkScope;
  linkSharingPermission?: WorkspaceDocPermission;
}

export interface UpdateWorkspaceDocRequestBody {
  title?: string;
  icon?: string;
  summary?: string;
  publishState?: WorkspaceDocPublishState;
  category?: string;
  tags?: string[];
  confidenceScore?: number;
  featured?: boolean;
  pinned?: boolean;
  content?: unknown[];
  accessScope?: WorkspaceDocAccessScope;
  workspacePermission?: WorkspaceDocPermission;
  assignedPermission?: WorkspaceDocPermission;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
  assignedProjectIds?: string[];
  linkSharingEnabled?: boolean;
  linkSharingScope?: WorkspaceDocLinkScope;
  linkSharingPermission?: WorkspaceDocPermission;
}
