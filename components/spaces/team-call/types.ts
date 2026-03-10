export type Participant = {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  role?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream | null;
};

export type CallChatMessage = {
  id: string;
  authorUserId?: string;
  author: string;
  content: string;
  sentAt: string;
};

export type PanelTab = "people" | "notes" | "chat";

export type MinimizedTeamCall = {
  roomId?: string;
  roomName: string;
  roomScope: string;
  callMode?: "voice" | "video";
  startedAt: number;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
};
