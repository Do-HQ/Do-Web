import useError from "./use-error";
import {
  disconnectWorkspaceGithub,
  disconnectWorkspaceProjectGithubBinding,
  getWorkspaceGithubIntegration,
  getWorkspaceGithubRepositories,
  getWorkspaceProjectGithubBinding,
  startWorkspaceGithubOAuth,
  updateWorkspaceProjectGithubBinding,
} from "@/lib/services/workspace-github-service";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseMutationOptionsType<T> = UseMutationOptions<
  AxiosResponse,
  unknown,
  T,
  unknown
>;

const useWorkspaceGithub = () => {
  const { handleError } = useError();

  const useWorkspaceGithubIntegration = (
    workspaceId: string,
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-github-integration", workspaceId],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceGithubIntegration(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceGithubRepositories = (
    workspaceId: string,
    params: { search?: string; page?: number; perPage?: number } = {},
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-github-repositories", workspaceId, params],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceGithubRepositories(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceProjectGithubBinding = (
    workspaceId: string,
    projectId: string,
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-project-github-binding", workspaceId, projectId],
      enabled:
        Boolean(workspaceId) &&
        Boolean(projectId) &&
        (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceProjectGithubBinding(workspaceId, projectId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useStartWorkspaceGithubOAuth = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => startWorkspaceGithubOAuth(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDisconnectWorkspaceGithub = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => disconnectWorkspaceGithub(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceProjectGithubBinding = (
    options?: UseMutationOptionsType<{
      workspaceId: string;
      projectId: string;
      payload: {
        repositoryFullName: string;
        syncTasks?: boolean;
        syncRisks?: boolean;
      };
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceProjectGithubBinding,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDisconnectWorkspaceProjectGithubBinding = (
    options?: UseMutationOptionsType<{
      workspaceId: string;
      projectId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: disconnectWorkspaceProjectGithubBinding,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceGithubIntegration,
    useWorkspaceGithubRepositories,
    useWorkspaceProjectGithubBinding,
    useStartWorkspaceGithubOAuth,
    useDisconnectWorkspaceGithub,
    useUpdateWorkspaceProjectGithubBinding,
    useDisconnectWorkspaceProjectGithubBinding,
  };
};

export default useWorkspaceGithub;
