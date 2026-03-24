import useError from "./use-error";
import {
  approveWorkspaceApprovalRequest,
  ApprovalRequestsQueryParams,
  CapacityOverviewQueryParams,
  checkInWorkspaceOkrKeyResult,
  createWorkspaceOkrCycle,
  createWorkspaceOkrObjective,
  createWorkspaceTaskDependency,
  deleteWorkspaceTaskDependency,
  DependenciesQueryParams,
  getWorkspaceApprovalPolicy,
  getWorkspaceApprovalRequests,
  getWorkspaceCapacityOverview,
  getWorkspaceCriticalPath,
  getWorkspaceDependencyGraph,
  getWorkspaceOkrCycles,
  getWorkspacePortfolioHealth,
  getWorkspacePortfolioSummary,
  getWorkspacePortfolioVelocity,
  getWorkspaceTaskDependencies,
  OkrCyclesQueryParams,
  PortfolioHealthQueryParams,
  PortfolioSummaryQueryParams,
  PortfolioVelocityQueryParams,
  rejectWorkspaceApprovalRequest,
  simulateWorkspaceDependencyImpact,
  updateWorkspaceApprovalPolicy,
  updateWorkspaceOkrCycle,
  updateWorkspaceOkrObjective,
  updateWorkspacePlanningConfig,
  upsertWorkspaceMemberCapacity,
} from "@/lib/services/workspace-portfolio-service";
import {
  ApprovalPolicy,
  CreateOkrCyclePayload,
  CreateOkrObjectivePayload,
  CreateTaskDependencyPayload,
  OkrCheckInPayload,
  SimulateDependencyPayload,
  UpdateOkrCyclePayload,
  UpdateOkrObjectivePayload,
  UpdatePlanningPayload,
  UpsertMemberCapacityPayload,
} from "@/types/portfolio";
import { useMutation, useQuery, UseMutationOptions } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspacePortfolio = () => {
  const { handleError } = useError();

  const useWorkspacePortfolioSummary = (
    workspaceId: string,
    params: PortfolioSummaryQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-summary", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspacePortfolioSummary(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspacePortfolioHealth = (
    workspaceId: string,
    params: PortfolioHealthQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-health", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspacePortfolioHealth(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspacePortfolioVelocity = (
    workspaceId: string,
    params: PortfolioVelocityQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-velocity", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspacePortfolioVelocity(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceCapacityOverview = (
    workspaceId: string,
    params: CapacityOverviewQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-capacity", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceCapacityOverview(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceOkrCycles = (
    workspaceId: string,
    params: OkrCyclesQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-okr-cycles", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceOkrCycles(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceTaskDependencies = (
    workspaceId: string,
    params: DependenciesQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-dependencies", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceTaskDependencies(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceDependencyGraph = (
    workspaceId: string,
    params: Required<DependenciesQueryParams>,
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-dependency-graph", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!params.projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceDependencyGraph(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceCriticalPath = (
    workspaceId: string,
    params: Required<DependenciesQueryParams>,
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-critical-path", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!params.projectId,
      queryFn: async () => {
        try {
          return await getWorkspaceCriticalPath(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceApprovalPolicy = (
    workspaceId: string,
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-approval-policy", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceApprovalPolicy(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useWorkspaceApprovalRequests = (
    workspaceId: string,
    params: ApprovalRequestsQueryParams = {},
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-portfolio-approval-requests", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceApprovalRequests(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useCreateWorkspaceOkrCycle = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateOkrCyclePayload;
    }>,
  ) =>
    useMutation({
      mutationFn: createWorkspaceOkrCycle,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useUpdateWorkspaceOkrCycle = (
    options?: UseOptions<{
      workspaceId: string;
      cycleId: string;
      updates: UpdateOkrCyclePayload;
    }>,
  ) =>
    useMutation({
      mutationFn: updateWorkspaceOkrCycle,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useCreateWorkspaceOkrObjective = (
    options?: UseOptions<{
      workspaceId: string;
      cycleId: string;
      payload: CreateOkrObjectivePayload;
    }>,
  ) =>
    useMutation({
      mutationFn: createWorkspaceOkrObjective,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useUpdateWorkspaceOkrObjective = (
    options?: UseOptions<{
      workspaceId: string;
      cycleId: string;
      objectiveId: string;
      updates: UpdateOkrObjectivePayload;
    }>,
  ) =>
    useMutation({
      mutationFn: updateWorkspaceOkrObjective,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useCheckInWorkspaceOkrKeyResult = (
    options?: UseOptions<{
      workspaceId: string;
      cycleId: string;
      objectiveId: string;
      keyResultId: string;
      payload: OkrCheckInPayload;
    }>,
  ) =>
    useMutation({
      mutationFn: checkInWorkspaceOkrKeyResult,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useCreateWorkspaceTaskDependency = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateTaskDependencyPayload;
    }>,
  ) =>
    useMutation({
      mutationFn: createWorkspaceTaskDependency,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useDeleteWorkspaceTaskDependency = (
    options?: UseOptions<{
      workspaceId: string;
      dependencyId: string;
    }>,
  ) =>
    useMutation({
      mutationFn: deleteWorkspaceTaskDependency,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useSimulateWorkspaceDependencyImpact = (
    options?: UseOptions<{
      workspaceId: string;
      payload: SimulateDependencyPayload;
    }>,
  ) =>
    useMutation({
      mutationFn: simulateWorkspaceDependencyImpact,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useUpdateWorkspacePlanningConfig = (
    options?: UseOptions<{
      workspaceId: string;
      updates: UpdatePlanningPayload;
    }>,
  ) =>
    useMutation({
      mutationFn: updateWorkspacePlanningConfig,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useUpsertWorkspaceMemberCapacity = (
    options?: UseOptions<{
      workspaceId: string;
      memberUserId: string;
      payload: UpsertMemberCapacityPayload;
    }>,
  ) =>
    useMutation({
      mutationFn: upsertWorkspaceMemberCapacity,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useUpdateWorkspaceApprovalPolicy = (
    options?: UseOptions<{
      workspaceId: string;
      updates: Partial<ApprovalPolicy>;
    }>,
  ) =>
    useMutation({
      mutationFn: updateWorkspaceApprovalPolicy,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useApproveWorkspaceApprovalRequest = (
    options?: UseOptions<{
      workspaceId: string;
      requestId: string;
      note?: string;
    }>,
  ) =>
    useMutation({
      mutationFn: approveWorkspaceApprovalRequest,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  const useRejectWorkspaceApprovalRequest = (
    options?: UseOptions<{
      workspaceId: string;
      requestId: string;
      note?: string;
    }>,
  ) =>
    useMutation({
      mutationFn: rejectWorkspaceApprovalRequest,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });

  return {
    useWorkspacePortfolioSummary,
    useWorkspacePortfolioHealth,
    useWorkspacePortfolioVelocity,
    useWorkspaceCapacityOverview,
    useWorkspaceOkrCycles,
    useWorkspaceTaskDependencies,
    useWorkspaceDependencyGraph,
    useWorkspaceCriticalPath,
    useWorkspaceApprovalPolicy,
    useWorkspaceApprovalRequests,
    useCreateWorkspaceOkrCycle,
    useUpdateWorkspaceOkrCycle,
    useCreateWorkspaceOkrObjective,
    useUpdateWorkspaceOkrObjective,
    useCheckInWorkspaceOkrKeyResult,
    useCreateWorkspaceTaskDependency,
    useDeleteWorkspaceTaskDependency,
    useSimulateWorkspaceDependencyImpact,
    useUpdateWorkspacePlanningConfig,
    useUpsertWorkspaceMemberCapacity,
    useUpdateWorkspaceApprovalPolicy,
    useApproveWorkspaceApprovalRequest,
    useRejectWorkspaceApprovalRequest,
  };
};

export default useWorkspacePortfolio;
