import axiosInstance from ".";
import type {
  StandupCurrentResponse,
  StandupOverviewResponse,
  StandupSessionDetailResponse,
  StandupSessionsResponse,
  StandupSettings,
  StandupSettingsResponse,
  StandupSummary,
} from "@/types/standup";

const ENDPOINTS = {
  settings: (workspaceId: string) => `/workspace/${workspaceId}/standup/settings`,
  current: (workspaceId: string) => `/workspace/${workspaceId}/standup/current`,
  start: (workspaceId: string) => `/workspace/${workspaceId}/standup/current/start`,
  answer: (workspaceId: string) => `/workspace/${workspaceId}/standup/current/answer`,
  submit: (workspaceId: string) => `/workspace/${workspaceId}/standup/current/submit`,
  overview: (workspaceId: string) => `/workspace/${workspaceId}/standup/overview`,
  sessions: (workspaceId: string) => `/workspace/${workspaceId}/standup/sessions`,
  session: (workspaceId: string, sessionId: string) => `/workspace/${workspaceId}/standup/sessions/${sessionId}`,
  summarize: (workspaceId: string, sessionId: string) => `/workspace/${workspaceId}/standup/sessions/${sessionId}/summarize`,
  summarizeParticipant: (workspaceId: string, sessionId: string, participantId: string) =>
    `/workspace/${workspaceId}/standup/sessions/${sessionId}/participants/${participantId}/summarize`,
};

export const getStandupSettings = async (workspaceId: string) =>
  axiosInstance.get<StandupSettingsResponse>(ENDPOINTS.settings(workspaceId));

export const updateStandupSettings = async (data: {
  workspaceId: string;
  payload: Partial<StandupSettings>;
}) => axiosInstance.patch<StandupSettingsResponse>(ENDPOINTS.settings(data.workspaceId), data.payload);

export const getCurrentStandup = async (workspaceId: string) =>
  axiosInstance.get<StandupCurrentResponse>(ENDPOINTS.current(workspaceId));

export const startCurrentStandup = async (workspaceId: string) =>
  axiosInstance.post<StandupCurrentResponse>(ENDPOINTS.start(workspaceId), {});

export const answerCurrentStandup = async (data: {
  workspaceId: string;
  questionId: string;
  answerValue: unknown;
}) => axiosInstance.post(ENDPOINTS.answer(data.workspaceId), { questionId: data.questionId, answerValue: data.answerValue });

export const submitCurrentStandup = async (workspaceId: string) =>
  axiosInstance.post<StandupCurrentResponse>(ENDPOINTS.submit(workspaceId), { confirm: true });

export const getStandupOverview = async (workspaceId: string) =>
  axiosInstance.get<StandupOverviewResponse>(ENDPOINTS.overview(workspaceId));

export const listStandupSessions = async (data: {
  workspaceId: string;
  params?: { page?: number; limit?: number };
}) => axiosInstance.get<StandupSessionsResponse>(ENDPOINTS.sessions(data.workspaceId), { params: data.params });

export const getStandupSessionDetail = async (data: { workspaceId: string; sessionId: string }) =>
  axiosInstance.get<StandupSessionDetailResponse>(ENDPOINTS.session(data.workspaceId, data.sessionId));

export const summarizeStandupSession = async (data: { workspaceId: string; sessionId: string }) =>
  axiosInstance.post<{ message: string; summary: StandupSummary }>(ENDPOINTS.summarize(data.workspaceId, data.sessionId), {});

export const summarizeStandupParticipant = async (data: { workspaceId: string; sessionId: string; participantId: string }) =>
  axiosInstance.post<{ message: string; summary: StandupSummary }>(
    ENDPOINTS.summarizeParticipant(data.workspaceId, data.sessionId, data.participantId),
    {},
  );
