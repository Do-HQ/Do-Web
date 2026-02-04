import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";
import useError from "./use-error";
import { updateUser } from "@/lib/services/user-service";
import { AuthUser, UpdateUserBody } from "@/types/auth";

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

  return { useUpdateUser };
};

export default useUser;
