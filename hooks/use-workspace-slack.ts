import useError from "./use-error";
import {
  disconnectWorkspaceSlack,
  getWorkspaceSlackChannels,
  getWorkspaceSlackIntegration,
  sendWorkspaceSlackTest,
  startWorkspaceSlackOAuth,
  updateWorkspaceSlackChannels,
} from "@/lib/services/workspace-slack-service";
import { UpdateWorkspaceSlackBindingsRequestBody } from "@/types/integration";
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

const useWorkspaceSlack = () => {
  const { handleError } = useError();

  const useWorkspaceSlackIntegration = (
    workspaceId: string,
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-slack-integration", workspaceId],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceSlackIntegration(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceSlackChannels = (
    workspaceId: string,
    params: { search?: string } = {},
    options: Pick<UseQueryOptions<AxiosResponse>, "enabled"> = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-slack-channels", workspaceId, params],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      queryFn: async () => {
        try {
          return await getWorkspaceSlackChannels(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useStartWorkspaceSlackOAuth = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => startWorkspaceSlackOAuth(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useUpdateWorkspaceSlackChannels = (
    options?: UseMutationOptionsType<{
      workspaceId: string;
      payload: UpdateWorkspaceSlackBindingsRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceSlackChannels,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useSendWorkspaceSlackTest = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => sendWorkspaceSlackTest(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDisconnectWorkspaceSlack = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => disconnectWorkspaceSlack(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceSlackIntegration,
    useWorkspaceSlackChannels,
    useStartWorkspaceSlackOAuth,
    useUpdateWorkspaceSlackChannels,
    useSendWorkspaceSlackTest,
    useDisconnectWorkspaceSlack,
  };
};

export default useWorkspaceSlack;
