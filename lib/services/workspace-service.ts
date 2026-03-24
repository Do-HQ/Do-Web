import {
  AcceptWorkspaceInviteRequestBody,
  CreateWorkspaceInviteRequestBody,
  CreateWorkspaceRequestBody,
  JoinWorkspaceRequestBody,
  ModerateWorkspaceJoinRequestBody,
  RevokeWorkspaceInviteRequestBody,
  WorkspaceInvite,
  WorkspaceJoinRequest,
  WorkspacePerson,
  WorkspaceRole,
  WorkspaceSettingsUpdateBody,
  WorkspaceType,
} from "@/types/workspace";
import axiosInstance from ".";
import { Pagination } from "@/types";
import { ResponseObject } from "@/types/file";

const WORKSPACE_ENDPOINTS = {
  GET_PUBLIC_WORKSPACE: "/workspace",
  JOIN_WORKSPACE: "/workspace/requests/join",
  CREATE_WORKSPACE: "/workspace",
  GET_USER_WORKSPACES: "/workspace/user",
  WORKSPACE_INVITE: "/workspace/invites",
};

export interface PaginationBody {
  page: number;
  limit: number;
  search?: string;
}

export const getPublicWorkspaces = async (params: PaginationBody) => {
  const { page = 1, limit = 10, search = "" } = params || {};
  return await axiosInstance.get<{
    workspaces: WorkspaceType[];
    pagination: Pagination;
  }>(WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE, {
    params: { page, limit, search },
  });
};

export const getWorkspaceById = async (wokspaceId: string) => {
  return await axiosInstance.get<{
    workspace: WorkspaceType;
  }>(`${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${wokspaceId}`);
};

export const updateWorkspace = async (data: {
  workspaceId: string;
  data: WorkspaceSettingsUpdateBody;
}) => {
  return await axiosInstance.patch<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${data?.workspaceId}`,
    data.data,
  );
};

export const approveWorkspaceJoinRequest = async (
  data: ModerateWorkspaceJoinRequestBody,
) => {
  return await axiosInstance.post<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${data.workspaceId}/requests/join/approve`,
    { requestId: data.requestId },
  );
};

export const declineWorkspaceJoinRequest = async (
  data: ModerateWorkspaceJoinRequestBody,
) => {
  return await axiosInstance.post<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${data.workspaceId}/requests/join/reject`,
    { requestId: data.requestId },
  );
};

export const requestToJoinWorkspace = async (
  data: JoinWorkspaceRequestBody,
) => {
  return await axiosInstance.post<ResponseObject>(
    WORKSPACE_ENDPOINTS.JOIN_WORKSPACE,
    data,
  );
};

export const switchWorkspace = async (data: JoinWorkspaceRequestBody) => {
  return await axiosInstance.patch<ResponseObject>(
    `/workspace/${data?.workspaceId}/switch`,
  );
};

export const createWorkspace = async (data: CreateWorkspaceRequestBody) => {
  return await axiosInstance.post<ResponseObject>(
    WORKSPACE_ENDPOINTS.CREATE_WORKSPACE,
    data,
  );
};

export const getUserWorkspaces = async (params: PaginationBody) => {
  const { page, limit, search } = params;
  return await axiosInstance.get<{
    workspaces: WorkspaceType[];
    pagination: Pagination;
  }>(WORKSPACE_ENDPOINTS.GET_USER_WORKSPACES, {
    params: { page, limit, search },
  });
};

export const getWorkspacePeople = async (
  workspaceId: string,
  params: PaginationBody,
) => {
  return await axiosInstance.get<{
    workspaces: WorkspaceType[];
    members: WorkspacePerson[];
    pagination: Pagination;
  }>(`${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${workspaceId}/members`, {
    params,
  });
};

export const removeWorkspaceMember = async (data: {
  workspaceId: string;
  memberId: string;
}) => {
  return await axiosInstance.delete<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${data.workspaceId}/members/${data.memberId}`,
  );
};

export const getWorkspaceInvites = async (
  workspaceId: string,
  params: PaginationBody,
) => {
  const { page = 1, limit = 10, search = "" } = params || {};
  return await axiosInstance.get<{
    invites: WorkspaceInvite[];
    pagination: Pagination;
  }>(`${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/invites/${workspaceId}`, {
    params: { page, limit, search },
  });
};

export const getWorkspaceRoles = async (workspaceId: string) => {
  return await axiosInstance.get<{
    roles: WorkspaceRole[];
  }>(`${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/${workspaceId}/roles`);
};

export const createWorkspaceInvite = async (data: {
  workspaceId: string;
  data: CreateWorkspaceInviteRequestBody[];
}) => {
  return await axiosInstance.post<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.WORKSPACE_INVITE}/${data?.workspaceId}`,
    { invites: data?.data },
  );
};

export const acceptWorkspaceInvite = async (
  data: AcceptWorkspaceInviteRequestBody,
) => {
  return await axiosInstance.post<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.WORKSPACE_INVITE}/accept`,
    data,
  );
};

export const revokeWorkspaceInvite = async (
  data: RevokeWorkspaceInviteRequestBody,
) => {
  return await axiosInstance.post<ResponseObject>(
    `${WORKSPACE_ENDPOINTS.WORKSPACE_INVITE}/${data.workspaceId}/revoke`,
    {
      token: data.token,
      reason: data.reason,
    },
  );
};

export const getWorkspaceJoinRequests = async (
  workspaceId: string,
  params: PaginationBody,
) => {
  const { page = 1, limit = 10, search = "" } = params || {};
  return await axiosInstance.get<{
    requests: WorkspaceJoinRequest[];
    pagination: Pagination;
  }>(`${WORKSPACE_ENDPOINTS.GET_PUBLIC_WORKSPACE}/requests/${workspaceId}`, {
    params: { page, limit, search },
  });
};
