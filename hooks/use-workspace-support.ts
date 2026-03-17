import { useMutation, useQuery, UseMutationOptions } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

import useError from "./use-error";
import {
  assignWorkspaceSupportTicket,
  createWorkspaceSupportTicketInternalNote,
  createWorkspaceSupportTicket,
  createWorkspaceSupportTicketMessage,
  getWorkspaceSupportQueue,
  getWorkspaceSupportSlaBoard,
  getWorkspaceSupportTicketInternalNotes,
  getWorkspaceSupportStatus,
  getWorkspaceSupportTicketDetail,
  getWorkspaceSupportTicketMessages,
  getWorkspaceSupportTickets,
  searchWorkspaceSupportKnowledgeBase,
  updateWorkspaceSupportTicket,
} from "@/lib/services/workspace-support-service";
import {
  AssignWorkspaceSupportTicketRequestBody,
  CreateWorkspaceSupportTicketInternalNoteRequestBody,
  CreateWorkspaceSupportTicketMessageRequestBody,
  CreateWorkspaceSupportTicketRequestBody,
  WorkspaceSupportQueueQueryParams,
  UpdateWorkspaceSupportTicketRequestBody,
  WorkspaceSupportKnowledgeBaseQueryParams,
  WorkspaceSupportTicketMessagesQueryParams,
  WorkspaceSupportTicketsQueryParams,
} from "@/types/support";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useWorkspaceSupport = () => {
  const { handleError } = useError();

  const useWorkspaceSupportTickets = (
    workspaceId: string,
    params: WorkspaceSupportTicketsQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-support-tickets", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportTickets(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportTicketDetail = (
    workspaceId: string,
    ticketId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-support-ticket-detail", workspaceId, ticketId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!ticketId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportTicketDetail(workspaceId, ticketId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportTicketMessages = (
    workspaceId: string,
    ticketId: string,
    params: WorkspaceSupportTicketMessagesQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-support-ticket-messages",
        workspaceId,
        ticketId,
        params,
      ],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!ticketId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportTicketMessages(workspaceId, ticketId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportKnowledgeBase = (
    workspaceId: string,
    params: WorkspaceSupportKnowledgeBaseQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-support-knowledge-base", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await searchWorkspaceSupportKnowledgeBase(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportStatus = (
    workspaceId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-support-status", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportStatus(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportQueue = (
    workspaceId: string,
    params: WorkspaceSupportQueueQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-support-queue", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportQueue(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportSlaBoard = (
    workspaceId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-support-sla-board", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportSlaBoard(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSupportTicketInternalNotes = (
    workspaceId: string,
    ticketId: string,
    params: WorkspaceSupportTicketMessagesQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-support-ticket-internal-notes",
        workspaceId,
        ticketId,
        params,
      ],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!ticketId,
      queryFn: async () => {
        try {
          return await getWorkspaceSupportTicketInternalNotes(
            workspaceId,
            ticketId,
            params,
          );
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceSupportTicket = (
    options?: UseOptions<{
      workspaceId: string;
      payload: CreateWorkspaceSupportTicketRequestBody;
    }>,
  ) =>
    useMutation({
      mutationFn: createWorkspaceSupportTicket,
      ...options,
    });

  const useUpdateWorkspaceSupportTicket = (
    options?: UseOptions<{
      workspaceId: string;
      ticketId: string;
      updates: UpdateWorkspaceSupportTicketRequestBody;
    }>,
  ) =>
    useMutation({
      mutationFn: updateWorkspaceSupportTicket,
      ...options,
    });

  const useCreateWorkspaceSupportTicketMessage = (
    options?: UseOptions<{
      workspaceId: string;
      ticketId: string;
      payload: CreateWorkspaceSupportTicketMessageRequestBody;
    }>,
  ) =>
    useMutation({
      mutationFn: createWorkspaceSupportTicketMessage,
      ...options,
    });

  const useAssignWorkspaceSupportTicket = (
    options?: UseOptions<{
      workspaceId: string;
      ticketId: string;
      payload: AssignWorkspaceSupportTicketRequestBody;
    }>,
  ) =>
    useMutation({
      mutationFn: assignWorkspaceSupportTicket,
      ...options,
    });

  const useCreateWorkspaceSupportTicketInternalNote = (
    options?: UseOptions<{
      workspaceId: string;
      ticketId: string;
      payload: CreateWorkspaceSupportTicketInternalNoteRequestBody;
    }>,
  ) =>
    useMutation({
      mutationFn: createWorkspaceSupportTicketInternalNote,
      ...options,
    });

  return {
    useWorkspaceSupportTickets,
    useWorkspaceSupportTicketDetail,
    useWorkspaceSupportTicketMessages,
    useWorkspaceSupportKnowledgeBase,
    useWorkspaceSupportStatus,
    useWorkspaceSupportQueue,
    useWorkspaceSupportSlaBoard,
    useWorkspaceSupportTicketInternalNotes,
    useCreateWorkspaceSupportTicket,
    useUpdateWorkspaceSupportTicket,
    useCreateWorkspaceSupportTicketMessage,
    useAssignWorkspaceSupportTicket,
    useCreateWorkspaceSupportTicketInternalNote,
  };
};

export default useWorkspaceSupport;
