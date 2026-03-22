import axiosInstance from ".";
import {
  UpdateWorkspaceGoogleChatBindingsRequestBody,
  WorkspaceGoogleChatIntegrationResponseBody,
  WorkspaceGoogleChatSpaceBindingRecord,
} from "@/types/integration";

const WORKSPACE_GOOGLE_CHAT_ENDPOINTS = {
  integration: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-chat`,
  spaces: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-chat/spaces`,
  test: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-chat/test`,
};

export const getWorkspaceGoogleChatIntegration = async (workspaceId: string) => {
  return await axiosInstance.get<
    {
      message: string;
    } & WorkspaceGoogleChatIntegrationResponseBody
  >(WORKSPACE_GOOGLE_CHAT_ENDPOINTS.integration(workspaceId));
};

export const getWorkspaceGoogleChatSpaces = async (
  workspaceId: string,
  params: {
    search?: string;
  } = {},
) => {
  return await axiosInstance.get<{
    message: string;
    spaces: WorkspaceGoogleChatSpaceBindingRecord[];
  }>(WORKSPACE_GOOGLE_CHAT_ENDPOINTS.spaces(workspaceId), {
    params: {
      search: params.search || "",
    },
  });
};

export const updateWorkspaceGoogleChatSpaces = async (data: {
  workspaceId: string;
  payload: UpdateWorkspaceGoogleChatBindingsRequestBody;
}) => {
  return await axiosInstance.patch<
    {
      message: string;
    } & WorkspaceGoogleChatIntegrationResponseBody
  >(WORKSPACE_GOOGLE_CHAT_ENDPOINTS.spaces(data.workspaceId), data.payload);
};

export const sendWorkspaceGoogleChatTest = async (workspaceId: string) => {
  return await axiosInstance.post<{
    message: string;
    spaceName: string;
    sentAt: string;
  }>(WORKSPACE_GOOGLE_CHAT_ENDPOINTS.test(workspaceId));
};

export const disconnectWorkspaceGoogleChat = async (workspaceId: string) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
    disconnectedAt: string;
  }>(WORKSPACE_GOOGLE_CHAT_ENDPOINTS.integration(workspaceId));
};
