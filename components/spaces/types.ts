import type { LucideIcon } from "lucide-react";

export type SpaceScope = "workspace" | "team" | "project" | "workflow" | "task";

export type SpaceRoom = {
  id: string;
  kind?: "direct" | "group" | "project" | "task";
  name: string;
  scope: SpaceScope;
  visibility: "open" | "private";
  members: number;
  unread: number;
  topic: string;
  meta?: {
    projectId?: string | null;
    workflowId?: string | null;
    taskId?: string | null;
    customColor?: string | null;
  };
};

export type ChatAttachment = {
  id: string;
  name: string;
  kind: "image" | "file";
  url?: string;
  file?: File;
};

export type MentionSuggestion = {
  id: string;
  display: string;
};

export type MentionTokenMeta = {
  token: string;
  label: string;
  kind: "user" | "team" | "project";
  user?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    team?: string;
  };
};

export type SpaceUserInfo = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  team?: string;
  avatarUrl?: string;
};

export type ChatAuthor = {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  role: "member" | "agent";
};

export type SpaceMessage = {
  id: string;
  roomId: string;
  parentMessageId?: string | null;
  author: ChatAuthor;
  content: string;
  sentAt: string;
  sentAtRaw?: string;
  edited?: boolean;
  attachments?: ChatAttachment[];
  threadCount?: number;
};

export type ThreadReply = {
  id: string;
  messageId: string;
  author: ChatAuthor;
  content: string;
  sentAt: string;
  sentAtRaw?: string;
  edited?: boolean;
  attachments?: ChatAttachment[];
};

export type PersonalCallState = {
  roomId: string;
  contactName: string;
  mode: "voice" | "video";
  startedAt: number;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeakerOn: boolean;
};

export type TeamCallWidgetState = {
  roomId?: string;
  roomName: string;
  roomScope: string;
  callMode?: "voice" | "video";
  startedAt: number;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
};

export type ScopeMeta = Record<SpaceScope, { label: string; icon: LucideIcon }>;
