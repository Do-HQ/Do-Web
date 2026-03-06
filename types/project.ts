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

export type CreateWorkspaceProjectSubtaskRequestBody = ProjectSubtaskEditorValues;

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
  | "workflow.team.assigned";

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
  route: string;
  target: WorkspaceProjectEventTarget;
  pipelineId: string;
  teamId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
