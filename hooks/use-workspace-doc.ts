import useError from "./use-error";
import {
  archiveWorkspaceDoc,
  createWorkspaceDoc,
  deleteWorkspaceDoc,
  getSharedWorkspaceDoc,
  getWorkspaceDocDetail,
  getWorkspaceDocs,
  unarchiveWorkspaceDoc,
  updateWorkspaceDoc,
} from "@/lib/services/workspace-doc-service";
import {
  CreateWorkspaceDocRequestBody,
  UpdateWorkspaceDocRequestBody,
  WorkspaceDocsQueryParams,
} from "@/types/doc";
import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceDoc = () => {
  const { handleError } = useError();

  const useWorkspaceDocs = (
    workspaceId: string,
    params: WorkspaceDocsQueryParams,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-docs", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceDocs(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceDocDetail = (
    workspaceId: string,
    docId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-doc-detail", workspaceId, docId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!docId,
      queryFn: async () => {
        try {
          return await getWorkspaceDocDetail(workspaceId, docId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useSharedWorkspaceDoc = (
    shareToken: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-doc-shared", shareToken],
      enabled: (options?.enabled ?? true) && !!shareToken,
      queryFn: async () => {
        try {
          return await getSharedWorkspaceDoc(shareToken);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
      retry: false,
    });
  };

  const useCreateWorkspaceDoc = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateWorkspaceDocRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceDoc,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceDoc = (
    options?: UseOptions<{
      workspaceId: string;
      docId: string;
      updates: UpdateWorkspaceDocRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceDoc,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useArchiveWorkspaceDoc = (
    options?: UseOptions<{ workspaceId: string; docId: string }>,
  ) => {
    return useMutation({
      mutationFn: archiveWorkspaceDoc,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUnarchiveWorkspaceDoc = (
    options?: UseOptions<{ workspaceId: string; docId: string }>,
  ) => {
    return useMutation({
      mutationFn: unarchiveWorkspaceDoc,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceDoc = (
    options?: UseOptions<{ workspaceId: string; docId: string }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceDoc,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceDocs,
    useWorkspaceDocDetail,
    useSharedWorkspaceDoc,
    useCreateWorkspaceDoc,
    useUpdateWorkspaceDoc,
    useArchiveWorkspaceDoc,
    useUnarchiveWorkspaceDoc,
    useDeleteWorkspaceDoc,
  };
};

export default useWorkspaceDoc;
