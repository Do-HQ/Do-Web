import axios from "axios";
import axiosInstance from ".";
import config from "@/config";
import {
  CreateWorkspaceDocRequestBody,
  UpdateWorkspaceDocRequestBody,
  WorkspaceDocRecord,
  WorkspaceDocsListResponseBody,
  WorkspaceDocsQueryParams,
} from "@/types/doc";

const WORKSPACE_DOC_ENDPOINTS = {
  docs: (workspaceId: string) => `/workspace/${workspaceId}/docs`,
  doc: (workspaceId: string, docId: string) =>
    `/workspace/${workspaceId}/docs/${docId}`,
  archive: (workspaceId: string, docId: string) =>
    `/workspace/${workspaceId}/docs/${docId}/archive`,
  unarchive: (workspaceId: string, docId: string) =>
    `/workspace/${workspaceId}/docs/${docId}/unarchive`,
  shared: (shareToken: string) => `/public/docs/share/${shareToken}`,
};

export const getWorkspaceDocs = async (
  workspaceId: string,
  params: WorkspaceDocsQueryParams = {},
) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    archived = false,
  } = params;

  return await axiosInstance.get<
    {
      message: string;
    } & WorkspaceDocsListResponseBody
  >(WORKSPACE_DOC_ENDPOINTS.docs(workspaceId), {
    params: {
      page,
      limit,
      search,
      archived,
    },
  });
};

export const getWorkspaceDocDetail = async (
  workspaceId: string,
  docId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    doc: WorkspaceDocRecord;
  }>(WORKSPACE_DOC_ENDPOINTS.doc(workspaceId, docId));
};

export const createWorkspaceDoc = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceDocRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    doc: WorkspaceDocRecord;
  }>(WORKSPACE_DOC_ENDPOINTS.docs(data.workspaceId), data.payload);
};

export const updateWorkspaceDoc = async (data: {
  workspaceId: string;
  docId: string;
  updates: UpdateWorkspaceDocRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    doc: WorkspaceDocRecord;
  }>(WORKSPACE_DOC_ENDPOINTS.doc(data.workspaceId, data.docId), data.updates);
};

export const archiveWorkspaceDoc = async (data: {
  workspaceId: string;
  docId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    success: boolean;
  }>(WORKSPACE_DOC_ENDPOINTS.archive(data.workspaceId, data.docId));
};

export const unarchiveWorkspaceDoc = async (data: {
  workspaceId: string;
  docId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    success: boolean;
  }>(WORKSPACE_DOC_ENDPOINTS.unarchive(data.workspaceId, data.docId));
};

export const deleteWorkspaceDoc = async (data: {
  workspaceId: string;
  docId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
  }>(WORKSPACE_DOC_ENDPOINTS.doc(data.workspaceId, data.docId));
};

export const getSharedWorkspaceDoc = async (shareToken: string) => {
  const client = axios.create({
    baseURL: config.BASE_API_URL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await client.get<{
    message: string;
    doc: WorkspaceDocRecord;
  }>(WORKSPACE_DOC_ENDPOINTS.shared(shareToken));
};
