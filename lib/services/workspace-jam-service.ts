import {
  CreateWorkspaceJamCommentRequestBody,
  CreateWorkspaceJamCommentThreadRequestBody,
  CreateWorkspaceJamRequestBody,
  RequestWorkspaceJamEditAccessRequestBody,
  ReviewWorkspaceJamEditAccessRequestBody,
  ShareWorkspaceJamRequestBody,
  UpdateWorkspaceJamCommentThreadMessageRequestBody,
  UpdateWorkspaceJamContentRequestBody,
  UpdateWorkspaceJamRequestBody,
  WorkspaceJamCommentMentionSuggestion,
  WorkspaceJamCommentThreadListResponse,
  WorkspaceJamCommentThreadRecord,
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
  jamComments: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/comments`,
  jamCommentThreads: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/comment-threads`,
  jamCommentThread: (workspaceId: string, jamId: string, threadId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/comment-threads/${threadId}`,
  jamCommentThreadMessages: (
    workspaceId: string,
    jamId: string,
    threadId: string,
  ) => `/workspace/${workspaceId}/jams/${jamId}/comment-threads/${threadId}/messages`,
  jamCommentThreadMessage: (
    workspaceId: string,
    jamId: string,
    threadId: string,
    messageId: string,
  ) =>
    `/workspace/${workspaceId}/jams/${jamId}/comment-threads/${threadId}/messages/${messageId}`,
  jamCommentThreadResolve: (
    workspaceId: string,
    jamId: string,
    threadId: string,
  ) => `/workspace/${workspaceId}/jams/${jamId}/comment-threads/${threadId}/resolve`,
  jamCommentThreadReopen: (
    workspaceId: string,
    jamId: string,
    threadId: string,
  ) => `/workspace/${workspaceId}/jams/${jamId}/comment-threads/${threadId}/reopen`,
  jamCommentMentions: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/comment-mentions`,
  jamShare: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/share`,
  jamEditAccessRequests: (workspaceId: string, jamId: string) =>
    `/workspace/${workspaceId}/jams/${jamId}/access-requests`,
  jamEditAccessRequest: (
    workspaceId: string,
    jamId: string,
    requestId: string,
  ) => `/workspace/${workspaceId}/jams/${jamId}/access-requests/${requestId}`,
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

export const createWorkspaceJamComment = async (data: {
  workspaceId: string;
  jamId: string;
  payload: CreateWorkspaceJamCommentRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    jam: WorkspaceJamRecord;
    commentId: string;
    replyId: string;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamComments(data.workspaceId, data.jamId),
    data.payload,
  );
};

export const getWorkspaceJamCommentThreads = async (params: {
  workspaceId: string;
  jamId: string;
  status?: "open" | "resolved" | "all";
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const {
    workspaceId,
    jamId,
    status = "all",
    search = "",
    page = 1,
    limit = 40,
  } = params;

  return await axiosInstance.get<WorkspaceJamCommentThreadListResponse>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreads(workspaceId, jamId),
    {
      params: {
        status,
        search,
        page,
        limit,
      },
    },
  );
};

export const getWorkspaceJamCommentThread = async (params: {
  workspaceId: string;
  jamId: string;
  threadId: string;
}) => {
  return await axiosInstance.get<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThread(
      params.workspaceId,
      params.jamId,
      params.threadId,
    ),
  );
};

export const createWorkspaceJamCommentThread = async (params: {
  workspaceId: string;
  jamId: string;
  payload: CreateWorkspaceJamCommentThreadRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreads(params.workspaceId, params.jamId),
    params.payload,
  );
};

export const addWorkspaceJamCommentThreadMessage = async (params: {
  workspaceId: string;
  jamId: string;
  threadId: string;
  payload: CreateWorkspaceJamCommentThreadRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreadMessages(
      params.workspaceId,
      params.jamId,
      params.threadId,
    ),
    params.payload,
  );
};

export const updateWorkspaceJamCommentThreadMessage = async (params: {
  workspaceId: string;
  jamId: string;
  threadId: string;
  messageId: string;
  payload: UpdateWorkspaceJamCommentThreadMessageRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreadMessage(
      params.workspaceId,
      params.jamId,
      params.threadId,
      params.messageId,
    ),
    params.payload,
  );
};

export const deleteWorkspaceJamCommentThreadMessage = async (params: {
  workspaceId: string;
  jamId: string;
  threadId: string;
  messageId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreadMessage(
      params.workspaceId,
      params.jamId,
      params.threadId,
      params.messageId,
    ),
  );
};

export const resolveWorkspaceJamCommentThread = async (params: {
  workspaceId: string;
  jamId: string;
  threadId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreadResolve(
      params.workspaceId,
      params.jamId,
      params.threadId,
    ),
  );
};

export const reopenWorkspaceJamCommentThread = async (params: {
  workspaceId: string;
  jamId: string;
  threadId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    thread: WorkspaceJamCommentThreadRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamCommentThreadReopen(
      params.workspaceId,
      params.jamId,
      params.threadId,
    ),
  );
};

export const getWorkspaceJamCommentMentionSuggestions = async (params: {
  workspaceId: string;
  jamId: string;
  query?: string;
  limit?: number;
}) => {
  return await axiosInstance.get<{
    message: string;
    suggestions: WorkspaceJamCommentMentionSuggestion[];
  }>(WORKSPACE_JAM_ENDPOINTS.jamCommentMentions(params.workspaceId, params.jamId), {
    params: {
      query: params.query || "",
      limit: params.limit ?? 120,
    },
  });
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

export const requestWorkspaceJamEditAccess = async (data: {
  workspaceId: string;
  jamId: string;
  payload: RequestWorkspaceJamEditAccessRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamEditAccessRequests(data.workspaceId, data.jamId),
    data.payload,
  );
};

export const reviewWorkspaceJamEditAccessRequest = async (data: {
  workspaceId: string;
  jamId: string;
  requestId: string;
  payload: ReviewWorkspaceJamEditAccessRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    jam: WorkspaceJamRecord;
  }>(
    WORKSPACE_JAM_ENDPOINTS.jamEditAccessRequest(
      data.workspaceId,
      data.jamId,
      data.requestId,
    ),
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
