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
