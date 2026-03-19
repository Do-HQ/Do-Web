import useError from "./use-error";
import {
  disconnectWorkspaceGoogleCalendar,
  getWorkspaceGoogleCalendarIntegration,
  getWorkspaceGoogleCalendars,
  sendWorkspaceGoogleCalendarTest,
  startWorkspaceGoogleCalendarOAuth,
  updateWorkspaceGoogleCalendars,
} from "@/lib/services/workspace-google-calendar-service";
import { UpdateWorkspaceGoogleCalendarBindingsRequestBody } from "@/types/integration";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";

type UseMutationOptionsType<T> = UseMutationOptions<
  AxiosResponse,
  unknown,
  T,
  unknown
>;

const useWorkspaceGoogleCalendar = () => {
  const { handleError } = useError();

  const useWorkspaceGoogleCalendarIntegration = (
    workspaceId: string,
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-google-calendar-integration", workspaceId],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceGoogleCalendarIntegration(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceGoogleCalendars = (
    workspaceId: string,
    params: { search?: string } = {},
    options: Pick<UseQueryOptions<AxiosResponse>, "enabled"> = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-google-calendar-calendars", workspaceId, params],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      queryFn: async () => {
        try {
          return await getWorkspaceGoogleCalendars(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useStartWorkspaceGoogleCalendarOAuth = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) =>
        startWorkspaceGoogleCalendarOAuth(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceGoogleCalendars = (
    options?: UseMutationOptionsType<{
      workspaceId: string;
      payload: UpdateWorkspaceGoogleCalendarBindingsRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceGoogleCalendars,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useSendWorkspaceGoogleCalendarTest = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) =>
        sendWorkspaceGoogleCalendarTest(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDisconnectWorkspaceGoogleCalendar = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) =>
        disconnectWorkspaceGoogleCalendar(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceGoogleCalendarIntegration,
    useWorkspaceGoogleCalendars,
    useStartWorkspaceGoogleCalendarOAuth,
    useUpdateWorkspaceGoogleCalendars,
    useSendWorkspaceGoogleCalendarTest,
    useDisconnectWorkspaceGoogleCalendar,
  };
};

export default useWorkspaceGoogleCalendar;
