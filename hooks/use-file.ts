import useError from "./use-error";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { deleteFile, uploadFile } from "@/lib/services/file-service";
import { AxiosError, AxiosResponse } from "axios";
import { CustomFile, ResponseObject } from "@/types/file";

type UseOptions<T, R = unknown> = UseMutationOptions<
  AxiosResponse<R>,
  unknown,
  T,
  unknown
>;

const useFile = () => {
  // Hooks
  const { handleError } = useError();

  const useUploadAsset = (
    options?: UseOptions<FormData, { asset: CustomFile }>,
  ) => {
    return useMutation({
      mutationFn: uploadFile,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useDeleteAsset = (options?: UseOptions<string, ResponseObject>) => {
    return useMutation({
      mutationFn: deleteFile,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return { useUploadAsset, useDeleteAsset };
};

export default useFile;
