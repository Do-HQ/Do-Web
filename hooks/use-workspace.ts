import useAuthStore from "@/stores/auth";
import useError from "./use-error";
import {
  acceptWorkspaceInvite,
  approveWorkspaceJoinRequest,
  createWorkspace,
  createWorkspaceInvite,
  declineWorkspaceJoinRequest,
  completeWorkspaceOnboarding,
  getPublicWorkspaces,
  getUserWorkspaces,
  getWorkspaceById,
  getWorkspaceInvites,
  getWorkspaceJoinRequests,
  getWorkspaceOnboarding,
  getWorkspacePeople,
  removeWorkspaceMember,
  getWorkspaceRoles,
  PaginationBody,
  requestToJoinWorkspace,
  revokeWorkspaceInvite,
  startWorkspaceOnboarding,
  switchWorkspace,
  updateWorkspace,
  updateWorkspaceOnboardingItem,
} from "@/lib/services/workspace-service";
import {
  AcceptWorkspaceInviteRequestBody,
  CreateWorkspaceInviteRequestBody,
  CreateWorkspaceRequestBody,
  JoinWorkspaceRequestBody,
  ModerateWorkspaceJoinRequestBody,
  WorkspaceSettingsUpdateBody,
} from "@/types/workspace";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";
import useWorkspaceStore from "@/stores/workspace";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspace = () => {
  // Hooks
  const { handleError } = useError();

  // Stores
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();

  const usePublicWorkspace = (params: PaginationBody) => {
    const { page, search, limit } = params;
    return useQuery({
      queryKey: ["get-public-workspaces", search, page, limit],
      queryFn: async () => {
        try {
          return await getPublicWorkspaces({ page, search, limit });
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceById = (id: string) => {
    return useQuery({
      queryKey: ["get-workspace-detail", id],
      enabled: !!id,
      queryFn: async () => {
        try {
          return await getWorkspaceById(id);
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceOnboarding = (
    workspaceId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-onboarding", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceOnboarding(workspaceId);
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useRequestToJoinWorkspace = (
    options?: UseOptions<JoinWorkspaceRequestBody>,
  ) => {
    return useMutation({
      mutationFn: requestToJoinWorkspace,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspace = (
    options?: UseOptions<CreateWorkspaceRequestBody>,
  ) => {
    return useMutation({
      mutationFn: createWorkspace,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useSwitchWorkspace = (
    options?: UseOptions<JoinWorkspaceRequestBody>,
  ) => {
    return useMutation({
      mutationFn: switchWorkspace,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUsersWorkSpace = (params: PaginationBody) => {
    const { page, search, limit } = params;
    return useQuery({
      queryKey: ["get-user-workspaces", params],
      queryFn: async () => {
        try {
          const data = await getUserWorkspaces({ page, search, limit });
          return data;
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useActiveWorkspace = () => {
    const activeWorkspace = user?.workspaces?.find(
      (w) => w?.workspaceId?._id === workspaceId,
    );
    return activeWorkspace;
  };

  const useUpdateWorkspace = (
    options?: UseOptions<{
      workspaceId: string;
      data: WorkspaceSettingsUpdateBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspace,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useStartWorkspaceOnboarding = (
    options?: UseOptions<string>,
  ) => {
    return useMutation({
      mutationFn: startWorkspaceOnboarding,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceOnboardingItem = (
    options?: UseOptions<{
      workspaceId: string;
      itemId: string;
      completed: boolean;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceOnboardingItem,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCompleteWorkspaceOnboarding = (
    options?: UseOptions<string>,
  ) => {
    return useMutation({
      mutationFn: completeWorkspaceOnboarding,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useWorkspacePeople = (workspaceId: string, params: PaginationBody) => {
    return useQuery({
      queryKey: ["get-workspaces-people", workspaceId, params],
      enabled: !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspacePeople(workspaceId!, params);
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useRemoveWorkspaceMember = (
    options?: UseOptions<{
      workspaceId: string;
      memberId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: removeWorkspaceMember,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useWorkspaceInvites = (workspaceId: string, params: PaginationBody) => {
    return useQuery({
      queryKey: ["get-workspaces-invites", workspaceId, params],
      enabled: !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceInvites(workspaceId, params!);
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceRoles = (workspaceId: string) => {
    return useQuery({
      queryKey: ["get-workspace-roles", workspaceId],
      queryFn: async () => {
        try {
          return await getWorkspaceRoles(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceInvite = (
    options?: UseOptions<{
      workspaceId: string;
      data: CreateWorkspaceInviteRequestBody[];
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceInvite,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useAcceptWorkspaceInvite = (
    options?: UseOptions<AcceptWorkspaceInviteRequestBody>,
  ) => {
    return useMutation({
      mutationFn: acceptWorkspaceInvite,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useRevokeWorkspaceInvite = (
    options?: UseOptions<{
      workspaceId: string;
      token: string;
      reason?: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: revokeWorkspaceInvite,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useWorkspaceJoinRequests = (
    workspaceId: string,
    params: PaginationBody,
  ) => {
    return useQuery({
      queryKey: ["get-workspaces-join-requests", workspaceId, params],
      enabled: !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceJoinRequests(workspaceId, params!);
        } catch (error: unknown) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useApproveWorkspaceJoinRequest = (
    options?: UseOptions<ModerateWorkspaceJoinRequestBody>,
  ) => {
    return useMutation({
      mutationFn: approveWorkspaceJoinRequest,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeclineWorkspaceJoinRequest = (
    options?: UseOptions<ModerateWorkspaceJoinRequestBody>,
  ) => {
    return useMutation({
      mutationFn: declineWorkspaceJoinRequest,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    usePublicWorkspace,
    useWorkspaceById,
    useWorkspaceOnboarding,
    useRequestToJoinWorkspace,
    useCreateWorkspace,
    useSwitchWorkspace,
    useUsersWorkSpace,
    useUpdateWorkspace,
    useStartWorkspaceOnboarding,
    useUpdateWorkspaceOnboardingItem,
    useCompleteWorkspaceOnboarding,
    useActiveWorkspace,
    useWorkspacePeople,
    useRemoveWorkspaceMember,
    useWorkspaceRoles,
    useWorkspaceInvites,
    useCreateWorkspaceInvite,
    useAcceptWorkspaceInvite,
    useRevokeWorkspaceInvite,
    useWorkspaceJoinRequests,
    useApproveWorkspaceJoinRequest,
    useDeclineWorkspaceJoinRequest,
  };
};

export default useWorkspace;
