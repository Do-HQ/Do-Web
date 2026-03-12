import {
  CreateWorkspaceJamRequestBody,
  ShareWorkspaceJamRequestBody,
  UpdateWorkspaceJamContentRequestBody,
  UpdateWorkspaceJamRequestBody,
  WorkspaceJamListQueryParams,
  WorkspaceJamRecord,
  WorkspaceJamShareTargetsResponse,
  WorkspaceJamsResponse,
} from "@/types/jam";
import axiosInstance from ".";

const WORKSPACE_JAM_ENDPOINTS = {
  jams: (workspaceId: string) => `/workspace/${workspaceId}/jams`,
  jam: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}`,
  jamContent: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/content`,
  jamShare: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/share`,
  jamArchive: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/archive`,
  jamUnarchive: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/unarchive`,
  shareTargets: (workspaceId: string) =>
    `/workspace/${workspaceId}/jams/share-targets`,
};

export const getWorkspaceJams = async (
  workspaceId: string,
  params: WorkspaceJamListQueryParams = {},
) => {
  const {
    page = 1,
    limit = 30,
    search = "",
    archived = false,
    scope = "all",
    includeSnapshot = true,
  } = params;

  return await axiosInstance.get<WorkspaceJamsResponse>(
    WORKSPACE_JAM_ENDPOINTS.jams(workspaceId),
    {
      params: {
        page,
        limit,
        search,
        archived,
        scope,
        includeSnapshot,
      },
    },
  );
};

export const getWorkspaceJamDetail = async (
  workspaceId: string,
  jamId: string,
  includeSnapshot = true,
) => {
  return await axiosInstance.get<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(WORKSPACE_JAM_ENDPOINTS.jam(workspaceId, jamId), {
    params: { includeSnapshot },
  });
};

export const createWorkspaceJam = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceJamRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(WORKSPACE_JAM_ENDPOINTS.jams(data.workspaceId), data.payload);
};

export const updateWorkspaceJam = async (data: {
  workspaceId: string;
  jamId: string;
  updates: UpdateWorkspaceJamRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(WORKSPACE_JAM_ENDPOINTS.jam(data.workspaceId, data.jamId), data.updates);
};

export const updateWorkspaceJamContent = async (data: {
  workspaceId: string;
  jamId: string;
  payload: UpdateWorkspaceJamContentRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamContent(data.workspaceId, data.jamId),
    data.payload,
  );
};

export const shareWorkspaceJam = async (data: {
  workspaceId: string;
  jamId: string;
  payload: ShareWorkspaceJamRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    jam: WorkspaceJamRecord;
    announcementsCount: number;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamShare(data.workspaceId, data.jamId),
    data.payload,
  );
};

export const archiveWorkspaceJam = async (data: {
  workspaceId: string;
  jamId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(WORKSPACE_JAM_ENDPOINTS.jamArchive(data.workspaceId, data.jamId));
};

export const unarchiveWorkspaceJam = async (data: {
  workspaceId: string;
  jamId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(WORKSPACE_JAM_ENDPOINTS.jamUnarchive(data.workspaceId, data.jamId));
};

export const getWorkspaceJamShareTargets = async (
  workspaceId: string,
  params: {
    search?: string;
    limit?: number;
  } = {},
) => {
  const { search = "", limit = 150 } = params;

  return await axiosInstance.get<{
    message: string;
    users: WorkspaceJamShareTargetsResponse["users"];
    teams: WorkspaceJamShareTargetsResponse["teams"];
    rooms: WorkspaceJamShareTargetsResponse["rooms"];
  }>(WORKSPACE_JAM_ENDPOINTS.shareTargets(workspaceId), {
    params: {
      search,
      limit,
    },
  });
};
