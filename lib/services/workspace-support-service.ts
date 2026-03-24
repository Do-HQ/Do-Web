import axiosInstance from ".";
import {
  AssignWorkspaceSupportTicketRequestBody,
  CreateWorkspaceSupportTicketInternalNoteRequestBody,
  CreateWorkspaceSupportTicketMessageRequestBody,
  CreateWorkspaceSupportTicketRequestBody,
  WorkspaceSupportQueueQueryParams,
  WorkspaceSupportQueueResponse,
  WorkspaceSupportSlaBoardResponse,
  WorkspaceSupportTicketInternalNotesResponse,
  UpdateWorkspaceSupportTicketRequestBody,
  WorkspaceSupportKnowledgeBaseQueryParams,
  WorkspaceSupportStatusResponse,
  WorkspaceSupportTicketDetailResponse,
  WorkspaceSupportTicketMessagesQueryParams,
  WorkspaceSupportTicketMessagesResponse,
  WorkspaceSupportTicketsQueryParams,
  WorkspaceSupportTicketsResponse,
} from "@/types/support";
import { searchWorkspaceKnowledgeBase } from "@/lib/services/workspace-knowledge-base-service";

const WORKSPACE_SUPPORT_ENDPOINTS = {
  tickets: (workspaceId: string) => `/workspace/${workspaceId}/support/tickets`,
  queue: (workspaceId: string) => `/workspace/${workspaceId}/support/queue`,
  slaBoard: (workspaceId: string) => `/workspace/${workspaceId}/support/sla-board`,
  ticket: (workspaceId: string, ticketId: string) =>
    `/workspace/${workspaceId}/support/tickets/${ticketId}`,
  ticketAssignee: (workspaceId: string, ticketId: string) =>
    `/workspace/${workspaceId}/support/tickets/${ticketId}/assignee`,
  ticketMessages: (workspaceId: string, ticketId: string) =>
    `/workspace/${workspaceId}/support/tickets/${ticketId}/messages`,
  ticketInternalNotes: (workspaceId: string, ticketId: string) =>
    `/workspace/${workspaceId}/support/tickets/${ticketId}/internal-notes`,
  status: (workspaceId: string) => `/workspace/${workspaceId}/support/status`,
};

export const getWorkspaceSupportTickets = async (
  workspaceId: string,
  params: WorkspaceSupportTicketsQueryParams = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    status = "all",
    priority = "all",
  } = params;

  return await axiosInstance.get<WorkspaceSupportTicketsResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.tickets(workspaceId),
    {
      params: {
        page,
        limit,
        search,
        status,
        priority,
      },
    },
  );
};

export const createWorkspaceSupportTicket = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceSupportTicketRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceSupportTicketDetailResponse & {
    initialMessage?: WorkspaceSupportTicketMessagesResponse["messages"][number];
  }>(WORKSPACE_SUPPORT_ENDPOINTS.tickets(data.workspaceId), data.payload);
};

export const getWorkspaceSupportQueue = async (
  workspaceId: string,
  params: WorkspaceSupportQueueQueryParams = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    status = "all",
    priority = "all",
    assigneeUserId = "",
    sla = "all",
  } = params;

  return await axiosInstance.get<WorkspaceSupportQueueResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.queue(workspaceId),
    {
      params: {
        page,
        limit,
        search,
        status,
        priority,
        assigneeUserId,
        sla,
      },
    },
  );
};

export const getWorkspaceSupportSlaBoard = async (workspaceId: string) => {
  return await axiosInstance.get<WorkspaceSupportSlaBoardResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.slaBoard(workspaceId),
  );
};

export const getWorkspaceSupportTicketDetail = async (
  workspaceId: string,
  ticketId: string,
) => {
  return await axiosInstance.get<WorkspaceSupportTicketDetailResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.ticket(workspaceId, ticketId),
  );
};

export const updateWorkspaceSupportTicket = async (data: {
  workspaceId: string;
  ticketId: string;
  updates: UpdateWorkspaceSupportTicketRequestBody;
}) => {
  return await axiosInstance.patch<WorkspaceSupportTicketDetailResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.ticket(data.workspaceId, data.ticketId),
    data.updates,
  );
};

export const assignWorkspaceSupportTicket = async (data: {
  workspaceId: string;
  ticketId: string;
  payload: AssignWorkspaceSupportTicketRequestBody;
}) => {
  return await axiosInstance.patch<WorkspaceSupportTicketDetailResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.ticketAssignee(data.workspaceId, data.ticketId),
    data.payload,
  );
};

export const getWorkspaceSupportTicketMessages = async (
  workspaceId: string,
  ticketId: string,
  params: WorkspaceSupportTicketMessagesQueryParams = {},
) => {
  const { page = 1, limit = 30 } = params;

  return await axiosInstance.get<WorkspaceSupportTicketMessagesResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.ticketMessages(workspaceId, ticketId),
    {
      params: {
        page,
        limit,
      },
    },
  );
};

export const createWorkspaceSupportTicketMessage = async (data: {
  workspaceId: string;
  ticketId: string;
  payload: CreateWorkspaceSupportTicketMessageRequestBody;
}) => {
  return await axiosInstance.post<
    WorkspaceSupportTicketDetailResponse & {
      message: WorkspaceSupportTicketMessagesResponse["messages"][number];
    }
  >(
    WORKSPACE_SUPPORT_ENDPOINTS.ticketMessages(data.workspaceId, data.ticketId),
    data.payload,
  );
};

export const getWorkspaceSupportTicketInternalNotes = async (
  workspaceId: string,
  ticketId: string,
  params: WorkspaceSupportTicketMessagesQueryParams = {},
) => {
  const { page = 1, limit = 30 } = params;

  return await axiosInstance.get<WorkspaceSupportTicketInternalNotesResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.ticketInternalNotes(workspaceId, ticketId),
    {
      params: {
        page,
        limit,
      },
    },
  );
};

export const createWorkspaceSupportTicketInternalNote = async (data: {
  workspaceId: string;
  ticketId: string;
  payload: CreateWorkspaceSupportTicketInternalNoteRequestBody;
}) => {
  return await axiosInstance.post<
    WorkspaceSupportTicketInternalNotesResponse & {
      note: WorkspaceSupportTicketInternalNotesResponse["notes"][number];
    }
  >(
    WORKSPACE_SUPPORT_ENDPOINTS.ticketInternalNotes(
      data.workspaceId,
      data.ticketId,
    ),
    data.payload,
  );
};

export const searchWorkspaceSupportKnowledgeBase = async (
  workspaceId: string,
  params: WorkspaceSupportKnowledgeBaseQueryParams = {},
) => {
  const { query = "", limit = 6 } = params;
  return await searchWorkspaceKnowledgeBase(workspaceId, {
    query,
    limit,
    page: 1,
    source: "all",
    category: "all",
    publishState: "all",
  });
};

export const getWorkspaceSupportStatus = async (workspaceId: string) => {
  return await axiosInstance.get<WorkspaceSupportStatusResponse>(
    WORKSPACE_SUPPORT_ENDPOINTS.status(workspaceId),
  );
};
