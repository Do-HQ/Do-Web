import { Pagination } from "@/types";

export type WorkspaceJamVisibility = "private" | "workspace";
export type WorkspaceJamScopeFilter = "all" | "mine" | "shared";

export interface WorkspaceJamUserSummary {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl: string;
}

export interface WorkspaceJamRecord {
  id: string;
  jamId: string;
  workspaceId: string;
  title: string;
  description: string;
  visibility: WorkspaceJamVisibility;
  ownerUserId: string;
  owner: WorkspaceJamUserSummary | null;
  lastEditedByUserId: string;
  lastEditedBy: WorkspaceJamUserSummary | null;
  lastEditedAt: string | null;
  archived: boolean;
  sharedUserIds: string[];
  sharedTeamIds: string[];
  sharedRoomIds: string[];
  canEdit: boolean;
  canView: boolean;
  snapshot?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceJamListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  archived?: boolean;
  scope?: WorkspaceJamScopeFilter;
  includeSnapshot?: boolean;
}

export interface WorkspaceJamShareTargetUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl: string;
}

export interface WorkspaceJamShareTargetTeam {
  id: string;
  name: string;
  key: string;
  memberCount: number;
}

export interface WorkspaceJamShareTargetRoom {
  id: string;
  name: string;
  kind: "direct" | "group" | "project" | "task" | string;
  scope: "workspace" | "team" | "project" | "workflow" | "task" | string;
  visibility: "open" | "private" | string;
  members: number;
}

export interface WorkspaceJamShareTargetsResponse {
  users: WorkspaceJamShareTargetUser[];
  teams: WorkspaceJamShareTargetTeam[];
  rooms: WorkspaceJamShareTargetRoom[];
}

export interface CreateWorkspaceJamRequestBody {
  title: string;
  description?: string;
  visibility?: WorkspaceJamVisibility;
  snapshot?: Record<string, unknown> | null;
  sharedUserIds?: string[];
  sharedTeamIds?: string[];
  sharedRoomIds?: string[];
}

export interface UpdateWorkspaceJamRequestBody {
  title?: string;
  description?: string;
  visibility?: WorkspaceJamVisibility;
}

export interface UpdateWorkspaceJamContentRequestBody {
  snapshot: Record<string, unknown>;
}

export interface ShareWorkspaceJamRequestBody {
  userIds?: string[];
  teamIds?: string[];
  roomIds?: string[];
  replace?: boolean;
  visibility?: WorkspaceJamVisibility;
  announceInRooms?: boolean;
  note?: string;
}

export interface WorkspaceJamsResponse {
  message: string;
  jams: WorkspaceJamRecord[];
  pagination: Pagination;
}
