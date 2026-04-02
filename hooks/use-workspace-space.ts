import useError from "./use-error";
import {
  createWorkspaceSpaceMessage,
  createWorkspaceSpaceRoom,
  createWorkspaceSpaceThreadReply,
  deleteWorkspaceSpaceMessage,
  getWorkspaceSpacePinnedMessages,
  getWorkspaceSpaceKeepUp,
  getWorkspaceSpaceRoomMessages,
  getWorkspaceSpaceRooms,
  getWorkspaceSpaceThreadReplies,
  markWorkspaceSpaceKeepUpSeen,
  markWorkspaceSpaceRoomRead,
  toggleWorkspaceSpaceMessagePin,
  toggleWorkspaceSpaceMessageReaction,
  updateWorkspaceSpaceMessage,
} from "@/lib/services/workspace-space-service";
import {
  CreateWorkspaceSpaceMessageRequestBody,
  CreateWorkspaceSpaceRoomRequestBody,
  UpdateWorkspaceSpaceMessageRequestBody,
  WorkspaceSpaceKeepUpQueryParams,
  WorkspaceSpaceMessagesQueryParams,
  WorkspaceSpaceRoomsQueryParams,
} from "@/types/space";
import {
  useInfiniteQuery,
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceSpace = () => {
  const { handleError } = useError();

  const useWorkspaceSpaceRooms = (
    workspaceId: string,
    params: WorkspaceSpaceRoomsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-spaces-rooms", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceSpaceRooms(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSpaceRoomsInfinite = (
    workspaceId: string,
    params: WorkspaceSpaceRoomsQueryParams = {},
    options?: { enabled?: boolean; limit?: number },
  ) => {
    const pageSize = options?.limit ?? params.limit ?? 30;
    const search = String(params.search || "");
    const kind = params.kind ?? "all";

    return useInfiniteQuery({
      queryKey: [
        "workspace-spaces-rooms",
        workspaceId,
        "infinite",
        search,
        kind,
        pageSize,
      ],
      initialPageParam: 1,
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async ({ pageParam }) => {
        try {
          return await getWorkspaceSpaceRooms(workspaceId, {
            page: Number(pageParam || 1),
            limit: pageSize,
            search,
            kind,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
      getNextPageParam: (lastPage) => {
        const pagination = lastPage?.data?.pagination;
        const hasNext = Boolean(pagination?.hasNext);

        if (!hasNext) {
          return undefined;
        }

        return Number(pagination?.page || 1) + 1;
      },
    });
  };

  const useWorkspaceSpaceRoomMessages = (
    workspaceId: string,
    roomId: string,
    params: WorkspaceSpaceMessagesQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-spaces-room-messages", workspaceId, roomId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!roomId,
      queryFn: async () => {
        try {
          return await getWorkspaceSpaceRoomMessages(workspaceId, roomId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSpaceRoomMessagesInfinite = (
    workspaceId: string,
    roomId: string,
    options?: { enabled?: boolean; limit?: number },
  ) => {
    const pageSize = options?.limit ?? 50;

    return useInfiniteQuery({
      queryKey: [
        "workspace-spaces-room-messages-infinite",
        workspaceId,
        roomId,
        pageSize,
      ],
      initialPageParam: 1,
      enabled: (options?.enabled ?? true) && !!workspaceId && !!roomId,
      queryFn: async ({ pageParam }) => {
        try {
          return await getWorkspaceSpaceRoomMessages(workspaceId, roomId, {
            page: Number(pageParam || 1),
            limit: pageSize,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
      getNextPageParam: (lastPage, allPages) => {
        const pagination = lastPage?.data?.pagination;
        const hasNext = Boolean(lastPage?.data?.pagination?.hasNext);

        if (!hasNext) {
          return undefined;
        }

        return Number(pagination?.page || allPages.length) + 1;
      },
    });
  };

  const useWorkspaceSpaceThreadReplies = (
    workspaceId: string,
    roomId: string,
    messageId: string,
    params: WorkspaceSpaceMessagesQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-spaces-thread-replies",
        workspaceId,
        roomId,
        messageId,
        params,
      ],
      enabled:
        (options?.enabled ?? true) &&
        !!workspaceId &&
        !!roomId &&
        !!messageId,
      queryFn: async () => {
        try {
          return await getWorkspaceSpaceThreadReplies(
            workspaceId,
            roomId,
            messageId,
            params,
          );
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSpacePinnedMessages = (
    workspaceId: string,
    roomId: string,
    params: WorkspaceSpaceMessagesQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-spaces-room-pins",
        workspaceId,
        roomId,
        params,
      ],
      enabled:
        (options?.enabled ?? true) &&
        !!workspaceId &&
        !!roomId,
      queryFn: async () => {
        try {
          return await getWorkspaceSpacePinnedMessages(
            workspaceId,
            roomId,
            params,
          );
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSpaceKeepUp = (
    workspaceId: string,
    params: WorkspaceSpaceKeepUpQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-spaces-keep-up", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceSpaceKeepUp(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceSpaceRoom = (
    options?: UseOptions<{ workspaceId: string; payload: CreateWorkspaceSpaceRoomRequestBody }>,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceSpaceRoom,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceSpaceMessage = (
    options?:
      | UseOptions<{
          workspaceId: string;
          roomId: string;
          payload: CreateWorkspaceSpaceMessageRequestBody;
        }>
      | undefined,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceSpaceMessage,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceSpaceMessage = (
    options?:
      | UseOptions<{
          workspaceId: string;
          roomId: string;
          messageId: string;
          updates: UpdateWorkspaceSpaceMessageRequestBody;
        }>
      | undefined,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceSpaceMessage,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceSpaceMessage = (
    options?: UseOptions<{ workspaceId: string; roomId: string; messageId: string }>,
  ) => {
    return useMutation({
      mutationFn: deleteWorkspaceSpaceMessage,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useCreateWorkspaceSpaceThreadReply = (
    options?:
      | UseOptions<{
          workspaceId: string;
          roomId: string;
          messageId: string;
          payload: CreateWorkspaceSpaceMessageRequestBody;
        }>
      | undefined,
  ) => {
    return useMutation({
      mutationFn: createWorkspaceSpaceThreadReply,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useMarkWorkspaceSpaceRoomRead = (
    options?: UseOptions<{ workspaceId: string; roomId: string }>,
  ) => {
    return useMutation({
      mutationFn: markWorkspaceSpaceRoomRead,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useMarkWorkspaceSpaceKeepUpSeen = (
    options?: UseOptions<string>,
  ) => {
    return useMutation({
      mutationFn: markWorkspaceSpaceKeepUpSeen,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useToggleWorkspaceSpaceMessageReaction = (
    options?:
      | UseOptions<{
          workspaceId: string;
          roomId: string;
          messageId: string;
          emoji: string;
        }>
      | undefined,
  ) => {
    return useMutation({
      mutationFn: toggleWorkspaceSpaceMessageReaction,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useToggleWorkspaceSpaceMessagePin = (
    options?:
      | UseOptions<{
          workspaceId: string;
          roomId: string;
          messageId: string;
        }>
      | undefined,
  ) => {
    return useMutation({
      mutationFn: toggleWorkspaceSpaceMessagePin,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceSpaceRooms,
    useWorkspaceSpaceRoomsInfinite,
    useWorkspaceSpaceRoomMessages,
    useWorkspaceSpaceRoomMessagesInfinite,
    useWorkspaceSpaceThreadReplies,
    useWorkspaceSpacePinnedMessages,
    useWorkspaceSpaceKeepUp,
    useCreateWorkspaceSpaceRoom,
    useCreateWorkspaceSpaceMessage,
    useUpdateWorkspaceSpaceMessage,
    useDeleteWorkspaceSpaceMessage,
    useCreateWorkspaceSpaceThreadReply,
    useMarkWorkspaceSpaceRoomRead,
    useMarkWorkspaceSpaceKeepUpSeen,
    useToggleWorkspaceSpaceMessageReaction,
    useToggleWorkspaceSpaceMessagePin,
  };
};

export default useWorkspaceSpace;
