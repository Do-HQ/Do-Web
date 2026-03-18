import axiosInstance from ".";
import {
  UpdateWorkspaceSlackBindingsRequestBody,
  WorkspaceSlackChannelRecord,
  WorkspaceSlackIntegrationResponseBody,
} from "@/types/integration";

const WORKSPACE_SLACK_ENDPOINTS = {
  integration: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/slack`,
  oauthStart: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/slack/oauth/start`,
  channels: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/slack/channels`,
  test: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/slack/test`,
};

export const getWorkspaceSlackIntegration = async (workspaceId: string) => {
  return await axiosInstance.get<
    {
      message: string;
    } & WorkspaceSlackIntegrationResponseBody
  >(WORKSPACE_SLACK_ENDPOINTS.integration(workspaceId));
};

export const startWorkspaceSlackOAuth = async (workspaceId: string) => {
  return await axiosInstance.get<{
    message: string;
    authUrl: string;
    expiresAt: string;
  }>(WORKSPACE_SLACK_ENDPOINTS.oauthStart(workspaceId));
};

export const getWorkspaceSlackChannels = async (
  workspaceId: string,
  params: {
    search?: string;
  } = {},
) => {
  return await axiosInstance.get<{
    message: string;
    channels: WorkspaceSlackChannelRecord[];
  }>(WORKSPACE_SLACK_ENDPOINTS.channels(workspaceId), {
    params: {
      search: params.search || "",
    },
  });
};

export const updateWorkspaceSlackChannels = async (data: {
  workspaceId: string;
  payload: UpdateWorkspaceSlackBindingsRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    channels: WorkspaceSlackIntegrationResponseBody["channels"];
  }>(WORKSPACE_SLACK_ENDPOINTS.channels(data.workspaceId), data.payload);
};

export const sendWorkspaceSlackTest = async (workspaceId: string) => {
  return await axiosInstance.post<{
    message: string;
    channelId: string;
    ts: string;
  }>(WORKSPACE_SLACK_ENDPOINTS.test(workspaceId));
};

export const disconnectWorkspaceSlack = async (workspaceId: string) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
  }>(WORKSPACE_SLACK_ENDPOINTS.integration(workspaceId));
};
