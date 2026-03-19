import axiosInstance from ".";
import {
  UpdateWorkspaceGoogleCalendarBindingsRequestBody,
  WorkspaceGoogleCalendarIntegrationResponseBody,
  WorkspaceGoogleCalendarRecord,
} from "@/types/integration";

const WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS = {
  integration: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-calendar`,
  oauthStart: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-calendar/oauth/start`,
  calendars: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-calendar/calendars`,
  test: (workspaceId: string) =>
    `/workspace/${workspaceId}/integrations/google-calendar/test`,
};

export const getWorkspaceGoogleCalendarIntegration = async (
  workspaceId: string,
) => {
  return await axiosInstance.get<
    {
      message: string;
    } & WorkspaceGoogleCalendarIntegrationResponseBody
  >(WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS.integration(workspaceId));
};

export const startWorkspaceGoogleCalendarOAuth = async (workspaceId: string) => {
  return await axiosInstance.get<{
    message: string;
    authUrl: string;
    expiresAt: string;
  }>(WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS.oauthStart(workspaceId));
};

export const getWorkspaceGoogleCalendars = async (
  workspaceId: string,
  params: {
    search?: string;
  } = {},
) => {
  return await axiosInstance.get<{
    message: string;
    calendars: WorkspaceGoogleCalendarRecord[];
  }>(WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS.calendars(workspaceId), {
    params: {
      search: params.search || "",
    },
  });
};

export const updateWorkspaceGoogleCalendars = async (data: {
  workspaceId: string;
  payload: UpdateWorkspaceGoogleCalendarBindingsRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    calendars: WorkspaceGoogleCalendarIntegrationResponseBody["calendars"];
  }>(WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS.calendars(data.workspaceId), data.payload);
};

export const sendWorkspaceGoogleCalendarTest = async (workspaceId: string) => {
  return await axiosInstance.post<{
    message: string;
    calendarId: string;
    eventId: string;
    htmlLink: string;
  }>(WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS.test(workspaceId));
};

export const disconnectWorkspaceGoogleCalendar = async (workspaceId: string) => {
  return await axiosInstance.delete<{
    message: string;
    success: boolean;
  }>(WORKSPACE_GOOGLE_CALENDAR_ENDPOINTS.integration(workspaceId));
};
