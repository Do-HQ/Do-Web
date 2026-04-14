import useError from "./use-error";
import {
  addWorkspaceJamCommentThreadMessage,
  archiveWorkspaceJam,
  createWorkspaceJamCommentThread,
  createWorkspaceJamComment,
  createWorkspaceJam,
  deleteWorkspaceJamCommentThreadMessage,
  getWorkspaceJamCommentMentionSuggestions,
  getWorkspaceJamCommentThread,
  getWorkspaceJamCommentThreads,
  getWorkspaceJamDetail,
  getWorkspaceJams,
  getWorkspaceJamShareTargets,
  reopenWorkspaceJamCommentThread,
  resolveWorkspaceJamCommentThread,
  requestWorkspaceJamEditAccess,
  reviewWorkspaceJamEditAccessRequest,
  shareWorkspaceJam,
  unarchiveWorkspaceJam,
  updateWorkspaceJamCommentThreadMessage,
  updateWorkspaceJam,
  updateWorkspaceJamContent,
} from "@/lib/services/workspace-jam-service";
import {
  CreateWorkspaceJamCommentRequestBody,
  CreateWorkspaceJamCommentThreadRequestBody,
  CreateWorkspaceJamRequestBody,
  RequestWorkspaceJamEditAccessRequestBody,
  ReviewWorkspaceJamEditAccessRequestBody,
  ShareWorkspaceJamRequestBody,
  UpdateWorkspaceJamCommentThreadMessageRequestBody,
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

  const useWorkspaceJamCommentThreads = (
    workspaceId: string,
    jamId: string,
    params: {
      status?: "open" | "resolved" | "all";
      search?: string;
      page?: number;
      limit?: number;
    } = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-jam-comment-threads", workspaceId, jamId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!jamId,
      queryFn: async () => {
        try {
          return await getWorkspaceJamCommentThreads({
            workspaceId,
            jamId,
            ...params,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceJamCommentThread = (
    workspaceId: string,
    jamId: string,
    threadId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-jam-comment-thread", workspaceId, jamId, threadId],
      enabled:
        (options?.enabled ?? true) && !!workspaceId && !!jamId && !!threadId,
      queryFn: async () => {
        try {
          return await getWorkspaceJamCommentThread({
            workspaceId,
            jamId,
            threadId,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceJamCommentMentionSuggestions = (
    workspaceId: string,
    jamId: string,
    params: {
      query?: string;
      limit?: number;
    } = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-jam-comment-mentions", workspaceId, jamId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!jamId,
      queryFn: async () => {
        try {
          return await getWorkspaceJamCommentMentionSuggestions({
            workspaceId,
            jamId,
            ...params,
          });
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

  const useCreateWorkspaceJamComment = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      payload: CreateWorkspaceJamCommentRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceJamComment,
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

  const useCreateWorkspaceJamCommentThread = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      payload: CreateWorkspaceJamCommentThreadRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceJamCommentThread,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useAddWorkspaceJamCommentThreadMessage = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      threadId: string;
      payload: CreateWorkspaceJamCommentThreadRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: addWorkspaceJamCommentThreadMessage,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useUpdateWorkspaceJamCommentThreadMessage = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      threadId: string;
      messageId: string;
      payload: UpdateWorkspaceJamCommentThreadMessageRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceJamCommentThreadMessage,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useDeleteWorkspaceJamCommentThreadMessage = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      threadId: string;
      messageId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceJamCommentThreadMessage,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useResolveWorkspaceJamCommentThread = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      threadId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: resolveWorkspaceJamCommentThread,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useReopenWorkspaceJamCommentThread = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      threadId: string;
    }>,
  ) => {
    return useMutation({
      mutationFn: reopenWorkspaceJamCommentThread,
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

  const useRequestWorkspaceJamEditAccess = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      payload: RequestWorkspaceJamEditAccessRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: requestWorkspaceJamEditAccess,
      ...options,
      onError: (error, variables, context, mutation) => {
        handleError(error as AxiosError);
        options?.onError?.(error, variables, context, mutation);
      },
    });
  };

  const useReviewWorkspaceJamEditAccessRequest = (
    options?: UseOptions<{
      workspaceId: string;
      jamId: string;
      requestId: string;
      payload: ReviewWorkspaceJamEditAccessRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: reviewWorkspaceJamEditAccessRequest,
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
    useWorkspaceJamCommentThreads,
    useWorkspaceJamCommentThread,
    useWorkspaceJamCommentMentionSuggestions,
    useCreateWorkspaceJam,
    useUpdateWorkspaceJam,
    useUpdateWorkspaceJamContent,
    useCreateWorkspaceJamComment,
    useCreateWorkspaceJamCommentThread,
    useAddWorkspaceJamCommentThreadMessage,
    useUpdateWorkspaceJamCommentThreadMessage,
    useDeleteWorkspaceJamCommentThreadMessage,
    useResolveWorkspaceJamCommentThread,
    useReopenWorkspaceJamCommentThread,
    useShareWorkspaceJam,
    useArchiveWorkspaceJam,
    useUnarchiveWorkspaceJam,
    useRequestWorkspaceJamEditAccess,
    useReviewWorkspaceJamEditAccessRequest,
  };
};

export default useWorkspaceJam;
