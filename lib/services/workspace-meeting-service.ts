import axiosInstance from ".";
import type {
  CreateMeetingPayload,
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
