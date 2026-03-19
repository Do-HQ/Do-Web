import axiosInstance from ".";
import {
  WorkspaceGoogleDriveFileRecord,
  WorkspaceGoogleDriveIntegrationResponseBody,
} from "@/types/integration";

const WORKSPACE_GOOGLE_DRIVE_ENDPOINTS = {
  integration: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-drive`,
  oauthStart: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-drive/oauth/start`,
  files: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-drive/files`,
};

export const getWorkspaceGoogleDriveIntegration = async (workspaceId: string) => {
  return await axiosInstance.get<
    {
      message: string;
    } & WorkspaceGoogleDriveIntegrationResponseBody
  >(WORKSPACE_GOOGLE_DRIVE_ENDPOINTS.integration(workspaceId));
};

export const startWorkspaceGoogleDriveOAuth = async (workspaceId: string) => {
  return await axiosInstance.get<{
    message: string;
    authUrl: string;
    expiresAt: string;
  }>(WORKSPACE_GOOGLE_DRIVE_ENDPOINTS.oauthStart(workspaceId));
};

export const getWorkspaceGoogleDriveFiles = async (
  workspaceId: string,
  params: {
    search?: string;
    pageToken?: string;
    pageSize?: number;
  } = {},
) => {
  return await axiosInstance.get<{
    message: string;
    files: WorkspaceGoogleDriveFileRecord[];
    nextPageToken: string;
  }>(WORKSPACE_GOOGLE_DRIVE_ENDPOINTS.files(workspaceId), {
    params: {
      search: params.search || "",
      pageToken: params.pageToken || "",
      pageSize: params.pageSize || 25,
    },
  });
};

export const disconnectWorkspaceGoogleDrive = async (workspaceId: string) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
  }>(WORKSPACE_GOOGLE_DRIVE_ENDPOINTS.integration(workspaceId));
};
