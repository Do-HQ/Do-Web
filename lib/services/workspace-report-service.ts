import axiosInstance from ".";
import {
  CreateWorkspaceReportScheduleRequestBody,
  RunWorkspaceProjectReportNowRequestBody,
  UpdateWorkspaceReportScheduleRequestBody,
  WorkspaceRunProjectReportNowResponse,
  WorkspaceReportResponse,
  WorkspaceReportsResponse,
  WorkspaceReportScheduleResponse,
  WorkspaceReportSchedulesResponse,
  WorkspaceRunScheduleResponse,
} from "@/types/reports";

const WORKSPACE_REPORT_ENDPOINTS = {
  schedules: (workspaceId: string) => `/workspace/${workspaceId}/report-schedules`,
  scheduleDetail: (workspaceId: string, scheduleId: string) =>
    `/workspace/${workspaceId}/report-schedules/${scheduleId}`,
  scheduleActive: (workspaceId: string, scheduleId: string) =>
    `/workspace/${workspaceId}/report-schedules/${scheduleId}/active`,
  scheduleRunNow: (workspaceId: string, scheduleId: string) =>
    `/workspace/${workspaceId}/report-schedules/${scheduleId}/run-now`,
  projectRunNow: (workspaceId: string, projectId: string) =>
    `/workspace/${workspaceId}/projects/${projectId}/reports/run-now`,
  reports: (workspaceId: string) => `/workspace/${workspaceId}/reports`,
  reportDetail: (workspaceId: string, reportId: string) =>
    `/workspace/${workspaceId}/reports/${reportId}`,
  reportRename: (workspaceId: string, reportId: string) =>
    `/workspace/${workspaceId}/reports/${reportId}`,
  reportRegenerate: (workspaceId: string, reportId: string) =>
    `/workspace/${workspaceId}/reports/${reportId}/regenerate`,
  reportSendEmail: (workspaceId: string, reportId: string) =>
    `/workspace/${workspaceId}/reports/${reportId}/send-email`,
  reportReview: (workspaceId: string, reportId: string) =>
    `/workspace/${workspaceId}/reports/${reportId}/review`,
};

export const listWorkspaceReportSchedules = async (data: {
  workspaceId: string;
  params?: {
    page?: number;
    limit?: number;
    active?: boolean;
  };
}) => {
  return await axiosInstance.get<WorkspaceReportSchedulesResponse>(
    WORKSPACE_REPORT_ENDPOINTS.schedules(data.workspaceId),
    { params: data.params },
  );
};

export const createWorkspaceReportSchedule = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceReportScheduleRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceReportScheduleResponse>(
    WORKSPACE_REPORT_ENDPOINTS.schedules(data.workspaceId),
    data.payload,
  );
};

export const getWorkspaceReportSchedule = async (data: {
  workspaceId: string;
  scheduleId: string;
}) => {
  return await axiosInstance.get<WorkspaceReportScheduleResponse>(
    WORKSPACE_REPORT_ENDPOINTS.scheduleDetail(data.workspaceId, data.scheduleId),
  );
};

export const updateWorkspaceReportSchedule = async (data: {
  workspaceId: string;
  scheduleId: string;
  payload: UpdateWorkspaceReportScheduleRequestBody;
}) => {
  return await axiosInstance.patch<WorkspaceReportScheduleResponse>(
    WORKSPACE_REPORT_ENDPOINTS.scheduleDetail(data.workspaceId, data.scheduleId),
    data.payload,
  );
};

export const setWorkspaceReportScheduleActive = async (data: {
  workspaceId: string;
  scheduleId: string;
  isActive: boolean;
}) => {
  return await axiosInstance.patch<WorkspaceReportScheduleResponse>(
    WORKSPACE_REPORT_ENDPOINTS.scheduleActive(data.workspaceId, data.scheduleId),
    {
      isActive: data.isActive,
    },
  );
};

export const deleteWorkspaceReportSchedule = async (data: {
  workspaceId: string;
  scheduleId: string;
}) => {
  return await axiosInstance.delete<{ message: string; deleted: boolean }>(
    WORKSPACE_REPORT_ENDPOINTS.scheduleDetail(data.workspaceId, data.scheduleId),
  );
};

export const runWorkspaceReportScheduleNow = async (data: {
  workspaceId: string;
  scheduleId: string;
}) => {
  return await axiosInstance.post<WorkspaceRunScheduleResponse>(
    WORKSPACE_REPORT_ENDPOINTS.scheduleRunNow(data.workspaceId, data.scheduleId),
    {},
  );
};

export const runWorkspaceProjectReportNow = async (data: {
  workspaceId: string;
  projectId: string;
  payload?: RunWorkspaceProjectReportNowRequestBody;
}) => {
  return await axiosInstance.post<WorkspaceRunProjectReportNowResponse>(
    WORKSPACE_REPORT_ENDPOINTS.projectRunNow(data.workspaceId, data.projectId),
    data.payload ?? {},
  );
};

export const listWorkspaceReports = async (data: {
  workspaceId: string;
  params?: {
    page?: number;
    limit?: number;
    reportType?: string;
    projectId?: string;
    status?: string;
    generatedBy?: string;
    reviewed?: boolean;
    dateFrom?: string;
    dateTo?: string;
  };
}) => {
  return await axiosInstance.get<WorkspaceReportsResponse>(
    WORKSPACE_REPORT_ENDPOINTS.reports(data.workspaceId),
    { params: data.params },
  );
};

export const getWorkspaceReport = async (data: {
  workspaceId: string;
  reportId: string;
}) => {
  return await axiosInstance.get<WorkspaceReportResponse>(
    WORKSPACE_REPORT_ENDPOINTS.reportDetail(data.workspaceId, data.reportId),
  );
};

export const deleteWorkspaceReport = async (data: {
  workspaceId: string;
  reportId: string;
}) => {
  return await axiosInstance.delete<{ message: string; deleted: boolean }>(
    WORKSPACE_REPORT_ENDPOINTS.reportDetail(data.workspaceId, data.reportId),
  );
};

export const renameWorkspaceReport = async (data: {
  workspaceId: string;
  reportId: string;
  title: string;
}) => {
  return await axiosInstance.patch<WorkspaceReportResponse>(
    WORKSPACE_REPORT_ENDPOINTS.reportRename(data.workspaceId, data.reportId),
    { title: data.title },
  );
};

export const regenerateWorkspaceReport = async (data: {
  workspaceId: string;
  reportId: string;
}) => {
  return await axiosInstance.post<WorkspaceReportResponse>(
    WORKSPACE_REPORT_ENDPOINTS.reportRegenerate(data.workspaceId, data.reportId),
    {},
  );
};

export const resendWorkspaceReportEmail = async (data: {
  workspaceId: string;
  reportId: string;
}) => {
  return await axiosInstance.post<WorkspaceReportResponse>(
    WORKSPACE_REPORT_ENDPOINTS.reportSendEmail(data.workspaceId, data.reportId),
    {},
  );
};

export const markWorkspaceReportReviewed = async (data: {
  workspaceId: string;
  reportId: string;
  reviewed?: boolean;
}) => {
  return await axiosInstance.patch<WorkspaceReportResponse>(
    WORKSPACE_REPORT_ENDPOINTS.reportReview(data.workspaceId, data.reportId),
    { reviewed: data.reviewed },
  );
};
