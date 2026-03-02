export type Participant = {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  role?: string;
  isMuted: boolean;
  isVideoOn: boolean;
};

export type CallChatMessage = {
  id: string;
  author: string;
  content: string;
  sentAt: string;
};

export type PanelTab = "people" | "notes" | "chat";

export type MinimizedTeamCall = {
  roomName: string;
  roomScope: string;
  startedAt: number;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
};
