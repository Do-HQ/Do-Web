import useError from "./use-error";
import {
  archiveWorkspaceProjectWorkflow,
  closeWorkspaceProjectRisk,
  createWorkspaceProjectRisk,
  createWorkspaceProjectRiskComment,
  createWorkspaceProject,
  inviteWorkspaceProjectCollaborators,
  createWorkspaceProjectSubtask,
  createWorkspaceProjectTask,
  createWorkspaceProjectWorkflow,
  deleteWorkspaceProjectRisk,
  deleteWorkspaceProjectTask,
  deleteWorkspaceProjectSubtask,
  deleteWorkspaceProjectWorkflow,
  getWorkspaceProjectAgent,
  getWorkspaceProjectAgentRuns,
  getWorkspaceProjectRiskComments,
  getWorkspaceProjectRiskDetail,
  getWorkspaceProjectRisks,
  getWorkspaceProjectEvents,
  getWorkspaceProjectNotifications,
  getWorkspaceProjectDetail,
  getWorkspaceProjectTasks,
  getWorkspaceProjectWorkflows,
  getWorkspaceProjects,
  resolveWorkspaceProjectRisk,
  unarchiveWorkspaceProjectWorkflow,
  updateWorkspaceProjectRisk,
  updateWorkspaceProject,
  updateWorkspaceProjectSubtask,
  updateWorkspaceProjectTask,
  updateWorkspaceProjectWorkflow,
  markAllWorkspaceProjectNotificationsRead,
  markWorkspaceProjectNotificationRead,
  runWorkspaceProjectAgent,
  updateWorkspaceProjectAgent,
  WorkspaceProjectsPaginationBody,
  WorkspaceProjectAgentRunsQueryParams,
  WorkspaceProjectRisksQueryParams,
  WorkspaceProjectEventsQueryParams,
  WorkspaceProjectNotificationsQueryParams,
  WorkspaceProjectTasksQueryParams,
  WorkspaceProjectWorkflowsQueryParams,
  UpdateWorkspaceProjectAgentRequestBody,
} from "@/lib/services/workspace-project-service";
import {
  createWorkspaceProjectSecret,
  deleteWorkspaceProjectSecret,
  getWorkspaceProjectSecrets,
  getWorkspaceProjectSecretsPolicy,
  revealWorkspaceProjectSecret,
  SecretsQueryParams,
  updateWorkspaceProjectSecret,
  updateWorkspaceProjectSecretsPolicy,
} from "@/lib/services/workspace-project-secret-service";
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
  UpdateWorkspaceProjectSecretPolicyRequestBody,
  UpdateWorkspaceProjectSecretRequestBody,
  CreateWorkspaceProjectSecretRequestBody,
} from "@/types/project";
import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceProject = () => {
  const { handleError } = useError();

  const useWorkspaceProjects = (
    workspaceId: string,
    params: WorkspaceProjectsPaginationBody,
  ) => {
    return useQuery({
      queryKey: ["workspace-projects", workspaceId, params],
      enabled: !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjects(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectDetail = (
    workspaceId: string,
    projectId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-detail", workspaceId, projectId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectDetail(workspaceId, projectId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectSecrets = (
    workspaceId: string,
    projectId: string,
    params: SecretsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-secrets", workspaceId, projectId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectSecrets(workspaceId, projectId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectSecretsPolicy = (
    workspaceId: string,
    projectId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-secrets-policy", workspaceId, projectId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectSecretsPolicy(workspaceId, projectId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectWorkflows = (
    workspaceId: string,
    projectId: string,
    params: WorkspaceProjectWorkflowsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-workflows", workspaceId, projectId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectWorkflows(workspaceId, projectId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectTasks = (
    workspaceId: string,
    projectId: string,
    params?: WorkspaceProjectTasksQueryParams,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-tasks", workspaceId, projectId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectTasks(workspaceId, projectId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectEvents = (
    workspaceId: string,
    projectId: string,
    params: WorkspaceProjectEventsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-events", workspaceId, projectId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectEvents(workspaceId, projectId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectAgent = (
    workspaceId: string,
    projectId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-agent", workspaceId, projectId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectAgent(workspaceId, projectId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectAgentRuns = (
    workspaceId: string,
    projectId: string,
    params: WorkspaceProjectAgentRunsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-agent-runs", workspaceId, projectId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectAgentRuns(workspaceId, projectId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectNotifications = (
    workspaceId: string,
    projectId: string,
    params: WorkspaceProjectNotificationsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-project-notifications",
        workspaceId,
        projectId,
        params,
      ],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectNotifications(
            workspaceId,
            projectId,
            params,
          );
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectRisks = (
    workspaceId: string,
    projectId: string,
    params: WorkspaceProjectRisksQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-risks", workspaceId, projectId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectRisks(workspaceId, projectId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectRiskDetail = (
    workspaceId: string,
    projectId: string,
    riskId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-risk-detail", workspaceId, projectId, riskId],
      enabled:
        (options?.enabled ?? true) &&
        !!workspaceId &&
        !!projectId &&
        !!riskId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectRiskDetail(workspaceId, projectId, riskId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectRiskComments = (
    workspaceId: string,
    projectId: string,
    riskId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-project-risk-comments", workspaceId, projectId, riskId],
      enabled:
        (options?.enabled ?? true) &&
        !!workspaceId &&
        !!projectId &&
        !!riskId,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectRiskComments(
            workspaceId,
            projectId,
            riskId,
          );
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceProject = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateWorkspaceProjectRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProject,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProject = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      updates: UpdateWorkspaceProjectRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProject,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useInviteWorkspaceProjectCollaborators = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      payload: InviteWorkspaceProjectCollaboratorsRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: inviteWorkspaceProjectCollaborators,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceProjectWorkflow = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      payload: CreateWorkspaceProjectWorkflowRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProjectWorkflow,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectWorkflow = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      updates: UpdateWorkspaceProjectWorkflowRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectWorkflow,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useArchiveWorkspaceProjectWorkflow = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: archiveWorkspaceProjectWorkflow,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceProjectWorkflow = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceProjectWorkflow,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUnarchiveWorkspaceProjectWorkflow = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: unarchiveWorkspaceProjectWorkflow,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceProjectRisk = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      payload: CreateWorkspaceProjectRiskRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProjectRisk,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectRisk = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      riskId: string;
      updates: UpdateWorkspaceProjectRiskRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectRisk,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useResolveWorkspaceProjectRisk = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      riskId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: resolveWorkspaceProjectRisk,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCloseWorkspaceProjectRisk = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      riskId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: closeWorkspaceProjectRisk,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceProjectRisk = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      riskId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceProjectRisk,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceProjectRiskComment = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      riskId: string;
      payload: CreateWorkspaceProjectRiskCommentRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProjectRiskComment,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useMarkWorkspaceProjectNotificationRead = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      notificationId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: markWorkspaceProjectNotificationRead,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useMarkAllWorkspaceProjectNotificationsRead = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: markAllWorkspaceProjectNotificationsRead,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectAgent = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      updates: UpdateWorkspaceProjectAgentRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectAgent,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useRunWorkspaceProjectAgent = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      runType: "standup" | "overdue" | "digest" | "deadline" | "meeting";
    }>,
  ) => {
    return useMutation({
      mutationFn: runWorkspaceProjectAgent,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceProjectSecret = (
    options?: UseMutationOptions<
      Awaited<ReturnType<typeof createWorkspaceProjectSecret>>,
      unknown,
      {
        workspaceId: string;
        projectId: string;
        payload: CreateWorkspaceProjectSecretRequestBody;
      },
      unknown
    >,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProjectSecret,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectSecret = (
    options?: UseMutationOptions<
      Awaited<ReturnType<typeof updateWorkspaceProjectSecret>>,
      unknown,
      {
        workspaceId: string;
        projectId: string;
        secretId: string;
        updates: UpdateWorkspaceProjectSecretRequestBody;
      },
      unknown
    >,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectSecret,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceProjectSecret = (
    options?: UseMutationOptions<
      Awaited<ReturnType<typeof deleteWorkspaceProjectSecret>>,
      unknown,
      {
        workspaceId: string;
        projectId: string;
        secretId: string;
      },
      unknown
    >,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceProjectSecret,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useRevealWorkspaceProjectSecret = (
    options?: UseMutationOptions<
      Awaited<ReturnType<typeof revealWorkspaceProjectSecret>>,
      unknown,
      {
        workspaceId: string;
        projectId: string;
        secretId: string;
      },
      unknown
    >,
  ) => {
    return useMutation({
      mutationFn: revealWorkspaceProjectSecret,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectSecretsPolicy = (
    options?: UseMutationOptions<
      Awaited<ReturnType<typeof updateWorkspaceProjectSecretsPolicy>>,
      unknown,
      {
        workspaceId: string;
        projectId: string;
        updates: UpdateWorkspaceProjectSecretPolicyRequestBody;
      },
      unknown
    >,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectSecretsPolicy,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceProjectTask = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      payload: CreateWorkspaceProjectTaskRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProjectTask,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectTask = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      taskId: string;
      updates: UpdateWorkspaceProjectTaskRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectTask,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceProjectTask = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      taskId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceProjectTask,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceProjectSubtask = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      taskId: string;
      payload: CreateWorkspaceProjectSubtaskRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceProjectSubtask,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectSubtask = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      taskId: string;
      subtaskId: string;
      updates: UpdateWorkspaceProjectSubtaskRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectSubtask,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceProjectSubtask = (
    options?: UseOptions<{
      workspaceId: string;
      projectId: string;
      workflowId: string;
      taskId: string;
      subtaskId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceProjectSubtask,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceProjects,
    useWorkspaceProjectDetail,
    useWorkspaceProjectSecrets,
    useWorkspaceProjectSecretsPolicy,
    useWorkspaceProjectWorkflows,
    useWorkspaceProjectTasks,
    useWorkspaceProjectEvents,
    useWorkspaceProjectAgent,
    useWorkspaceProjectAgentRuns,
    useWorkspaceProjectNotifications,
    useWorkspaceProjectRisks,
    useWorkspaceProjectRiskDetail,
    useWorkspaceProjectRiskComments,
    useCreateWorkspaceProject,
    useUpdateWorkspaceProject,
    useInviteWorkspaceProjectCollaborators,
    useCreateWorkspaceProjectWorkflow,
    useUpdateWorkspaceProjectWorkflow,
    useArchiveWorkspaceProjectWorkflow,
    useUnarchiveWorkspaceProjectWorkflow,
    useDeleteWorkspaceProjectWorkflow,
    useCreateWorkspaceProjectRisk,
    useUpdateWorkspaceProjectRisk,
    useResolveWorkspaceProjectRisk,
    useCloseWorkspaceProjectRisk,
    useDeleteWorkspaceProjectRisk,
    useCreateWorkspaceProjectRiskComment,
    useMarkWorkspaceProjectNotificationRead,
    useMarkAllWorkspaceProjectNotificationsRead,
    useUpdateWorkspaceProjectAgent,
    useRunWorkspaceProjectAgent,
    useCreateWorkspaceProjectSecret,
    useUpdateWorkspaceProjectSecret,
    useDeleteWorkspaceProjectSecret,
    useRevealWorkspaceProjectSecret,
    useUpdateWorkspaceProjectSecretsPolicy,
    useCreateWorkspaceProjectTask,
    useUpdateWorkspaceProjectTask,
    useDeleteWorkspaceProjectTask,
    useCreateWorkspaceProjectSubtask,
    useUpdateWorkspaceProjectSubtask,
    useDeleteWorkspaceProjectSubtask,
  };
};

export default useWorkspaceProject;
