import {
  ProjectEditorValues,
  ProjectOverviewRecord,
  ProjectRisk,
  ProjectRiskComment,
  ProjectRiskKind,
  ProjectRiskSeverity,
  ProjectRiskState,
  ProjectStatus,
  ProjectSubtaskEditorValues,
  ProjectTaskDraftSubtask,
  ProjectWorkflowSubtask,
  ProjectWorkflowTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectWorkflowStatus,
} from "@/components/projects/overview/types";

export interface WorkspaceProjectRecord {
  _id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  status: ProjectStatus;
  summary: string;
  archived: boolean;
  record: ProjectOverviewRecord;
  createdAt: string;
  updatedAt: string;
}

export type CreateWorkspaceProjectRequestBody = Omit<ProjectEditorValues, "emoji">;

export interface UpdateWorkspaceProjectRequestBody {
  name?: string;
  status?: ProjectStatus;
  summary?: string;
  archived?: boolean;
  record?: ProjectOverviewRecord;
}

export interface CreateWorkspaceProjectWorkflowRequestBody {
  name: string;
  description?: string;
  status?: ProjectWorkflowStatus;
  ownerId?: string;
  teamId?: string;
  pipelineId?: string;
}

export interface UpdateWorkspaceProjectWorkflowRequestBody {
  name: string;
  teamId?: string;
  status?: ProjectWorkflowStatus;
}

export interface CreateWorkspaceProjectTaskRequestBody {
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId?: string;
  teamId: string;
  pipelineId: string;
  startDate: string;
  dueDate: string;
  estimateHours?: number;
  remainingHours?: number;
  sectionId?: string;
  subtasks?: ProjectTaskDraftSubtask[];
}

export type UpdateWorkspaceProjectTaskRequestBody =
  Partial<CreateWorkspaceProjectTaskRequestBody>;

export interface InviteWorkspaceProjectCollaboratorsRequestBody {
  workflowId?: string;
  access?: "edit" | "comment" | "view";
  teamIds?: string[];
  memberIds?: string[];
  emails?: string[];
  message?: string;
}

export interface RemoveWorkspaceProjectCollaboratorsRequestBody {
  workflowId?: string;
  teamIds?: string[];
  memberIds?: string[];
}

export interface CreateWorkspaceProjectRiskRequestBody {
  kind: ProjectRiskKind;
  title: string;
  description: string;
  severity: ProjectRiskSeverity;
  ownerUserId?: string;
  status?: string;
  state?: ProjectRiskState;
  pipelineId?: string;
  teamId?: string;
}

export type UpdateWorkspaceProjectRiskRequestBody =
  Partial<CreateWorkspaceProjectRiskRequestBody>;

export interface CreateWorkspaceProjectRiskCommentRequestBody {
  message: string;
  mentions?: Array<{
    kind: "user" | "team";
    id: string;
    label: string;
  }>;
}

export type WorkspaceProjectSecretVisibility =
  | "team"
  | "restricted";

export interface WorkspaceProjectSecretPolicy {
  defaultVisibility: WorkspaceProjectSecretVisibility;
}

export interface WorkspaceProjectSubtaskEditorValuesWithEffort
  extends ProjectSubtaskEditorValues {
  estimateHours?: number;
  remainingHours?: number;
}

export interface WorkspaceProjectSecretRecord {
  id: string;
  key: string;
  note: string;
  visibility: WorkspaceProjectSecretVisibility;
  memberIds: string[];
  teamIds: string[];
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
  valueMasked: string;
  canReveal: boolean;
  value?: string;
}

export interface CreateWorkspaceProjectSecretRequestBody {
  key: string;
  value: string;
  note?: string;
  visibility: WorkspaceProjectSecretVisibility;
  memberIds?: string[];
  teamIds?: string[];
}

export type UpdateWorkspaceProjectSecretRequestBody =
  Partial<CreateWorkspaceProjectSecretRequestBody>;

export interface UpdateWorkspaceProjectSecretPolicyRequestBody {
  defaultVisibility: WorkspaceProjectSecretVisibility;
}

export type CreateWorkspaceProjectSubtaskRequestBody =
  WorkspaceProjectSubtaskEditorValuesWithEffort;

export type UpdateWorkspaceProjectSubtaskRequestBody =
  Partial<CreateWorkspaceProjectSubtaskRequestBody>;

export type WorkspaceProjectTaskRecord = ProjectWorkflowTask & {
  workflowId: string;
  workflowName: string;
};

export type WorkspaceProjectSubtaskRecord = ProjectWorkflowSubtask;

export type WorkspaceProjectRiskRecord = ProjectRisk;

export type WorkspaceProjectRiskCommentRecord = ProjectRiskComment;

export type WorkspaceProjectNotificationType =
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
  | "support.ticket.assigned"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected";

export type WorkspaceProjectAgentRunType =
  | "standup"
  | "overdue"
  | "digest"
  | "deadline"
  | "meeting";

export interface WorkspaceProjectAutomationMeeting {
  id: string;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  location: string;
  memberUserIds: string[];
  teamIds: string[];
  archived: boolean;
  createdByUserId: string;
}

export interface WorkspaceProjectAgentConfig {
  id: string;
  workspaceId: string;
  projectId: string;
  enabled: boolean;
  timezone: string;
  standup: {
    enabled: boolean;
    hour: number;
    minute: number;
    promptTemplate: string;
    roomId: string;
    lastRunAt: string | null;
  };
  overdueReminder: {
    enabled: boolean;
    intervalMinutes: number;
    includeUnassigned: boolean;
    dedupeWindowMinutes: number;
    roomId: string;
    lastRunAt: string | null;
  };
  managerDigest: {
    enabled: boolean;
    hour: number;
    minute: number;
    managerUserIds: string[];
    roomId: string;
    lastRunAt: string | null;
  };
  taskReminder: {
    enabled: boolean;
    intervalMinutes: number;
    thresholdHours: number;
    includeSubtasks: boolean;
    includeTeamFallback: boolean;
    dedupeWindowMinutes: number;
    roomId: string;
    lastRunAt: string | null;
  };
  meetingReminder: {
    enabled: boolean;
    intervalMinutes: number;
    reminderMinutes: number;
    dedupeWindowMinutes: number;
    roomId: string;
    lastRunAt: string | null;
  };
  meetings: WorkspaceProjectAutomationMeeting[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProjectAgentStats {
  totalTasks: number;
  totalSubtasks?: number;
  overdueTasks: number;
  openRisks: number;
  activeWorkflows: number;
}

export interface WorkspaceProjectAgentRunRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  agentId: string;
  runType: WorkspaceProjectAgentRunType;
  status: "success" | "skipped" | "failed";
  summary: string;
  metrics: Record<string, unknown>;
  createdEvents: number;
  createdMessages: number;
  createdNotifications: number;
  triggeredBy: {
    kind: "scheduler" | "manual" | "event";
    userId: string;
  };
  error: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProjectNotificationRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  recipientUserId: string;
  actorUserId: string;
  actorName: string;
  actorInitials: string;
  type: WorkspaceProjectNotificationType;
  title: string;
  summary: string;
  route: string;
  target: WorkspaceProjectEventTarget;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProjectEventTarget {
  kind: string;
  id: string;
  label: string;
  workflowId: string;
  taskId: string;
  subtaskId: string;
  riskId: string;
  tab: string;
}

export interface WorkspaceProjectEventRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  eventType: string;
  summary: string;
  actorUserId: string;
  actorName: string;
  actorInitials: string;
  actorAvatarUrl?: string;
  route: string;
  target: WorkspaceProjectEventTarget;
  pipelineId: string;
  teamId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
