import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";
import useError from "./use-error";
import { logoutUser, updateUser } from "@/lib/services/user-service";
import { AuthUser, LogoutRequestBody, UpdateUserBody } from "@/types/auth";
import { ResponseObject } from "@/types/file";

type UseOptions<T, R = unknown> = UseMutationOptions<
  AxiosResponse<R>,
  unknown,
  T,
  unknown
>;

const useUser = () => {
  // Hooks
  const { handleError } = useError();

  const useUpdateUser = (
    options?: UseOptions<UpdateUserBody, { user: AuthUser }>,
  ) => {
    return useMutation({
      mutationFn: updateUser,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useLogout = (
    options?: UseOptions<LogoutRequestBody, ResponseObject>,
  ) => {
    return useMutation({
      mutationFn: logoutUser,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return { useUpdateUser, useLogout };
};

export default useUser;
