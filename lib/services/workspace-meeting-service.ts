import axiosInstance from ".";
import type {
  CreateMeetingPayload,
  EventChecklistResponse,
  EventChecklistTarget,
  ListEventsForTaskResponse,
  GetMeetingResponse,
  ListMeetingsParams,
  ListMeetingsResponse,
  UpdateMeetingPayload,
} from "@/types/meeting";

const ENDPOINTS = {
  list: (workspaceId: string) => `/workspace/${workspaceId}/meetings`,
  create: (workspaceId: string) => `/workspace/${workspaceId}/meetings`,
  get: (workspaceId: string, meetingId: string) => `/workspace/${workspaceId}/meetings/${meetingId}`,
  update: (workspaceId: string, meetingId: string) => `/workspace/${workspaceId}/meetings/${meetingId}`,
  cancel: (workspaceId: string, meetingId: string) => `/workspace/${workspaceId}/meetings/${meetingId}`,
  rsvp: (workspaceId: string, meetingId: string) => `/workspace/${workspaceId}/meetings/${meetingId}/rsvp`,
  checklist: (workspaceId: string, meetingId: string) =>
    `/workspace/${workspaceId}/meetings/${meetingId}/checklist`,
  checklistItem: (workspaceId: string, meetingId: string, linkId: string) =>
    `/workspace/${workspaceId}/meetings/${meetingId}/checklist/${linkId}`,
  eventsForTask: (workspaceId: string) =>
    `/workspace/${workspaceId}/meetings/events-for-task`,
};

export const listWorkspaceMeetings = async (workspaceId: string, params?: ListMeetingsParams) =>
  axiosInstance.get<ListMeetingsResponse>(ENDPOINTS.list(workspaceId), { params });

export const createWorkspaceMeeting = async (workspaceId: string, payload: CreateMeetingPayload) =>
  axiosInstance.post<GetMeetingResponse>(ENDPOINTS.create(workspaceId), payload);

export const getWorkspaceMeeting = async (workspaceId: string, meetingId: string) =>
  axiosInstance.get<GetMeetingResponse>(ENDPOINTS.get(workspaceId, meetingId));

export const updateWorkspaceMeeting = async (
  workspaceId: string,
  meetingId: string,
  payload: UpdateMeetingPayload,
) => axiosInstance.patch<GetMeetingResponse>(ENDPOINTS.update(workspaceId, meetingId), payload);

export const cancelWorkspaceMeeting = async (workspaceId: string, meetingId: string) =>
  axiosInstance.delete<{ success: boolean }>(ENDPOINTS.cancel(workspaceId, meetingId));

export const rsvpWorkspaceMeeting = async (
  workspaceId: string,
  meetingId: string,
  status: "accepted" | "declined",
) => axiosInstance.post<{ success: boolean; status: string }>(ENDPOINTS.rsvp(workspaceId, meetingId), { status });

export const addEventChecklistItems = async (
  workspaceId: string,
  meetingId: string,
  items: EventChecklistTarget[],
) =>
  axiosInstance.post<EventChecklistResponse>(ENDPOINTS.checklist(workspaceId, meetingId), {
    items,
  });

export const removeEventChecklistItem = async (
  workspaceId: string,
  meetingId: string,
  linkId: string,
) =>
  axiosInstance.delete<EventChecklistResponse>(
    ENDPOINTS.checklistItem(workspaceId, meetingId, linkId),
  );

/** Events a given task is already tied to — used by the task editor. */
export const listEventsForTask = async (
  workspaceId: string,
  params: { projectId: string; taskId: string; subtaskId?: string },
) =>
  axiosInstance.get<ListEventsForTaskResponse>(ENDPOINTS.eventsForTask(workspaceId), {
    params,
  });
