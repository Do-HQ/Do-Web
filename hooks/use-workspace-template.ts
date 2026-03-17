import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

import useError from "./use-error";
import {
  applyWorkspaceTemplate,
  createWorkspaceTemplate,
  deleteWorkspaceTemplate,
  getWorkspaceTemplateDetail,
  getWorkspaceTemplates,
  updateWorkspaceTemplate,
} from "@/lib/services/workspace-template-service";
import {
  ApplyWorkspaceTemplateRequestBody,
  CreateWorkspaceTemplateRequestBody,
  UpdateWorkspaceTemplateRequestBody,
  WorkspaceTemplatesQueryParams,
} from "@/types/template";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceTemplate = () => {
  const { handleError } = useError();

  const useWorkspaceTemplates = (
    workspaceId: string,
    params: WorkspaceTemplatesQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-templates", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceTemplates(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceTemplateDetail = (
    workspaceId: string,
    templateId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-template-detail", workspaceId, templateId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!templateId,
      queryFn: async () => {
        try {
          return await getWorkspaceTemplateDetail(workspaceId, templateId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceTemplate = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateWorkspaceTemplateRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceTemplate,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useUpdateWorkspaceTemplate = (
    options?: UseOptions<{
      workspaceId: string;
      templateId: string;
      updates: UpdateWorkspaceTemplateRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceTemplate,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useDeleteWorkspaceTemplate = (
    options?: UseOptions<{
      workspaceId: string;
      templateId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceTemplate,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useApplyWorkspaceTemplate = (
    options?: UseOptions<{
      workspaceId: string;
      templateId: string;
      payload: ApplyWorkspaceTemplateRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: applyWorkspaceTemplate,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  return {
    useWorkspaceTemplates,
    useWorkspaceTemplateDetail,
    useCreateWorkspaceTemplate,
    useUpdateWorkspaceTemplate,
    useDeleteWorkspaceTemplate,
    useApplyWorkspaceTemplate,
  };
};

export default useWorkspaceTemplate;
