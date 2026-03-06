import {
  CreateWorkspaceSpaceMessageRequestBody,
  CreateWorkspaceSpaceRoomRequestBody,
  SpacePagination,
  UpdateWorkspaceSpaceMessageRequestBody,
  WorkspaceSpaceKeepUpItem,
  WorkspaceSpaceKeepUpQueryParams,
  WorkspaceSpaceMessageRecord,
  WorkspaceSpaceMessagesQueryParams,
  WorkspaceSpaceRoomRecord,
  WorkspaceSpaceRoomsQueryParams,
} from "@/types/space";
import axiosInstance from ".";

const WORKSPACE_SPACE_ENDPOINTS = {
  rooms: (workspaceId: string) => `/workspace/${workspaceId}/spaces/rooms`,
  roomMessages: (workspaceId: string, roomId: string) =>
    `/workspace/${workspaceId}/spaces/rooms/${roomId}/messages`,
  roomMessage: (workspaceId: string, roomId: string, messageId: string) =>
    `/workspace/${workspaceId}/spaces/rooms/${roomId}/messages/${messageId}`,
  threadReplies: (workspaceId: string, roomId: string, messageId: string) =>
    `/workspace/${workspaceId}/spaces/rooms/${roomId}/messages/${messageId}/thread`,
  markRead: (workspaceId: string, roomId: string) =>
    `/workspace/${workspaceId}/spaces/rooms/${roomId}/read`,
  keepUp: (workspaceId: string) => `/workspace/${workspaceId}/spaces/keep-up`,
  keepUpSeen: (workspaceId: string) =>
    `/workspace/${workspaceId}/spaces/keep-up/seen`,
};

export const getWorkspaceSpaceRooms = async (
  workspaceId: string,
  params: WorkspaceSpaceRoomsQueryParams = {},
) => {
  const {
    page = 1,
    limit = 100,
    search = "",
    kind = "all",
  } = params;

  return await axiosInstance.get<{
    message: string;
    rooms: WorkspaceSpaceRoomRecord[];
    pagination: SpacePagination;
  }>(WORKSPACE_SPACE_ENDPOINTS.rooms(workspaceId), {
    params: {
      page,
      limit,
      search,
      kind,
    },
  });
};

export const createWorkspaceSpaceRoom = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceSpaceRoomRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    room: WorkspaceSpaceRoomRecord;
  }>(WORKSPACE_SPACE_ENDPOINTS.rooms(data.workspaceId), data.payload);
};

export const getWorkspaceSpaceRoomMessages = async (
  workspaceId: string,
  roomId: string,
  params: WorkspaceSpaceMessagesQueryParams = {},
) => {
  const { page = 1, limit = 120 } = params;

  return await axiosInstance.get<{
    message: string;
    room: WorkspaceSpaceRoomRecord;
    messages: WorkspaceSpaceMessageRecord[];
    pagination: SpacePagination;
  }>(WORKSPACE_SPACE_ENDPOINTS.roomMessages(workspaceId, roomId), {
    params: {
      page,
      limit,
    },
  });
};

export const createWorkspaceSpaceMessage = async (data: {
  workspaceId: string;
  roomId: string;
  payload: CreateWorkspaceSpaceMessageRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    room: WorkspaceSpaceRoomRecord;
    chatMessage: WorkspaceSpaceMessageRecord;
  }>(WORKSPACE_SPACE_ENDPOINTS.roomMessages(data.workspaceId, data.roomId), data.payload);
};

export const updateWorkspaceSpaceMessage = async (data: {
  workspaceId: string;
  roomId: string;
  messageId: string;
  updates: UpdateWorkspaceSpaceMessageRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    chatMessage: WorkspaceSpaceMessageRecord;
  }>(
    WORKSPACE_SPACE_ENDPOINTS.roomMessage(
      data.workspaceId,
      data.roomId,
      data.messageId,
    ),
    data.updates,
  );
};

export const deleteWorkspaceSpaceMessage = async (data: {
  workspaceId: string;
  roomId: string;
  messageId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    deletedMessageId: string;
  }>(
    WORKSPACE_SPACE_ENDPOINTS.roomMessage(
      data.workspaceId,
      data.roomId,
      data.messageId,
    ),
  );
};

export const getWorkspaceSpaceThreadReplies = async (
  workspaceId: string,
  roomId: string,
  messageId: string,
  params: WorkspaceSpaceMessagesQueryParams = {},
) => {
  const { page = 1, limit = 120 } = params;

  return await axiosInstance.get<{
    message: string;
    root: WorkspaceSpaceMessageRecord;
    replies: WorkspaceSpaceMessageRecord[];
    pagination: SpacePagination;
  }>(WORKSPACE_SPACE_ENDPOINTS.threadReplies(workspaceId, roomId, messageId), {
    params: {
      page,
      limit,
    },
  });
};

export const createWorkspaceSpaceThreadReply = async (data: {
  workspaceId: string;
  roomId: string;
  messageId: string;
  payload: CreateWorkspaceSpaceMessageRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    room: WorkspaceSpaceRoomRecord;
    reply: WorkspaceSpaceMessageRecord;
  }>(
    WORKSPACE_SPACE_ENDPOINTS.threadReplies(
      data.workspaceId,
      data.roomId,
      data.messageId,
    ),
    data.payload,
  );
};

export const markWorkspaceSpaceRoomRead = async (data: {
  workspaceId: string;
  roomId: string;
}) => {
  return await axiosInstance.patch<{
    message: string;
    roomId: string;
    readAt: string;
  }>(WORKSPACE_SPACE_ENDPOINTS.markRead(data.workspaceId, data.roomId));
};

export const getWorkspaceSpaceKeepUp = async (
  workspaceId: string,
  params: WorkspaceSpaceKeepUpQueryParams = {},
) => {
  const { page = 1, limit = 20 } = params;

  return await axiosInstance.get<{
    message: string;
    items: WorkspaceSpaceKeepUpItem[];
    pagination: SpacePagination;
  }>(WORKSPACE_SPACE_ENDPOINTS.keepUp(workspaceId), {
    params: {
      page,
      limit,
    },
  });
};

export const markWorkspaceSpaceKeepUpSeen = async (workspaceId: string) => {
  return await axiosInstance.patch<{
    message: string;
    affected: number;
    seenAt: string;
  }>(WORKSPACE_SPACE_ENDPOINTS.keepUpSeen(workspaceId));
};
