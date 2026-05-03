import axiosInstance from ".";
import config from "@/config";
import { generateHeaders } from "@/lib/helpers/generateHeaders";
import { LOCAL_KEYS } from "@/utils/constants";
import {
  WorkspaceAiChatDetailResponse,
  WorkspaceAiDeleteChatResponse,
  WorkspaceAiChatRequestBody,
  WorkspaceAiChatResponse,
  WorkspaceAiChatsResponse,
  WorkspaceAiCreateChatRequestBody,
  WorkspaceAiCreateChatResponse,
  WorkspaceAiModelsResponse,
  WorkspaceAiStatusResponse,
  WorkspaceAiSendMessageRequestBody,
  WorkspaceAiSendMessageResponse,
  WorkspaceAiSendMessageStreamEvent,
  WorkspaceAiGenerateDraftRequestBody,
  WorkspaceAiGenerateDraftResponse,
} from "@/types/ai";

const WORKSPACE_AI_ENDPOINTS = {
  chat: (workspaceId: string) => `/workspace/${workspaceId}/ai/chat`,
  chats: (workspaceId: string) => `/workspace/${workspaceId}/ai/chats`,
  chatDetail: (workspaceId: string, chatId: string) =>
    `/workspace/${workspaceId}/ai/chats/${chatId}`,
  chatMessages: (workspaceId: string, chatId: string) =>
    `/workspace/${workspaceId}/ai/chats/${chatId}/messages`,
  chatMessagesStream: (workspaceId: string, chatId: string) =>
    `/workspace/${workspaceId}/ai/chats/${chatId}/messages/stream`,
  models: (workspaceId: string) => `/workspace/${workspaceId}/ai/models`,
  status: (workspaceId?: string) =>
    workspaceId ? `/workspace/${workspaceId}/ai/status` : "/workspace/ai/status",
  drafts: (workspaceId?: string) =>
    workspaceId ? `/workspace/${workspaceId}/ai/drafts` : "/workspace/ai/drafts",
};

export const chatWithWorkspaceAi = async (data: {
  workspaceId: string;
  payload: WorkspaceAiChatRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceAiChatResponse>(
    WORKSPACE_AI_ENDPOINTS.chat(data.workspaceId),
    data.payload,
  );
};

export const listWorkspaceAiChats = async (data: {
  workspaceId: string;
  params?: {
    page?: number;
    limit?: number;
  };
}) => {
  return await axiosInstance.get<WorkspaceAiChatsResponse>(
    WORKSPACE_AI_ENDPOINTS.chats(data.workspaceId),
    { params: data.params },
  );
};

export const createWorkspaceAiChat = async (data: {
  workspaceId: string;
  payload?: WorkspaceAiCreateChatRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceAiCreateChatResponse>(
    WORKSPACE_AI_ENDPOINTS.chats(data.workspaceId),
    data.payload || {},
  );
};

export const getWorkspaceAiChatDetail = async (data: {
  workspaceId: string;
  chatId: string;
  params?: {
    limit?: number;
  };
}) => {
  return await axiosInstance.get<WorkspaceAiChatDetailResponse>(
    WORKSPACE_AI_ENDPOINTS.chatDetail(data.workspaceId, data.chatId),
    { params: data.params },
  );
};

export const deleteWorkspaceAiChat = async (data: {
  workspaceId: string;
  chatId: string;
}) => {
  return await axiosInstance.delete<WorkspaceAiDeleteChatResponse>(
    WORKSPACE_AI_ENDPOINTS.chatDetail(data.workspaceId, data.chatId),
  );
};

export const sendWorkspaceAiChatMessage = async (data: {
  workspaceId: string;
  chatId: string;
  payload: WorkspaceAiSendMessageRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceAiSendMessageResponse>(
    WORKSPACE_AI_ENDPOINTS.chatMessages(data.workspaceId, data.chatId),
    data.payload,
  );
};

export const streamWorkspaceAiChatMessage = async (data: {
  workspaceId: string;
  chatId: string;
  payload: WorkspaceAiSendMessageRequestBody;
  signal?: AbortSignal;
  onEvent?: (event: WorkspaceAiSendMessageStreamEvent) => void;
}) => {
  const token =
    typeof window === "undefined"
      ? ""
      : localStorage.getItem(LOCAL_KEYS.TOKEN) || "";

  const requestHeaders = generateHeaders({
    token: token || undefined,
    clientId: config.CLIENT_ID || undefined,
    workspaceId: "1",
    profileToken: "1",
    projectId: "1",
    agentId: "1",
  });

  const response = await fetch(
    `${config.BASE_API_URL}${WORKSPACE_AI_ENDPOINTS.chatMessagesStream(
      data.workspaceId,
      data.chatId,
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...requestHeaders,
      },
      credentials: "include",
      body: JSON.stringify(data.payload),
      signal: data.signal,
    },
  );

  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => "");
    let parsed: {
      description?: string;
      message?: string;
      code?: string;
      details?: Record<string, unknown>;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const errorMessage =
      parsed?.description || parsed?.message || raw || "Unable to stream AI response";
    const error = new Error(errorMessage);
    (error as Error & { code?: string; details?: Record<string, unknown> }).code =
      parsed?.code || "AI_CHAT_STREAM_FAILED";
    (error as Error & { code?: string; details?: Record<string, unknown> }).details =
      parsed?.details;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }

    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = String(rawLine || "").trim();
      if (!line) {
        continue;
      }

      let event: WorkspaceAiSendMessageStreamEvent | null = null;
      try {
        event = JSON.parse(line) as WorkspaceAiSendMessageStreamEvent;
      } catch {
        event = null;
      }

      if (event) {
        data.onEvent?.(event);
      }
    }
  }

  if (buffer.trim()) {
    try {
      data.onEvent?.(JSON.parse(buffer.trim()) as WorkspaceAiSendMessageStreamEvent);
    } catch {
      // no-op
    }
  }
};

export const getWorkspaceAiModels = async (workspaceId: string) => {
  return await axiosInstance.get<WorkspaceAiModelsResponse>(
    WORKSPACE_AI_ENDPOINTS.models(workspaceId),
  );
};

export const getWorkspaceAiStatus = async (workspaceId?: string) => {
  return await axiosInstance.get<WorkspaceAiStatusResponse>(
    WORKSPACE_AI_ENDPOINTS.status(workspaceId),
  );
};

export const generateWorkspaceAiDraft = async (data: {
  workspaceId?: string;
  payload: WorkspaceAiGenerateDraftRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceAiGenerateDraftResponse>(
    WORKSPACE_AI_ENDPOINTS.drafts(data.workspaceId),
    data.payload,
  );
};
