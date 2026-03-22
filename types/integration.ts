export type SlackBindingEventType =
  | "all"
  | "task.assigned"
  | "task.reassigned"
  | "risk.mentioned"
  | "issue.mentioned"
  | "team.mentioned"
  | "space.mentioned"
  | "jam.mentioned"
  | "jam.access.approved"
  | "jam.access.rejected"
  | "workflow.team.assigned"
  | "agent.standup.prompt"
  | "agent.overdue.reminder"
  | "agent.manager.digest"
  | "task.deadline.reminder"
  | "subtask.deadline.reminder"
  | "meeting.reminder"
  | "support.ticket.created"
  | "support.ticket.updated"
  | "support.ticket.message"
  | "support.ticket.assigned";

export interface WorkspaceSlackConnectionRecord {
  id: string;
  workspaceId: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  scopes: string[];
  status: "active" | "disconnected";
  connectedByUserId: string;
  installedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceSlackChannelBindingRecord {
  id: string;
  workspaceId: string;
  channelId: string;
  channelName: string;
  eventTypes: SlackBindingEventType[];
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceSlackChannelRecord {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface WorkspaceSlackIntegrationResponseBody {
  isConnected: boolean;
  connection: WorkspaceSlackConnectionRecord | null;
  channels: WorkspaceSlackChannelBindingRecord[];
}

export interface UpdateWorkspaceSlackBindingsRequestBody {
  channels: Array<{
    channelId: string;
    channelName: string;
    eventTypes: SlackBindingEventType[];
    enabled?: boolean;
  }>;
}

export interface WorkspaceGoogleCalendarConnectionRecord {
  id: string;
  workspaceId: string;
  accountEmail: string;
  scopes: string[];
  status: "active" | "disconnected";
  connectedByUserId: string;
  installedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceGoogleCalendarBindingRecord {
  id: string;
  workspaceId: string;
  calendarId: string;
  calendarName: string;
  colorId: string;
  isPrimary: boolean;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceGoogleCalendarRecord {
  id: string;
  summary: string;
  colorId: string;
  isPrimary: boolean;
}

export interface WorkspaceGoogleCalendarIntegrationResponseBody {
  isConnected: boolean;
  connection: WorkspaceGoogleCalendarConnectionRecord | null;
  calendars: WorkspaceGoogleCalendarBindingRecord[];
}

export interface UpdateWorkspaceGoogleCalendarBindingsRequestBody {
  calendars: Array<{
    calendarId: string;
    calendarName: string;
    colorId?: string;
    isPrimary?: boolean;
    enabled?: boolean;
  }>;
}

export interface WorkspaceGoogleDriveConnectionRecord {
  id: string;
  workspaceId: string;
  accountEmail: string;
  scopes: string[];
  status: "active" | "disconnected";
  connectedByUserId: string;
  installedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceGoogleDriveFileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
  webViewLink: string;
  previewLink: string;
  downloadLink: string;
  iconLink: string;
  thumbnailLink: string;
  ownerName: string;
  ownerEmail: string;
  ownerAvatarUrl: string;
}

export interface WorkspaceGoogleDriveIntegrationResponseBody {
  isConnected: boolean;
  connection: WorkspaceGoogleDriveConnectionRecord | null;
}

export interface WorkspaceGoogleChatSpaceBindingRecord {
  id: string;
  workspaceId: string;
  spaceName: string;
  eventTypes: SlackBindingEventType[];
  enabled: boolean;
  status: "active" | "disconnected";
  connectedByUserId: string;
  connectedAt: string | null;
  disconnectedAt: string | null;
  webhookPreview: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceGoogleChatIntegrationResponseBody {
  isConnected: boolean;
  spaces: WorkspaceGoogleChatSpaceBindingRecord[];
}

export interface UpdateWorkspaceGoogleChatBindingsRequestBody {
  spaces: Array<{
    spaceName: string;
    webhookUrl?: string;
    eventTypes: SlackBindingEventType[];
    enabled?: boolean;
  }>;
}

export interface WorkspaceGithubConnectionRecord {
  id: string;
  workspaceId: string;
  accountLogin: string;
  accountId: number;
  accountAvatarUrl: string;
  accountHtmlUrl: string;
  scopes: string[];
  status: "active" | "disconnected";
  connectedByUserId: string;
  installedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceGithubRepositoryRecord {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description: string;
  ownerLogin: string;
  ownerAvatarUrl: string;
  updatedAt: string | null;
}

export interface WorkspaceProjectGithubBindingRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  status: "active" | "disconnected";
  repositoryId: number;
  repositoryOwner: string;
  repositoryName: string;
  repositoryFullName: string;
  repositoryHtmlUrl: string;
  defaultBranch: string;
  syncTasks: boolean;
  syncRisks: boolean;
  linkedByUserId: string;
  linkedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceGithubIntegrationResponseBody {
  isConnected: boolean;
  connection: WorkspaceGithubConnectionRecord | null;
  webhook?: {
    url: string;
    hasSecret: boolean;
  };
}
