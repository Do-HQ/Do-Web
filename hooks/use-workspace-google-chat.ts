import useError from "./use-error";
import {
  disconnectWorkspaceGoogleChat,
  getWorkspaceGoogleChatIntegration,
  getWorkspaceGoogleChatSpaces,
  sendWorkspaceGoogleChatTest,
  updateWorkspaceGoogleChatSpaces,
} from "@/lib/services/workspace-google-chat-service";
import { UpdateWorkspaceGoogleChatBindingsRequestBody } from "@/types/integration";
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

const useWorkspaceGoogleChat = () => {
  const { handleError } = useError();

  const useWorkspaceGoogleChatIntegration = (
    workspaceId: string,
    options: Pick<
      UseQueryOptions<AxiosResponse>,
      "enabled" | "refetchOnWindowFocus"
    > = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-google-chat-integration", workspaceId],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
      queryFn: async () => {
        try {
          return await getWorkspaceGoogleChatIntegration(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceGoogleChatSpaces = (
    workspaceId: string,
    params: { search?: string } = {},
    options: Pick<UseQueryOptions<AxiosResponse>, "enabled"> = {},
  ) => {
    return useQuery({
      queryKey: ["workspace-google-chat-spaces", workspaceId, params],
      enabled: Boolean(workspaceId) && (options.enabled ?? true),
      queryFn: async () => {
        try {
          return await getWorkspaceGoogleChatSpaces(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useUpdateWorkspaceGoogleChatSpaces = (
    options?: UseMutationOptionsType<{
      workspaceId: string;
      payload: UpdateWorkspaceGoogleChatBindingsRequestBody;
    }>,
  ) => {
    return useMutation({
      mutationFn: updateWorkspaceGoogleChatSpaces,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useSendWorkspaceGoogleChatTest = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => sendWorkspaceGoogleChatTest(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDisconnectWorkspaceGoogleChat = (
    options?: UseMutationOptionsType<{ workspaceId: string }>,
  ) => {
    return useMutation({
      mutationFn: (variables) => disconnectWorkspaceGoogleChat(variables.workspaceId),
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceGoogleChatIntegration,
    useWorkspaceGoogleChatSpaces,
    useUpdateWorkspaceGoogleChatSpaces,
    useSendWorkspaceGoogleChatTest,
    useDisconnectWorkspaceGoogleChat,
  };
};

export default useWorkspaceGoogleChat;
