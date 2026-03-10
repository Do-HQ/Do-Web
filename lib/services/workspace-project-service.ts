import { Pagination } from "@/types";
import { ProjectWorkflow } from "@/components/projects/overview/types";
import {
  CreateWorkspaceProjectRiskCommentRequestBody,
  CreateWorkspaceProjectRiskRequestBody,
  CreateWorkspaceProjectRequestBody,
  InviteWorkspaceProjectCollaboratorsRequestBody,
  CreateWorkspaceProjectSubtaskRequestBody,
  CreateWorkspaceProjectTaskRequestBody,
  CreateWorkspaceProjectWorkflowRequestBody,
  UpdateWorkspaceProjectRiskRequestBody,
  UpdateWorkspaceProjectRequestBody,
  UpdateWorkspaceProjectSubtaskRequestBody,
  UpdateWorkspaceProjectTaskRequestBody,
  UpdateWorkspaceProjectWorkflowRequestBody,
  WorkspaceProjectRecord,
  WorkspaceProjectRiskCommentRecord,
  WorkspaceProjectRiskRecord,
  WorkspaceProjectEventRecord,
  WorkspaceProjectNotificationRecord,
  WorkspaceProjectAgentConfig,
  WorkspaceProjectAgentRunRecord,
  WorkspaceProjectAgentRunType,
  WorkspaceProjectAgentStats,
  WorkspaceProjectSubtaskRecord,
  WorkspaceProjectTaskRecord,
} from "@/types/project";
import axiosInstance from ".";
import { PaginationBody } from "./workspace-service";

const WORKSPACE_PROJECT_ENDPOINTS = {
  projects: (workspaceId: string) => `/workspace/${workspaceId}/projects`,
  project: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}`,
  invitations: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/invitations`,
  workflows: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/workflows`,
  workflow: (workspaceId: string, projectId: string, workflowId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/workflows/${workflowId}`,
  tasks: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/tasks`,
  events: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/events`,
  agent: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/agent`,
  agentRun: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/agent/run`,
  agentRuns: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/agent/runs`,
  notifications: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/notifications`,
  notificationRead: (
    workspaceId: string,
    projectId: string,
    notificationId: string,
  ) =>
    `/workspace/${workspaceId}/projects/${projectId}/notifications/${notificationId}/read`,
  notificationReadAll: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/notifications/read-all`,
  workflowTasks: (workspaceId: string, projectId: string, workflowId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/workflows/${workflowId}/tasks`,
  workflowTask: (workspaceId: string, projectId: string, workflowId: string, taskId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/workflows/${workflowId}/tasks/${taskId}`,
  risks: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/risks`,
  risk: (workspaceId: string, projectId: string, riskId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/risks/${riskId}`,
  riskResolve: (workspaceId: string, projectId: string, riskId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/risks/${riskId}/resolve`,
  riskClose: (workspaceId: string, projectId: string, riskId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/risks/${riskId}/close`,
  riskComments: (workspaceId: string, projectId: string, riskId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/risks/${riskId}/comments`,
  workflowSubtasks: (
    workspaceId: string,
    projectId: string,
    workflowId: string,
    taskId: string,
  ) =>
    `/workspace/${workspaceId}/projects/${projectId}/workflows/${workflowId}/tasks/${taskId}/subtasks`,
  workflowSubtask: (
    workspaceId: string,
    projectId: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
  ) =>
    `/workspace/${workspaceId}/projects/${projectId}/workflows/${workflowId}/tasks/${taskId}/subtasks/${subtaskId}`,
};

export interface WorkspaceProjectsPaginationBody extends PaginationBody {
  archived?: boolean;
}

export interface WorkspaceProjectWorkflowsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  view?: "all" | "active" | "at-risk" | "completed";
  teamId?: string;
  pipelineId?: string;
  startDate?: string;
  sort?: "updated" | "progress" | "name";
  archived?: boolean;
}

export interface WorkspaceProjectTasksQueryParams {
  workflowId?: string;
  teamId?: string;
  pipelineId?: string;
  startDate?: string;
  statusFilter?: "all" | "open" | "blocked" | "completed";
}

export interface WorkspaceProjectEventsQueryParams {
  page?: number;
  limit?: number;
  teamId?: string;
  pipelineId?: string;
  search?: string;
  eventType?: string;
}

export interface WorkspaceProjectNotificationsQueryParams {
  page?: number;
  limit?: number;
  state?: "all" | "unread";
  type?: string;
}

export interface WorkspaceProjectAgentRunsQueryParams {
  page?: number;
  limit?: number;
  runType?: WorkspaceProjectAgentRunType | "";
}

export interface WorkspaceProjectRisksQueryParams {
  page?: number;
  limit?: number;
  kind?: "all" | "risk" | "issue";
  severity?: "all" | "high" | "medium" | "low";
  state?: "all" | "open" | "resolved" | "closed";
  teamId?: string;
  pipelineId?: string;
  search?: string;
  sort?: "updated" | "created" | "severity" | "title";
}

export interface UpdateWorkspaceProjectAgentRequestBody {
  enabled?: boolean;
  timezone?: string;
  standup?: {
    enabled?: boolean;
    hour?: number;
    minute?: number;
    promptTemplate?: string;
    roomId?: string;
  };
  overdueReminder?: {
    enabled?: boolean;
    intervalMinutes?: number;
    includeUnassigned?: boolean;
    dedupeWindowMinutes?: number;
    roomId?: string;
  };
  managerDigest?: {
    enabled?: boolean;
    hour?: number;
    minute?: number;
    managerUserIds?: string[];
    roomId?: string;
  };
  taskReminder?: {
    enabled?: boolean;
    intervalMinutes?: number;
    thresholdHours?: number;
    includeSubtasks?: boolean;
    includeTeamFallback?: boolean;
    dedupeWindowMinutes?: number;
    roomId?: string;
  };
  meetingReminder?: {
    enabled?: boolean;
    intervalMinutes?: number;
    reminderMinutes?: number;
    dedupeWindowMinutes?: number;
    roomId?: string;
  };
  meetings?: Array<{
    id?: string;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    location?: string;
    memberUserIds?: string[];
    teamIds?: string[];
    archived?: boolean;
    createdByUserId?: string;
  }>;
}

export const getWorkspaceProjects = async (
  workspaceId: string,
  params: WorkspaceProjectsPaginationBody,
) => {
  const { page = 1, limit = 50, search = "", archived = false } = params || {};

  return await axiosInstance.get<{
    message: string;
    projects: WorkspaceProjectRecord[];
    pagination: Pagination;
  }>(WORKSPACE_PROJECT_ENDPOINTS.projects(workspaceId), {
    params: { page, limit, search, archived },
  });
};

export const getWorkspaceProjectDetail = async (
  workspaceId: string,
  projectId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.project(workspaceId, projectId));
};

export const createWorkspaceProject = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceProjectRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.projects(data.workspaceId), data.payload);
};

export const updateWorkspaceProject = async (data: {
  workspaceId: string;
  projectId: string;
  updates: UpdateWorkspaceProjectRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.project(data.workspaceId, data.projectId), data.updates);
};

export const inviteWorkspaceProjectCollaborators = async (data: {
  workspaceId: string;
  projectId: string;
  payload: InviteWorkspaceProjectCollaboratorsRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    project: WorkspaceProjectRecord;
    invite?: {
      invitedCount: number;
    };
  }>(WORKSPACE_PROJECT_ENDPOINTS.invitations(data.workspaceId, data.projectId), data.payload);
};

export const getWorkspaceProjectWorkflows = async (
  workspaceId: string,
  projectId: string,
  params: WorkspaceProjectWorkflowsQueryParams = {},
) => {
  const {
    page = 1,
    limit = 6,
    view = "all",
    teamId = "all",
    pipelineId = "",
    startDate = "",
    sort = "updated",
    archived = false,
  } = params;

  return await axiosInstance.get<{
    message: string;
    workflows: ProjectWorkflow[];
    pagination: Pagination;
  }>(WORKSPACE_PROJECT_ENDPOINTS.workflows(workspaceId, projectId), {
    params: {
      page,
      limit,
      view,
      teamId,
      pipelineId,
      startDate,
      sort,
      archived,
    },
  });
};

export const createWorkspaceProjectWorkflow = async (data: {
  workspaceId: string;
  projectId: string;
  payload: CreateWorkspaceProjectWorkflowRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    workflow: ProjectWorkflow;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.workflows(data.workspaceId, data.projectId), data.payload);
};

export const updateWorkspaceProjectWorkflow = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  updates: UpdateWorkspaceProjectWorkflowRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    workflow: ProjectWorkflow;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.workflow(data.workspaceId, data.projectId, data.workflowId),
    data.updates,
  );
};

export const archiveWorkspaceProjectWorkflow = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.workflow(data.workspaceId, data.projectId, data.workflowId) + "/archive");
};

export const unarchiveWorkspaceProjectWorkflow = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.workflow(data.workspaceId, data.projectId, data.workflowId) + "/unarchive");
};

export const deleteWorkspaceProjectWorkflow = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.workflow(data.workspaceId, data.projectId, data.workflowId));
};

export const getWorkspaceProjectRisks = async (
  workspaceId: string,
  projectId: string,
  params: WorkspaceProjectRisksQueryParams = {},
) => {
  const {
    page = 1,
    limit = 20,
    kind = "all",
    severity = "all",
    state = "all",
    teamId = "all",
    pipelineId = "",
    search = "",
    sort = "updated",
  } = params;

  return await axiosInstance.get<{
    message: string;
    risks: WorkspaceProjectRiskRecord[];
    pagination: Pagination;
  }>(WORKSPACE_PROJECT_ENDPOINTS.risks(workspaceId, projectId), {
    params: {
      page,
      limit,
      kind,
      severity,
      state,
      teamId,
      pipelineId,
      search,
      sort,
    },
  });
};

export const getWorkspaceProjectRiskDetail = async (
  workspaceId: string,
  projectId: string,
  riskId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    risk: WorkspaceProjectRiskRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.risk(workspaceId, projectId, riskId));
};

export const createWorkspaceProjectRisk = async (data: {
  workspaceId: string;
  projectId: string;
  payload: CreateWorkspaceProjectRiskRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    risk: WorkspaceProjectRiskRecord;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.risks(data.workspaceId, data.projectId), data.payload);
};

export const updateWorkspaceProjectRisk = async (data: {
  workspaceId: string;
  projectId: string;
  riskId: string;
  updates: UpdateWorkspaceProjectRiskRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    risk: WorkspaceProjectRiskRecord;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.risk(data.workspaceId, data.projectId, data.riskId), data.updates);
};

export const resolveWorkspaceProjectRisk = async (data: {
  workspaceId: string;
  projectId: string;
  riskId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    risk: WorkspaceProjectRiskRecord;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.riskResolve(data.workspaceId, data.projectId, data.riskId));
};

export const closeWorkspaceProjectRisk = async (data: {
  workspaceId: string;
  projectId: string;
  riskId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    risk: WorkspaceProjectRiskRecord;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.riskClose(data.workspaceId, data.projectId, data.riskId));
};

export const deleteWorkspaceProjectRisk = async (data: {
  workspaceId: string;
  projectId: string;
  riskId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    project: WorkspaceProjectRecord;
    removedRiskId: string;
  }>(WORKSPACE_PROJECT_ENDPOINTS.risk(data.workspaceId, data.projectId, data.riskId));
};

export const getWorkspaceProjectRiskComments = async (
  workspaceId: string,
  projectId: string,
  riskId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    risk: WorkspaceProjectRiskRecord;
    comments: WorkspaceProjectRiskCommentRecord[];
  }>(WORKSPACE_PROJECT_ENDPOINTS.riskComments(workspaceId, projectId, riskId));
};

export const createWorkspaceProjectRiskComment = async (data: {
  workspaceId: string;
  projectId: string;
  riskId: string;
  payload: CreateWorkspaceProjectRiskCommentRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    comment: WorkspaceProjectRiskCommentRecord;
    risk: WorkspaceProjectRiskRecord;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.riskComments(
      data.workspaceId,
      data.projectId,
      data.riskId,
    ),
    data.payload,
  );
};

export const getWorkspaceProjectTasks = async (
  workspaceId: string,
  projectId: string,
  params?: WorkspaceProjectTasksQueryParams,
) => {
  return await axiosInstance.get<{
    message: string;
    tasks: WorkspaceProjectTaskRecord[];
  }>(WORKSPACE_PROJECT_ENDPOINTS.tasks(workspaceId, projectId), {
    params,
  });
};

export const getWorkspaceProjectEvents = async (
  workspaceId: string,
  projectId: string,
  params: WorkspaceProjectEventsQueryParams = {},
) => {
  const {
    page = 1,
    limit = 20,
    teamId = "all",
    pipelineId = "",
    search = "",
    eventType = "",
  } = params;

  return await axiosInstance.get<{
    message: string;
    events: WorkspaceProjectEventRecord[];
    pagination: Pagination;
  }>(WORKSPACE_PROJECT_ENDPOINTS.events(workspaceId, projectId), {
    params: {
      page,
      limit,
      teamId,
      pipelineId,
      search,
      eventType,
    },
  });
};

export const getWorkspaceProjectNotifications = async (
  workspaceId: string,
  projectId: string,
  params: WorkspaceProjectNotificationsQueryParams = {},
) => {
  const { page = 1, limit = 20, state = "all", type = "" } = params;

  return await axiosInstance.get<{
    message: string;
    notifications: WorkspaceProjectNotificationRecord[];
    pagination: Pagination;
  }>(WORKSPACE_PROJECT_ENDPOINTS.notifications(workspaceId, projectId), {
    params: {
      page,
      limit,
      state,
      type,
    },
  });
};

export const getWorkspaceProjectAgent = async (
  workspaceId: string,
  projectId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    agent: WorkspaceProjectAgentConfig;
    stats: WorkspaceProjectAgentStats;
  }>(WORKSPACE_PROJECT_ENDPOINTS.agent(workspaceId, projectId));
};

export const updateWorkspaceProjectAgent = async (data: {
  workspaceId: string;
  projectId: string;
  updates: UpdateWorkspaceProjectAgentRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    agent: WorkspaceProjectAgentConfig;
    stats: WorkspaceProjectAgentStats;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.agent(data.workspaceId, data.projectId),
    data.updates,
  );
};

export const runWorkspaceProjectAgent = async (data: {
  workspaceId: string;
  projectId: string;
  runType: WorkspaceProjectAgentRunType;
}) => {
  return await axiosInstance.post<{
    message: string;
    run: WorkspaceProjectAgentRunRecord;
    agent: WorkspaceProjectAgentConfig;
    stats: WorkspaceProjectAgentStats;
  }>(WORKSPACE_PROJECT_ENDPOINTS.agentRun(data.workspaceId, data.projectId), {
    runType: data.runType,
  });
};

export const getWorkspaceProjectAgentRuns = async (
  workspaceId: string,
  projectId: string,
  params: WorkspaceProjectAgentRunsQueryParams = {},
) => {
  const { page = 1, limit = 10, runType = "" } = params;

  return await axiosInstance.get<{
    message: string;
    runs: WorkspaceProjectAgentRunRecord[];
    pagination: Pagination;
  }>(WORKSPACE_PROJECT_ENDPOINTS.agentRuns(workspaceId, projectId), {
    params: {
      page,
      limit,
      runType,
    },
  });
};

export const markWorkspaceProjectNotificationRead = async (data: {
  workspaceId: string;
  projectId: string;
  notificationId: string;
}) => {
  return await axiosInstance.patch<{
    message: string;
    notification: WorkspaceProjectNotificationRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.notificationRead(
      data.workspaceId,
      data.projectId,
      data.notificationId,
    ),
  );
};

export const markAllWorkspaceProjectNotificationsRead = async (data: {
  workspaceId: string;
  projectId: string;
}) => {
  return await axiosInstance.patch<{
    message: string;
    updatedCount: number;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.notificationReadAll(
      data.workspaceId,
      data.projectId,
    ),
  );
};

export const createWorkspaceProjectTask = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  payload: CreateWorkspaceProjectTaskRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    task: WorkspaceProjectTaskRecord;
    project: WorkspaceProjectRecord;
  }>(WORKSPACE_PROJECT_ENDPOINTS.workflowTasks(data.workspaceId, data.projectId, data.workflowId), data.payload);
};

export const updateWorkspaceProjectTask = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  taskId: string;
  updates: UpdateWorkspaceProjectTaskRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    task: WorkspaceProjectTaskRecord;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.workflowTask(
      data.workspaceId,
      data.projectId,
      data.workflowId,
      data.taskId,
    ),
    data.updates,
  );
};

export const deleteWorkspaceProjectTask = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  taskId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.workflowTask(
      data.workspaceId,
      data.projectId,
      data.workflowId,
      data.taskId,
    ),
  );
};

export const createWorkspaceProjectSubtask = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  taskId: string;
  payload: CreateWorkspaceProjectSubtaskRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    subtask: WorkspaceProjectSubtaskRecord;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.workflowSubtasks(
      data.workspaceId,
      data.projectId,
      data.workflowId,
      data.taskId,
    ),
    data.payload,
  );
};

export const updateWorkspaceProjectSubtask = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  taskId: string;
  subtaskId: string;
  updates: UpdateWorkspaceProjectSubtaskRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    subtask: WorkspaceProjectSubtaskRecord;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.workflowSubtask(
      data.workspaceId,
      data.projectId,
      data.workflowId,
      data.taskId,
      data.subtaskId,
    ),
    data.updates,
  );
};

export const deleteWorkspaceProjectSubtask = async (data: {
  workspaceId: string;
  projectId: string;
  workflowId: string;
  taskId: string;
  subtaskId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    project: WorkspaceProjectRecord;
  }>(
    WORKSPACE_PROJECT_ENDPOINTS.workflowSubtask(
      data.workspaceId,
      data.projectId,
      data.workflowId,
      data.taskId,
      data.subtaskId,
    ),
  );
};
