export type ProjectTabKey =
  | "overview"
  | "workflows"
  | "dos"
  | "files-assets"
  | "risks-issues"
  | "secrets"
  | "agents-automation";

export type ProjectStatus = "on-track" | "at-risk" | "paused";
export type ProjectRiskSeverity = "high" | "medium" | "low";
export type ProjectRiskKind = "risk" | "issue";
export type ProjectRiskState = "open" | "resolved" | "closed";
export type ProjectHeatmapLevel = "low" | "medium" | "high";
export type ProjectWorkflowStatus =
  | "on-track"
  | "at-risk"
  | "blocked"
  | "complete";
export type ProjectTaskStatus =
  | "todo"
  | "in-progress"
  | "review"
  | "done"
  | "blocked";
export type ProjectTaskPriority = "low" | "medium" | "high";
export type ProjectAssetType = "Document" | "Image" | "Video" | "Code";
export type ProjectKanbanSectionTone = "sky" | "violet" | "cyan" | "rose" | "amber" | "emerald";
export type ProjectExecutionState = "not-started" | "running" | "elapsed" | "complete";
export type ProjectWorkflowView = "all" | "active" | "at-risk" | "completed";
export type ProjectPipelineTemplateKey = "product" | "marketing" | "operations";
export type ProjectCreateSource = "manual" | "ai-draft";
export type ProjectDosView = "kanban" | "table" | "charts";
export type ProjectDosStatusFilter = "all" | "open" | "blocked" | "completed";

export interface ProjectTaskCounts {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
}

export interface ProjectMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarUrl?: string;
  active: boolean;
  teamIds: string[];
  score?: number;
  scoreBreakdown?: {
    taskAssignedPoints?: number;
    taskCompletionPoints?: number;
    taskOverduePenaltyPoints?: number;
    subtaskCompletionPoints?: number;
    subtaskOverduePenaltyPoints?: number;
    workflowCompletionPoints?: number;
    riskResolutionPoints?: number;
    riskClosurePoints?: number;
    awardedPoints?: number;
    penaltyPoints?: number;
  };
}

export interface ProjectHeatmapDay {
  day: number;
  level: ProjectHeatmapLevel;
  pipelineId?: string;
}

export interface ProjectPipelineSummary {
  id: string;
  name: string;
  description: string;
  taskCounts: ProjectTaskCounts;
  deadlineCount: number;
  dueWindow: string;
  progress: number;
  riskHint?: string;
  heatmap: ProjectHeatmapDay[];
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completion: number;
  pipelineId: string;
  teamId: string;
  owner: string;
}

export interface ProjectRisk {
  id: string;
  kind: ProjectRiskKind;
  title: string;
  description: string;
  severity: ProjectRiskSeverity;
  owner: string;
  ownerUserId?: string;
  createdByUserId?: string;
  status: string;
  state?: ProjectRiskState;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  closedAt?: string;
  closedByUserId?: string;
  comments?: ProjectRiskComment[];
  commentCount?: number;
  pipelineId?: string;
  teamId?: string;
}

export interface ProjectRiskComment {
  id: string;
  message: string;
  mentions?: Array<{
    kind: "user" | "team";
    id: string;
    label: string;
  }>;
  authorUserId: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl?: string;
  createdAt: string;
}

export interface ProjectActivityEvent {
  id: string;
  actor: string;
  actorInitials: string;
  actorAvatarUrl?: string;
  summary: string;
  createdAt: string;
  route?: string;
  eventType?: string;
  target?: {
    kind?: string;
    id?: string;
    label?: string;
    workflowId?: string;
    taskId?: string;
    subtaskId?: string;
    riskId?: string;
    tab?: string;
  };
  pipelineId?: string;
  teamId?: string;
}

export interface ProjectTeamSummary {
  id: string;
  name: string;
  focus: string;
  memberIds: string[];
  pipelineIds: string[];
  taskCounts: ProjectTaskCounts;
  progress: number;
  dueWindow: string;
}

export interface ProjectKanbanSection {
  id: string;
  label: string;
  tone: ProjectKanbanSectionTone;
}

export interface ProjectAsset {
  id: string;
  assetId?: string;
  name: string;
  type: ProjectAssetType;
  url?: string;
  mimeType?: string;
  resourceType?: string;
  uploadedBy: string;
  uploadedById?: string;
  uploadedAt: string;
  linkedTask: string;
  linkedTaskId?: string;
  fileSize: string;
  folder?: string;
}

export interface ProjectWorkflowSubtask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  assigneeId?: string;
  startDate?: string;
  dueDate: string;
  sectionId?: string;
  updatedAt: string;
  progress?: number;
  executionState?: ProjectExecutionState;
}

export interface ProjectWorkflowTask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId?: string;
  teamId: string;
  pipelineId: string;
  startDate?: string;
  dueDate: string;
  sectionId?: string;
  updatedAt: string;
  progress?: number;
  executionState?: ProjectExecutionState;
  subtasks?: ProjectWorkflowSubtask[];
}

export interface ProjectWorkflow {
  id: string;
  name: string;
  description?: string;
  archived?: boolean;
  collaboratorTeamIds?: string[];
  collaboratorMemberIds?: string[];
  status: ProjectWorkflowStatus;
  ownerId?: string;
  teamId: string;
  pipelineId: string;
  progress: number;
  dueWindow: string;
  updatedAt: string;
  startedAt: string;
  targetEndDate: string;
  completedAt?: string;
  taskCounts: ProjectTaskCounts;
  tasks: ProjectWorkflowTask[];
}

export interface ProjectWorkflowTimingSummary {
  workflowId: string;
  label: string;
  plannedDays: number;
  elapsedDays: number;
  varianceDays: number;
  status: "on-time" | "ahead" | "late" | "complete";
  fill: number;
}

export interface FlattenedProjectTask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId?: string;
  teamId: string;
  pipelineId: string;
  workflowId: string;
  workflowName: string;
  startDate: string;
  dueDate: string;
  updatedAt: string;
  subtaskCount: number;
  subtaskDoneCount: number;
  subtasks: ProjectWorkflowSubtask[];
  sectionId?: string;
  progress: number;
  executionState: ProjectExecutionState;
  isBlocked: boolean;
}

export interface ProjectEditorValues {
  name: string;
  summary: string;
  emoji: string;
  status: ProjectStatus;
  startDate: string;
  targetEndDate: string;
  initialPipelineTemplate?: ProjectPipelineTemplateKey;
}

export interface ProjectWorkflowEditorValues {
  name: string;
  teamId: string;
}

export interface ProjectSubtaskEditorValues {
  title: string;
  status: ProjectTaskStatus;
  assigneeId?: string;
  startDate: string;
  dueDate: string;
}

export type ProjectTaskDraftSubtask = ProjectSubtaskEditorValues;

export interface ProjectTaskEditorValues {
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

export interface ProjectOverviewRecord {
  id: string;
  emoji: string;
  name: string;
  status: ProjectStatus;
  summary: string;
  dueWindow: string;
  startDate: string;
  progress: number;
  riskHint?: string;
  taskCounts: ProjectTaskCounts;
  pipelines: ProjectPipelineSummary[];
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  risks: ProjectRisk[];
  activities: ProjectActivityEvent[];
  teams: ProjectTeamSummary[];
  heatmap: ProjectHeatmapDay[];
  customSections?: ProjectKanbanSection[];
  assets?: ProjectAsset[];
  workflows: ProjectWorkflow[];
}

export interface ProjectOverviewProps {
  projectId: string;
  pipelineId?: string;
  initialTab?: ProjectTabKey;
  initialWorkflowId?: string;
  initialTaskId?: string;
  initialRiskId?: string;
}
