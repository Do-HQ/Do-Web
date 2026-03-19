import axiosInstance from ".";
import {
  WorkspaceGithubIntegrationResponseBody,
  WorkspaceGithubRepositoryRecord,
  WorkspaceProjectGithubBindingRecord,
} from "@/types/integration";

const WORKSPACE_GITHUB_ENDPOINTS = {
  integration: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/github`,
  oauthStart: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/github/oauth/start`,
  repositories: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/github/repos`,
  projectBinding: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/integrations/github`,
};

export const getWorkspaceGithubIntegration = async (workspaceId: string) => {
  return await axiosInstance.get<
    {
      message: string;
    } & WorkspaceGithubIntegrationResponseBody
  >(WORKSPACE_GITHUB_ENDPOINTS.integration(workspaceId));
};

export const startWorkspaceGithubOAuth = async (workspaceId: string) => {
  return await axiosInstance.get<{
    message: string;
    authUrl: string;
    expiresAt: string;
  }>(WORKSPACE_GITHUB_ENDPOINTS.oauthStart(workspaceId));
};

export const getWorkspaceGithubRepositories = async (
  workspaceId: string,
  params: {
    search?: string;
    page?: number;
    perPage?: number;
  } = {},
) => {
  return await axiosInstance.get<{
    message: string;
    repositories: WorkspaceGithubRepositoryRecord[];
    pagination: {
      page: number;
      perPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>(WORKSPACE_GITHUB_ENDPOINTS.repositories(workspaceId), {
    params: {
      search: params.search || "",
      page: params.page || 1,
      perPage: params.perPage || 30,
    },
  });
};

export const disconnectWorkspaceGithub = async (workspaceId: string) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
  }>(WORKSPACE_GITHUB_ENDPOINTS.integration(workspaceId));
};

export const getWorkspaceProjectGithubBinding = async (
  workspaceId: string,
  projectId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    project: {
      projectId: string;
      name: string;
    };
    binding: WorkspaceProjectGithubBindingRecord | null;
  }>(WORKSPACE_GITHUB_ENDPOINTS.projectBinding(workspaceId, projectId));
};

export const updateWorkspaceProjectGithubBinding = async (data: {
  workspaceId: string;
  projectId: string;
  payload: {
    repositoryFullName: string;
    syncTasks?: boolean;
    syncRisks?: boolean;
  };
}) => {
  return await axiosInstance.patch<{
    message: string;
    binding: WorkspaceProjectGithubBindingRecord;
  }>(
    WORKSPACE_GITHUB_ENDPOINTS.projectBinding(data.workspaceId, data.projectId),
    data.payload,
  );
};

export const disconnectWorkspaceProjectGithubBinding = async (data: {
  workspaceId: string;
  projectId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
  }>(
    WORKSPACE_GITHUB_ENDPOINTS.projectBinding(data.workspaceId, data.projectId),
  );
};
