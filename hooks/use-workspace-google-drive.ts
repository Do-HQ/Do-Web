import useError from "./use-error";
import {
  disconnectWorkspaceGoogleDrive,
  getWorkspaceGoogleDriveFiles,
  getWorkspaceGoogleDriveIntegration,
  startWorkspaceGoogleDriveOAuth,
} from "@/lib/services/workspace-google-drive-service";
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

const useWorkspaceGoogleDrive = () => {
  const { handleError } = useError();

  const useWorkspaceGoogleDriveIntegration = (
    workspaceId: string,
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-google-drive-integration", workspaceId],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceGoogleDriveIntegration(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceGoogleDriveFiles = (
    workspaceId: string,
    params: { search?: string; pageToken?: string; pageSize?: number } = {},
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-google-drive-files", workspaceId, params],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceGoogleDriveFiles(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useStartWorkspaceGoogleDriveOAuth = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => startWorkspaceGoogleDriveOAuth(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDisconnectWorkspaceGoogleDrive = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => disconnectWorkspaceGoogleDrive(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceGoogleDriveIntegration,
    useWorkspaceGoogleDriveFiles,
    useStartWorkspaceGoogleDriveOAuth,
    useDisconnectWorkspaceGoogleDrive,
  };
};

export default useWorkspaceGoogleDrive;
