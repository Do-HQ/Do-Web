import { AxiosError } from "axios";

export const getErrorStatus = (error: unknown): number | undefined => {
  const axiosError = error as AxiosError | undefined;
  return axiosError?.response?.status ?? (axiosError?.status as number | undefined);
};

export const isForbiddenError = (error: unknown): boolean =>
  getErrorStatus(error) === 403;
