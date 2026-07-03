import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import useError from "./use-error";
import {
  cancelWorkspaceMeeting,
  createWorkspaceMeeting,
  getWorkspaceMeeting,
  listWorkspaceMeetings,
  rsvpWorkspaceMeeting,
  updateWorkspaceMeeting,
} from "@/lib/services/workspace-meeting-service";
import type {
  CreateMeetingPayload,
  ListMeetingsParams,
  UpdateMeetingPayload,
} from "@/types/meeting";

const useWorkspaceMeetings = () => {
  const { handleError } = useError();
  const queryClient = useQueryClient();

  const useMeetingsList = (
    workspaceId: string,
    params?: ListMeetingsParams,
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-meetings", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await listWorkspaceMeetings(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useMeeting = (
    workspaceId: string,
    meetingId: string,
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["workspace-meeting", workspaceId, meetingId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!meetingId,
      queryFn: async () => {
        try {
          return await getWorkspaceMeeting(workspaceId, meetingId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useCreateMeeting = (workspaceId: string) =>
    useMutation({
      mutationFn: (payload: CreateMeetingPayload) =>
        createWorkspaceMeeting(workspaceId, payload),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workspace-meetings", workspaceId] });
      },
      onError: (error: AxiosError) => handleError(error),
    });

  const useUpdateMeeting = (workspaceId: string, meetingId: string) =>
    useMutation({
      mutationFn: (payload: UpdateMeetingPayload) =>
        updateWorkspaceMeeting(workspaceId, meetingId, payload),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workspace-meetings", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["workspace-meeting", workspaceId, meetingId] });
      },
      onError: (error: AxiosError) => handleError(error),
    });

  const useCancelMeeting = (workspaceId: string) =>
    useMutation({
      mutationFn: (meetingId: string) => cancelWorkspaceMeeting(workspaceId, meetingId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workspace-meetings", workspaceId] });
      },
      onError: (error: AxiosError) => handleError(error),
    });

  const useRsvpMeeting = (workspaceId: string, meetingId: string) =>
    useMutation({
      mutationFn: (status: "accepted" | "declined") =>
        rsvpWorkspaceMeeting(workspaceId, meetingId, status),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workspace-meeting", workspaceId, meetingId] });
        queryClient.invalidateQueries({ queryKey: ["workspace-meetings", workspaceId] });
      },
      onError: (error: AxiosError) => handleError(error),
    });

  return {
    useMeetingsList,
    useMeeting,
    useCreateMeeting,
    useUpdateMeeting,
    useCancelMeeting,
    useRsvpMeeting,
  };
};

export default useWorkspaceMeetings;
