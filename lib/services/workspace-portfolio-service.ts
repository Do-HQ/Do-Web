import { Pagination } from "@/types";
import {
  ApprovalPolicy,
  ApprovalRequestRecord,
  CapacityMemberRow,
  CapacityRecommendationRow,
  CapacityTeamRow,
  CreateOkrCyclePayload,
  CreateOkrObjectivePayload,
  CreateTaskDependencyPayload,
  OkrCheckInPayload,
  PortfolioDependencyNode,
  PortfolioDependencyRecord,
  PortfolioHealthRow,
  PortfolioOkrCycle,
  PortfolioSimulationImpactRow,
  PortfolioVelocityRow,
  PortfolioExecutiveSummary,
  UpdateOkrCyclePayload,
  UpdateOkrObjectivePayload,
  UpdatePlanningPayload,
  UpsertMemberCapacityPayload,
  WorkspacePlanningConfig,
} from "@/types/portfolio";
import axiosInstance from ".";

const WORKSPACE_PORTFOLIO_ENDPOINTS = {
  summary: (workspaceId: string) => `/workspace/${workspaceId}/portfolio/summary`,
  health: (workspaceId: string) => `/workspace/${workspaceId}/portfolio/health`,
  velocity: (workspaceId: string) => `/workspace/${workspaceId}/portfolio/velocity`,
  capacity: (workspaceId: string) => `/workspace/${workspaceId}/portfolio/capacity`,
  planning: (workspaceId: string) => `/workspace/${workspaceId}/portfolio/planning`,
  memberCapacity: (workspaceId: string, memberUserId: string) =>
    `/workspace/${workspaceId}/portfolio/capacity/members/${memberUserId}`,

  okrCycles: (workspaceId: string) => `/workspace/${workspaceId}/okrs/cycles`,
  okrCycle: (workspaceId: string, cycleId: string) =>
    `/workspace/${workspaceId}/okrs/cycles/${cycleId}`,
  okrObjectives: (workspaceId: string, cycleId: string) =>
    `/workspace/${workspaceId}/okrs/cycles/${cycleId}/objectives`,
  okrObjective: (workspaceId: string, cycleId: string, objectiveId: string) =>
    `/workspace/${workspaceId}/okrs/cycles/${cycleId}/objectives/${objectiveId}`,
  okrCheckIn: (
    workspaceId: string,
    cycleId: string,
    objectiveId: string,
    keyResultId: string,
  ) =>
    `/workspace/${workspaceId}/okrs/cycles/${cycleId}/objectives/${objectiveId}/key-results/${keyResultId}/check-ins`,

  dependencies: (workspaceId: string) => `/workspace/${workspaceId}/dependencies`,
  dependency: (workspaceId: string, dependencyId: string) =>
    `/workspace/${workspaceId}/dependencies/${dependencyId}`,
  dependencyGraph: (workspaceId: string) => `/workspace/${workspaceId}/dependencies/graph`,
  criticalPath: (workspaceId: string) =>
    `/workspace/${workspaceId}/dependencies/critical-path`,
  dependencySimulation: (workspaceId: string) =>
    `/workspace/${workspaceId}/dependencies/simulate`,

  approvalsPolicy: (workspaceId: string) => `/workspace/${workspaceId}/approvals/policy`,
  approvalsRequests: (workspaceId: string) => `/workspace/${workspaceId}/approvals/requests`,
  approvalApprove: (workspaceId: string, requestId: string) =>
    `/workspace/${workspaceId}/approvals/requests/${requestId}/approve`,
  approvalReject: (workspaceId: string, requestId: string) =>
    `/workspace/${workspaceId}/approvals/requests/${requestId}/reject`,
};

export interface PortfolioSummaryQueryParams {
  projectId?: string;
  teamId?: string;
}

export interface PortfolioHealthQueryParams {
  projectId?: string;
}

export interface PortfolioVelocityQueryParams {
  projectId?: string;
}

export interface OkrCyclesQueryParams {
  status?: "all" | "draft" | "active" | "closed";
}

export interface DependenciesQueryParams {
  projectId?: string;
}

export interface CapacityOverviewQueryParams {
  horizonDays?: number;
  search?: string;
  teamId?: string;
  page?: number;
  limit?: number;
}

export interface ApprovalRequestsQueryParams {
  page?: number;
  limit?: number;
  status?: "pending" | "approved" | "rejected" | "applied" | "failed" | "all";
  actionType?: string;
}

export const getWorkspacePortfolioSummary = async (
  workspaceId: string,
  params: PortfolioSummaryQueryParams = {},
) => {
  return await axiosInstance.get<{
    message: string;
    planning: WorkspacePlanningConfig;
    summary: PortfolioExecutiveSummary;
    health: PortfolioHealthRow[];
    velocity: PortfolioVelocityRow[];
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.summary(workspaceId), { params });
};

export const getWorkspacePortfolioHealth = async (
  workspaceId: string,
  params: PortfolioHealthQueryParams = {},
) => {
  return await axiosInstance.get<{
    message: string;
    rows: PortfolioHealthRow[];
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.health(workspaceId), { params });
};

export const getWorkspacePortfolioVelocity = async (
  workspaceId: string,
  params: PortfolioVelocityQueryParams = {},
) => {
  return await axiosInstance.get<{
    message: string;
    rows: PortfolioVelocityRow[];
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.velocity(workspaceId), { params });
};

export const getWorkspaceCapacityOverview = async (
  workspaceId: string,
  params: CapacityOverviewQueryParams = {},
) => {
  return await axiosInstance.get<{
    message: string;
    planning: WorkspacePlanningConfig;
    members: CapacityMemberRow[];
    teams: CapacityTeamRow[];
    recommendations: CapacityRecommendationRow[];
    pagination: Pagination;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.capacity(workspaceId), { params });
};

export const updateWorkspacePlanningConfig = async (data: {
  workspaceId: string;
  updates: UpdatePlanningPayload;
}) => {
  return await axiosInstance.patch<{
    message: string;
    planning: WorkspacePlanningConfig;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.planning(data.workspaceId), data.updates);
};

export const upsertWorkspaceMemberCapacity = async (data: {
  workspaceId: string;
  memberUserId: string;
  payload: UpsertMemberCapacityPayload;
}) => {
  return await axiosInstance.patch<{
    message: string;
    capacity: {
      id: string;
      workspaceId: string;
      memberUserId: string;
      weeklyCapacityHours: number;
      active: boolean;
      updatedAt: string;
    };
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.memberCapacity(data.workspaceId, data.memberUserId),
    data.payload,
  );
};

export const getWorkspaceOkrCycles = async (
  workspaceId: string,
  params: OkrCyclesQueryParams = {},
) => {
  return await axiosInstance.get<{
    message: string;
    cycles: PortfolioOkrCycle[];
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.okrCycles(workspaceId), { params });
};

export const createWorkspaceOkrCycle = async (data: {
  workspaceId: string;
  payload: CreateOkrCyclePayload;
}) => {
  return await axiosInstance.post<{
    message: string;
    cycle: PortfolioOkrCycle;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.okrCycles(data.workspaceId), data.payload);
};

export const updateWorkspaceOkrCycle = async (data: {
  workspaceId: string;
  cycleId: string;
  updates: UpdateOkrCyclePayload;
}) => {
  return await axiosInstance.patch<{
    message: string;
    cycle: PortfolioOkrCycle;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.okrCycle(data.workspaceId, data.cycleId),
    data.updates,
  );
};

export const createWorkspaceOkrObjective = async (data: {
  workspaceId: string;
  cycleId: string;
  payload: CreateOkrObjectivePayload;
}) => {
  return await axiosInstance.post<{
    message: string;
    cycle: PortfolioOkrCycle;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.okrObjectives(data.workspaceId, data.cycleId),
    data.payload,
  );
};

export const updateWorkspaceOkrObjective = async (data: {
  workspaceId: string;
  cycleId: string;
  objectiveId: string;
  updates: UpdateOkrObjectivePayload;
}) => {
  return await axiosInstance.patch<{
    message: string;
    cycle: PortfolioOkrCycle;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.okrObjective(
      data.workspaceId,
      data.cycleId,
      data.objectiveId,
    ),
    data.updates,
  );
};

export const checkInWorkspaceOkrKeyResult = async (data: {
  workspaceId: string;
  cycleId: string;
  objectiveId: string;
  keyResultId: string;
  payload: OkrCheckInPayload;
}) => {
  return await axiosInstance.post<{
    message: string;
    cycle: PortfolioOkrCycle;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.okrCheckIn(
      data.workspaceId,
      data.cycleId,
      data.objectiveId,
      data.keyResultId,
    ),
    data.payload,
  );
};

export const getWorkspaceTaskDependencies = async (
  workspaceId: string,
  params: DependenciesQueryParams = {},
) => {
  return await axiosInstance.get<{
    message: string;
    dependencies: PortfolioDependencyRecord[];
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.dependencies(workspaceId), { params });
};

export const createWorkspaceTaskDependency = async (data: {
  workspaceId: string;
  payload: CreateTaskDependencyPayload;
}) => {
  return await axiosInstance.post<{
    message: string;
    dependency: PortfolioDependencyRecord;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.dependencies(data.workspaceId), data.payload);
};

export const deleteWorkspaceTaskDependency = async (data: {
  workspaceId: string;
  dependencyId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    removedDependencyId: string;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.dependency(data.workspaceId, data.dependencyId),
  );
};

export const getWorkspaceDependencyGraph = async (
  workspaceId: string,
  params: Required<DependenciesQueryParams>,
) => {
  return await axiosInstance.get<{
    message: string;
    nodes: PortfolioDependencyNode[];
    edges: PortfolioDependencyRecord[];
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.dependencyGraph(workspaceId), { params });
};

export const getWorkspaceCriticalPath = async (
  workspaceId: string,
  params: Required<DependenciesQueryParams>,
) => {
  return await axiosInstance.get<{
    message: string;
    criticalPathTaskIds: string[];
    criticalPath: PortfolioDependencyNode[];
    estimatedDurationDays: number;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.criticalPath(workspaceId), { params });
};

export const simulateWorkspaceDependencyImpact = async (data: {
  workspaceId: string;
  payload: {
    projectId: string;
    taskId: string;
    shiftDays: number;
  };
}) => {
  return await axiosInstance.post<{
    message: string;
    taskId: string;
    shiftDays: number;
    impacted: PortfolioSimulationImpactRow[];
    impactedCount: number;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.dependencySimulation(data.workspaceId), data.payload);
};

export const getWorkspaceApprovalPolicy = async (workspaceId: string) => {
  return await axiosInstance.get<{
    message: string;
    policy: ApprovalPolicy;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.approvalsPolicy(workspaceId));
};

export const updateWorkspaceApprovalPolicy = async (data: {
  workspaceId: string;
  updates: Partial<ApprovalPolicy>;
}) => {
  return await axiosInstance.patch<{
    message: string;
    policy: ApprovalPolicy;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.approvalsPolicy(data.workspaceId), data.updates);
};

export const getWorkspaceApprovalRequests = async (
  workspaceId: string,
  params: ApprovalRequestsQueryParams = {},
) => {
  const {
    page = 1,
    limit = 20,
    status = "pending",
    actionType = "",
  } = params;

  return await axiosInstance.get<{
    message: string;
    requests: ApprovalRequestRecord[];
    pagination: Pagination;
  }>(WORKSPACE_PORTFOLIO_ENDPOINTS.approvalsRequests(workspaceId), {
    params: { page, limit, status, actionType },
  });
};

export const approveWorkspaceApprovalRequest = async (data: {
  workspaceId: string;
  requestId: string;
  note?: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    request: ApprovalRequestRecord;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.approvalApprove(data.workspaceId, data.requestId),
    {
      note: data.note || "",
    },
  );
};

export const rejectWorkspaceApprovalRequest = async (data: {
  workspaceId: string;
  requestId: string;
  note?: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    request: ApprovalRequestRecord;
  }>(
    WORKSPACE_PORTFOLIO_ENDPOINTS.approvalReject(data.workspaceId, data.requestId),
    {
      note: data.note || "",
    },
  );
};
