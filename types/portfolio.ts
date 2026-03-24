export interface WorkspacePlanningConfig {
  horizonDays: number;
  defaultCapacityHoursPerWeek: number;
  velocityLookbackWeeks: number;
  capacityDerivedFromWorkSchedule?: boolean;
  workScheduleStartTime?: string;
  workScheduleCloseTime?: string;
  workDaysPerWeek?: number;
}

export interface PortfolioExecutiveSummary {
  projects: number;
  workflows: number;
  tasks: number;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  completionRate: number;
  deliveryRiskScore: number;
}

export interface PortfolioHealthRow {
  projectId: string;
  projectName: string;
  healthScore: number;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completedTasks: number;
  completionRate: number;
  dominantWorkflowStatus: string;
  deliveryRiskScore: number;
}

export interface PortfolioVelocityRow {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  completedTasks: number;
}

export interface PortfolioKeyResultCheckIn {
  id: string;
  value: number;
  note: string;
  userId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PortfolioKeyResult {
  id: string;
  title: string;
  metricType: "percent" | "number" | "boolean";
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  checkIns: PortfolioKeyResultCheckIn[];
}

export interface PortfolioObjective {
  id: string;
  title: string;
  description: string;
  ownerUserId: string;
  projectIds: string[];
  archived: boolean;
  progress: number;
  keyResults: PortfolioKeyResult[];
}

export interface PortfolioOkrCycle {
  id: string;
  workspaceId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "active" | "closed";
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  objectives: PortfolioObjective[];
}

export interface PortfolioDependencyRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  sourceWorkflowId: string;
  sourceTaskId: string;
  targetWorkflowId: string;
  targetTaskId: string;
  type: "finish-to-start";
  lagDays: number;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioDependencyNode {
  id: string;
  taskId: string;
  title: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startDate: string;
  dueDate: string;
}

export interface PortfolioSimulationImpactRow {
  taskId: string;
  title: string;
  workflowId: string;
  workflowName: string;
  oldDueDate: string;
  newDueDate: string;
  deltaDays: number;
}

export interface CapacityMemberRow {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  teamIds: string[];
  capacityHours: number;
  demandHours: number;
  utilization: number;
  status: "overloaded" | "near-capacity" | "under-utilized" | "balanced";
}

export interface CapacityTeamRow {
  teamId: string;
  teamName?: string;
  members: number;
  capacityHours: number;
  demandHours: number;
  utilization: number;
}

export interface CapacityRecommendationRow {
  sourceUserId: string;
  sourceName: string;
  targetUserId: string;
  targetName: string;
  confidence: number;
  reason: string;
}

export interface ApprovalPolicy {
  riskResolveClose: boolean;
  secretsMutations: boolean;
  docsPublishing: boolean;
  workflowStageChanges: boolean;
  requiredApproverRoles: Array<"owner" | "admin">;
}

export interface ApprovalDecisionLogEntry {
  id: string;
  userId: string;
  decision: "approved" | "rejected";
  note: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApprovalRequestRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  entityKind: string;
  entityId: string;
  actionType: string;
  summary: string;
  route: string;
  status: "pending" | "approved" | "rejected" | "applied" | "failed";
  requesterUserId: string;
  requiredApproverRoles: string[];
  payloadSnapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
  decisionLog: ApprovalDecisionLogEntry[];
  resolvedAt: string | null;
  appliedAt: string | null;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOkrCyclePayload {
  name: string;
  periodStart: string;
  periodEnd: string;
  status?: "draft" | "active" | "closed";
}

export interface UpdateOkrCyclePayload {
  name?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: "draft" | "active" | "closed";
}

export interface CreateOkrObjectivePayload {
  title: string;
  description?: string;
  ownerUserId?: string;
  projectIds?: string[];
  keyResults?: Array<{
    title: string;
    metricType?: "percent" | "number" | "boolean";
    startValue?: number;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
  }>;
}

export interface UpdateOkrObjectivePayload {
  title?: string;
  description?: string;
  ownerUserId?: string;
  projectIds?: string[];
  archived?: boolean;
}

export interface OkrCheckInPayload {
  value: number;
  note?: string;
}

export interface CreateTaskDependencyPayload {
  projectId: string;
  sourceTaskId: string;
  targetTaskId: string;
  type?: "finish-to-start";
  lagDays?: number;
}

export interface SimulateDependencyPayload {
  projectId: string;
  taskId: string;
  shiftDays: number;
}

export interface UpdatePlanningPayload {
  horizonDays?: number;
  defaultCapacityHoursPerWeek?: number;
  velocityLookbackWeeks?: number;
}

export interface UpsertMemberCapacityPayload {
  weeklyCapacityHours: number;
}
