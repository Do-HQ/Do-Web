import useError from "./use-error";
import {
  addWorkspaceTeamMembers,
  archiveWorkspaceTeam,
  createWorkspaceTeam,
  dissolveWorkspaceTeam,
  getWorkspaceTeamDetail,
  getWorkspaceTeamMembers,
  getWorkspaceTeamPolicy,
  getWorkspaceTeams,
  removeWorkspaceTeamMember,
  unarchiveWorkspaceTeam,
  updateWorkspaceTeam,
  updateWorkspaceTeamMember,
  updateWorkspaceTeamPolicy,
  WorkspaceTeamsPaginationBody,
} from "@/lib/services/workspace-team-service";
import { PaginationBody } from "@/lib/services/workspace-service";
import {
  AddWorkspaceTeamMembersRequestBody,
  CreateWorkspaceTeamRequestBody,
  UpdateWorkspaceTeamMemberRequestBody,
  UpdateWorkspaceTeamPolicyRequestBody,
  UpdateWorkspaceTeamRequestBody,
} from "@/types/team";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceTeam = () => {
  const { handleError } = useError();

  const useWorkspaceTeamPolicy = (workspaceId: string) => {
    return useQuery({
      queryKey: ["workspace-team-policy", workspaceId],
      enabled: !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceTeamPolicy(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useUpdateWorkspaceTeamPolicy = (
    options?: UseOptions<{
      workspaceId: string;
      updates: UpdateWorkspaceTeamPolicyRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceTeamPolicy,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useWorkspaceTeams = (
    workspaceId: string,
    params: WorkspaceTeamsPaginationBody,
  ) => {
    return useQuery({
      queryKey: ["workspace-teams", workspaceId, params],
      enabled: !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceTeams(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceTeamDetail = (
    workspaceId: string,
    teamId: string,
    params: PaginationBody,
  ) => {
    return useQuery({
      queryKey: ["workspace-team-detail", workspaceId, teamId, params],
      enabled: !!workspaceId && !!teamId,
      queryFn: async () => {
        try {
          return await getWorkspaceTeamDetail(workspaceId, teamId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceTeam = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateWorkspaceTeamRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceTeam,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceTeam = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
      updates: UpdateWorkspaceTeamRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceTeam,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useArchiveWorkspaceTeam = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: archiveWorkspaceTeam,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUnarchiveWorkspaceTeam = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: unarchiveWorkspaceTeam,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDissolveWorkspaceTeam = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: dissolveWorkspaceTeam,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useWorkspaceTeamMembers = (
    workspaceId: string,
    teamId: string,
    params: PaginationBody,
  ) => {
    return useQuery({
      queryKey: ["workspace-team-members", workspaceId, teamId, params],
      enabled: !!workspaceId && !!teamId,
      queryFn: async () => {
        try {
          return await getWorkspaceTeamMembers(workspaceId, teamId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useAddWorkspaceTeamMembers = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
      payload: AddWorkspaceTeamMembersRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: addWorkspaceTeamMembers,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceTeamMember = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
      memberId: string;
      payload: UpdateWorkspaceTeamMemberRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceTeamMember,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useRemoveWorkspaceTeamMember = (
    options?: UseOptions<{
      workspaceId: string;
      teamId: string;
      memberId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: removeWorkspaceTeamMember,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceTeamPolicy,
    useUpdateWorkspaceTeamPolicy,
    useWorkspaceTeams,
    useWorkspaceTeamDetail,
    useCreateWorkspaceTeam,
    useUpdateWorkspaceTeam,
    useArchiveWorkspaceTeam,
    useUnarchiveWorkspaceTeam,
    useDissolveWorkspaceTeam,
    useWorkspaceTeamMembers,
    useAddWorkspaceTeamMembers,
    useUpdateWorkspaceTeamMember,
    useRemoveWorkspaceTeamMember,
  };
};

export default useWorkspaceTeam;
