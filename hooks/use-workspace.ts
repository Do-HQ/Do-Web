import useError from "./use-error";
import {
  createWorkspace,
  getPublicWorkspaces,
  getWorkspaceById,
  PaginationBody,
  requestToJoinWorkspace,
  switchWorkspace,
} from "@/lib/services/workspace-service";
import {
  CreateWorkspaceRequestBody,
  JoinWorkspaceRequestBody,
} from "@/types/workspace";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspace = () => {
  // Hooks
  const { handleError } = useError();

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

  return {
    usePublicWorkspace,
    useWorkspaceById,
    useRequestToJoinWorkspace,
    useCreateWorkspace,
    useSwitchWorkspace,
  };
};

export default useWorkspace;
