import { Pagination } from "@/types";

export type WorkspaceJamVisibility = "private" | "workspace";
export type WorkspaceJamScopeFilter = "all" | "mine" | "shared";
export type WorkspaceJamEditAccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected";
export type WorkspaceJamMentionKind = "user" | "team";

export interface WorkspaceJamUserSummary {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl: string;
}

export interface WorkspaceJamEditAccessRequestRecord {
  id: string;
  userId: string;
  requester: WorkspaceJamUserSummary | null;
  message: string;
  status: WorkspaceJamEditAccessRequestStatus;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string;
}

export interface WorkspaceJamMentionRecord {
  kind: WorkspaceJamMentionKind;
  id: string;
  label: string;
}

export interface WorkspaceJamReplyRecord {
  id: string;
  userId: string;
  user: WorkspaceJamUserSummary | null;
  message: string;
  mentions: WorkspaceJamMentionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceJamCommentRecord {
  id: string;
  userId: string;
  user: WorkspaceJamUserSummary | null;
  message: string;
  mentions: WorkspaceJamMentionRecord[];
  replies: WorkspaceJamReplyRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceJamActivityRecord {
  id: string;
  type: string;
  summary: string;
  actorUserId: string;
  actorName: string;
  actorInitials: string;
  metadata: Record<string, unknown>;
  createdAt: string;
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
  editorUserIds: string[];
  hasPendingEditAccessRequest: boolean;
  pendingEditAccessRequestCount: number;
  pendingEditAccessRequests: WorkspaceJamEditAccessRequestRecord[];
  commentCount: number;
  comments: WorkspaceJamCommentRecord[];
  activity: WorkspaceJamActivityRecord[];
  canEdit: boolean;
  canManage: boolean;
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

export interface RequestWorkspaceJamEditAccessRequestBody {
  message?: string;
}

export interface ReviewWorkspaceJamEditAccessRequestBody {
  action: "approve" | "reject";
}

export interface CreateWorkspaceJamCommentRequestBody {
  message: string;
  parentCommentId?: string;
  mentions?: WorkspaceJamMentionRecord[];
}

export interface WorkspaceJamsResponse {
  message: string;
  jams: WorkspaceJamRecord[];
  pagination: Pagination;
}
