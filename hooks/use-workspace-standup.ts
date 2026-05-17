import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

import useError from "./use-error";
import {
  answerCurrentStandup,
  getCurrentStandup,
  getStandupOverview,
  getStandupSessionDetail,
  getStandupSettings,
  listStandupSessions,
  startCurrentStandup,
  submitCurrentStandup,
  summarizeStandupParticipant,
  summarizeStandupSession,
  updateStandupSettings,
} from "@/lib/services/workspace-standup-service";

const useWorkspaceStandup = () => {
  const { handleError } = useError();

  const useStandupSettings = (workspaceId: string, options?: { enabled?: boolean }) =>
    useQuery({
      queryKey: ["standup-settings", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getStandupSettings(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useCurrentStandup = (workspaceId: string, options?: { enabled?: boolean }) =>
    useQuery({
      queryKey: ["standup-current", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getCurrentStandup(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useStandupOverview = (workspaceId: string, options?: { enabled?: boolean }) =>
    useQuery({
      queryKey: ["standup-overview", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getStandupOverview(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useStandupSessions = (
    workspaceId: string,
    params?: { page?: number; limit?: number },
    options?: { enabled?: boolean },
  ) =>
    useQuery({
      queryKey: ["standup-sessions", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await listStandupSessions({ workspaceId, params });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useStandupSessionDetail = (workspaceId: string, sessionId: string, options?: { enabled?: boolean }) =>
    useQuery({
      queryKey: ["standup-session-detail", workspaceId, sessionId],
      enabled: (options?.enabled ?? true) && !!workspaceId && !!sessionId,
      queryFn: async () => {
        try {
          return await getStandupSessionDetail({ workspaceId, sessionId });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });

  const useUpdateStandupSettings = () =>
    useMutation({ mutationFn: updateStandupSettings, onError: (error) => handleError(error as AxiosError) });

  const useStartCurrentStandup = () =>
    useMutation({ mutationFn: startCurrentStandup, onError: (error) => handleError(error as AxiosError) });

  const useAnswerCurrentStandup = () =>
    useMutation({ mutationFn: answerCurrentStandup, onError: (error) => handleError(error as AxiosError) });

  const useSubmitCurrentStandup = () =>
    useMutation({ mutationFn: submitCurrentStandup, onError: (error) => handleError(error as AxiosError) });

  const useSummarizeStandupSession = () =>
    useMutation({ mutationFn: summarizeStandupSession, onError: (error) => handleError(error as AxiosError) });

  const useSummarizeStandupParticipant = () =>
    useMutation({ mutationFn: summarizeStandupParticipant, onError: (error) => handleError(error as AxiosError) });

  return {
    useStandupSettings,
    useCurrentStandup,
    useStandupOverview,
    useStandupSessions,
    useStandupSessionDetail,
    useUpdateStandupSettings,
    useStartCurrentStandup,
    useAnswerCurrentStandup,
    useSubmitCurrentStandup,
    useSummarizeStandupParticipant,
    useSummarizeStandupSession,
  };
};

export default useWorkspaceStandup;
