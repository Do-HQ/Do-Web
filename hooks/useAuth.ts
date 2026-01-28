import { getOtp, validateOtp } from "@/lib/services/authService";
import { GetOtpBody, ValidateOtpBpdy } from "@/types/auth";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { AxiosResponse, AxiosError } from "axios";
import useError from "./useError";

type UseOptions<T> = UseMutationOptions<AxiosResponse, unknown, T, unknown>;

const useAuth = () => {
  // Hooks
  const { handleError } = useError();

  const useOtp = (options?: UseOptions<GetOtpBody>) => {
    return useMutation({
      mutationFn: getOtp,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        console.log(error, "Error");
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  const useValidateOtp = (options?: UseOptions<ValidateOtpBpdy>) => {
    return useMutation({
      mutationFn: validateOtp,
      ...options,
      onError: (error, variables, onMutateResult, context) => {
        options?.onError?.(error, variables, onMutateResult, context);
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useOtp,
    useValidateOtp,
  };
};

export default useAuth;
