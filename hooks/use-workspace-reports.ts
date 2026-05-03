import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

import useError from "./use-error";
import {
  createWorkspaceReportSchedule,
  deleteWorkspaceReport,
  deleteWorkspaceReportSchedule,
  getWorkspaceReport,
  getWorkspaceReportSchedule,
  listWorkspaceReports,
  listWorkspaceReportSchedules,
  markWorkspaceReportReviewed,
  renameWorkspaceReport,
  regenerateWorkspaceReport,
  resendWorkspaceReportEmail,
  runWorkspaceProjectReportNow,
  runWorkspaceReportScheduleNow,
  setWorkspaceReportScheduleActive,
  updateWorkspaceReportSchedule,
} from "@/lib/services/workspace-report-service";

const useWorkspaceReports = () => {
  const { handleError } = useError();

  const useWorkspaceReportSchedules = (
    workspaceId: string,
    params?: {
      page?: number;
      limit?: number;
      active?: boolean;
    },
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-report-schedules", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await listWorkspaceReportSchedules({
            workspaceId,
            params,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceReportSchedule = (
    workspaceId: string,
    scheduleId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-report-schedule", workspaceId, scheduleId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!scheduleId,
      queryFn: async () => {
        try {
          return await getWorkspaceReportSchedule({ workspaceId, scheduleId });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceReportsList = (
    workspaceId: string,
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
    },
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-reports", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await listWorkspaceReports({
            workspaceId,
            params,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceReportDetail = (
    workspaceId: string,
    reportId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-report-detail", workspaceId, reportId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!reportId,
      queryFn: async () => {
        try {
          return await getWorkspaceReport({ workspaceId, reportId });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useCreateWorkspaceReportSchedule = () =>
    useMutation({
      mutationFn: createWorkspaceReportSchedule,
      onError: (error) => handleError(error as AxiosError),
    });

  const useUpdateWorkspaceReportSchedule = () =>
    useMutation({
      mutationFn: updateWorkspaceReportSchedule,
      onError: (error) => handleError(error as AxiosError),
    });

  const useSetWorkspaceReportScheduleActive = () =>
    useMutation({
      mutationFn: setWorkspaceReportScheduleActive,
      onError: (error) => handleError(error as AxiosError),
    });

  const useDeleteWorkspaceReportSchedule = () =>
    useMutation({
      mutationFn: deleteWorkspaceReportSchedule,
      onError: (error) => handleError(error as AxiosError),
    });

  const useRunWorkspaceReportScheduleNow = () =>
    useMutation({
      mutationFn: runWorkspaceReportScheduleNow,
      onError: (error) => handleError(error as AxiosError),
    });

  const useRunWorkspaceProjectReportNow = () =>
    useMutation({
      mutationFn: runWorkspaceProjectReportNow,
      onError: (error) => handleError(error as AxiosError),
    });

  const useDeleteWorkspaceReport = () =>
    useMutation({
      mutationFn: deleteWorkspaceReport,
      onError: (error) => handleError(error as AxiosError),
    });

  const useRegenerateWorkspaceReport = () =>
    useMutation({
      mutationFn: regenerateWorkspaceReport,
      onError: (error) => handleError(error as AxiosError),
    });

  const useRenameWorkspaceReport = () =>
    useMutation({
      mutationFn: renameWorkspaceReport,
      onError: (error) => handleError(error as AxiosError),
    });

  const useResendWorkspaceReportEmail = () =>
    useMutation({
      mutationFn: resendWorkspaceReportEmail,
      onError: (error) => handleError(error as AxiosError),
    });

  const useMarkWorkspaceReportReviewed = () =>
    useMutation({
      mutationFn: markWorkspaceReportReviewed,
      onError: (error) => handleError(error as AxiosError),
    });

  return {
    useWorkspaceReportSchedules,
    useWorkspaceReportSchedule,
    useWorkspaceReportsList,
    useWorkspaceReportDetail,
    useCreateWorkspaceReportSchedule,
    useUpdateWorkspaceReportSchedule,
    useSetWorkspaceReportScheduleActive,
    useDeleteWorkspaceReportSchedule,
    useRunWorkspaceReportScheduleNow,
    useRunWorkspaceProjectReportNow,
    useDeleteWorkspaceReport,
    useRenameWorkspaceReport,
    useRegenerateWorkspaceReport,
    useResendWorkspaceReportEmail,
    useMarkWorkspaceReportReviewed,
  };
};

export default useWorkspaceReports;
