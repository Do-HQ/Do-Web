import type { LucideIcon } from "lucide-react";

export type SpaceScope = "workspace" | "team" | "project" | "workflow" | "task";

export type SpaceRoom = {
  id: string;
  name: string;
  scope: SpaceScope;
  visibility: "open" | "private";
  members: number;
  unread: number;
  topic: string;
};

export type ChatAttachment = {
  id: string;
  name: string;
  kind: "image" | "file";
  url?: string;
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
  author: ChatAuthor;
  content: string;
  sentAt: string;
  edited?: boolean;
  attachments?: ChatAttachment[];
};

export type ThreadReply = {
  id: string;
  messageId: string;
  author: ChatAuthor;
  content: string;
  sentAt: string;
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
  roomName: string;
  roomScope: string;
  startedAt: number;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
};

export type ScopeMeta = Record<SpaceScope, { label: string; icon: LucideIcon }>;
