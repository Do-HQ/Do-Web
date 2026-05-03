import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

import useError from "./use-error";
import {
  chatWithWorkspaceAi,
  createWorkspaceAiChat,
  deleteWorkspaceAiChat,
  generateWorkspaceAiDraft,
  getWorkspaceAiChatDetail,
  getWorkspaceAiStatus,
  getWorkspaceAiModels,
  listWorkspaceAiChats,
  sendWorkspaceAiChatMessage,
} from "@/lib/services/workspace-ai-service";

const useWorkspaceAi = () => {
  const { handleError } = useError();

  const useWorkspaceAiModels = (
    workspaceId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-ai-models", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceAiModels(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceAiStatus = (
    workspaceId?: string,
    options?: { enabled?: boolean; refresh?: boolean },
  ) => {
    const normalizedWorkspaceId = String(workspaceId || "").trim();

    return useQuery({
      queryKey: [
        "workspace-ai-status",
        normalizedWorkspaceId || "__global__",
        options?.refresh ? "refresh" : "cache",
      ],
      enabled: options?.enabled ?? true,
      staleTime: 20_000,
      queryFn: async () => {
        try {
          return await getWorkspaceAiStatus(normalizedWorkspaceId || undefined);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceAiChats = (
    workspaceId: string,
    params?: { page?: number; limit?: number },
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-ai-chats", workspaceId, params?.page, params?.limit],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await listWorkspaceAiChats({ workspaceId, params });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceAiChatDetail = (
    workspaceId: string,
    chatId: string,
    options?: { enabled?: boolean; limit?: number },
  ) => {
    return useQuery({
      queryKey: ["workspace-ai-chat-detail", workspaceId, chatId, options?.limit],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!chatId,
      queryFn: async () => {
        try {
          return await getWorkspaceAiChatDetail({
            workspaceId,
            chatId,
            params: { limit: options?.limit },
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceAiChat = () => {
    return useMutation({
      mutationFn: createWorkspaceAiChat,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  const useSendWorkspaceAiChatMessage = () => {
    return useMutation({
      mutationFn: sendWorkspaceAiChatMessage,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteWorkspaceAiChat = () => {
    return useMutation({
      mutationFn: deleteWorkspaceAiChat,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  const useWorkspaceAiChat = () => {
    return useMutation({
      mutationFn: chatWithWorkspaceAi,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  const useGenerateWorkspaceAiDraft = () => {
    return useMutation({
      mutationFn: generateWorkspaceAiDraft,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceAiChat,
    useWorkspaceAiChatDetail,
    useWorkspaceAiChats,
    useWorkspaceAiModels,
    useWorkspaceAiStatus,
    useCreateWorkspaceAiChat,
    useDeleteWorkspaceAiChat,
    useGenerateWorkspaceAiDraft,
    useSendWorkspaceAiChatMessage,
  };
};

export default useWorkspaceAi;
