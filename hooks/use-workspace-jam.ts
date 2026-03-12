import useError from "./use-error";
import {
  archiveWorkspaceJam,
  createWorkspaceJam,
  getWorkspaceJamDetail,
  getWorkspaceJams,
  getWorkspaceJamShareTargets,
  shareWorkspaceJam,
  unarchiveWorkspaceJam,
  updateWorkspaceJam,
  updateWorkspaceJamContent,
} from "@/lib/services/workspace-jam-service";
import {
  CreateWorkspaceJamRequestBody,
  ShareWorkspaceJamRequestBody,
  UpdateWorkspaceJamContentRequestBody,
  UpdateWorkspaceJamRequestBody,
  WorkspaceJamListQueryParams,
} from "@/types/jam";
import { useMutation, useQuery, UseMutationOptions } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceJam = () => {
  const { handleError } = useError();

  const useWorkspaceJams = (
    workspaceId: string,
    params: WorkspaceJamListQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-jams", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceJams(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceJamDetail = (
    workspaceId: string,
    jamId: string,
    options?: { enabled?: boolean; includeSnapshot?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-jam-detail",
        workspaceId,
        jamId,
        options?.includeSnapshot ?? true,
      ],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!jamId,
      queryFn: async () => {
        try {
          return await getWorkspaceJamDetail(
            workspaceId,
            jamId,
            options?.includeSnapshot ?? true,
          );
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceJamShareTargets = (
    workspaceId: string,
    params: { search?: string; limit?: number } = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-jam-share-targets", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceJamShareTargets(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceJam = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateWorkspaceJamRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceJam,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useUpdateWorkspaceJam = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      updates: UpdateWorkspaceJamRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceJam,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useUpdateWorkspaceJamContent = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      payload: UpdateWorkspaceJamContentRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceJamContent,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useShareWorkspaceJam = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      payload: ShareWorkspaceJamRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: shareWorkspaceJam,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useArchiveWorkspaceJam = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: archiveWorkspaceJam,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useUnarchiveWorkspaceJam = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: unarchiveWorkspaceJam,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  return {
    useWorkspaceJams,
    useWorkspaceJamDetail,
    useWorkspaceJamShareTargets,
    useCreateWorkspaceJam,
    useUpdateWorkspaceJam,
    useUpdateWorkspaceJamContent,
    useShareWorkspaceJam,
    useArchiveWorkspaceJam,
    useUnarchiveWorkspaceJam,
  };
};

export default useWorkspaceJam;
