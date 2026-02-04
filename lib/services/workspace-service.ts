import {
  CreateWorkspaceRequestBody,
  JoinWorkspaceRequestBody,
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
  const { page = 1, limit = 10, search = "" } = params || {};
  return await axiosInstance.get<{
    workspaces: WorkspaceType[];
    pagination: Pagination;
  }>(WORKSPACE_ENDPOINTS.GET_USER_WORKSPACES, {
    params: { page, limit, search },
  });
};
