export type WorkspaceSpaceRoomKind = "direct" | "group" | "project" | "task";

export type WorkspaceSpaceRoomScope =
  | "workspace"
  | "team"
  | "project"
  | "workflow"
  | "task";

export type WorkspaceSpaceRoomVisibility = "open" | "private";

export interface WorkspaceSpaceAuthor {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string;
  role: "member" | "agent";
}

export interface WorkspaceSpaceAttachment {
  id: string;
  name: string;
  kind: "image" | "file";
  url?: string;
}

export interface WorkspaceSpaceRoomRecord {
  id: string;
  kind: WorkspaceSpaceRoomKind;
  name: string;
  scope: WorkspaceSpaceRoomScope;
  visibility: WorkspaceSpaceRoomVisibility;
  members: number;
  unread: number;
  topic: string;
  avatarUrl?: string;
  avatarFallback?: string;
  meta: {
    projectId: string | null;
    workflowId: string | null;
    taskId: string | null;
    customColor: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSpaceMessageRecord {
  id: string;
  roomId: string;
  parentMessageId: string | null;
  author: WorkspaceSpaceAuthor;
  content: string;
  sentAt: string;
  edited: boolean;
  attachments: WorkspaceSpaceAttachment[];
  threadCount: number;
}

export interface WorkspaceSpaceKeepUpItem {
  id: string;
  roomId: string;
  roomName: string;
  messageId: string;
  parentMessageId: string;
  parentMessagePreview: string;
  content: string;
  sentAt: string;
  author: WorkspaceSpaceAuthor;
  route: string;
}

export interface SpacePagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}

export interface WorkspaceSpaceRoomsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  kind?: WorkspaceSpaceRoomKind | "all";
}

export interface WorkspaceSpaceMessagesQueryParams {
  page?: number;
  limit?: number;
}

export interface WorkspaceSpaceKeepUpQueryParams {
  page?: number;
  limit?: number;
}

export interface CreateWorkspaceSpaceRoomRequestBody {
  kind: "direct" | "group";
  name?: string;
  topic?: string;
  visibility?: WorkspaceSpaceRoomVisibility;
  customColor?: string;
  memberUserIds: string[];
}

export interface CreateWorkspaceSpaceMessageRequestBody {
  content: string;
  attachments?: WorkspaceSpaceAttachment[];
}

export interface UpdateWorkspaceSpaceMessageRequestBody {
  content: string;
}
