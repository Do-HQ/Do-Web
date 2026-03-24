import { AxiosError } from "axios";
import { toast } from "sonner";
import { ResponseObject } from "@/types/file";

const useError = () => {
  const handleError = (err: AxiosError, type?: "error" | "warning") => {
    if (err?.status === 401) {
    }

    const fallbackMessage =
      err instanceof Error && err.message
        ? err.message
        : "An error occured, please try again in few minutes";
    const error =
      (err?.response?.data as ResponseObject)?.message ||
      fallbackMessage;
    const description =
      (err?.response?.data as ResponseObject)?.description ||
      (err instanceof Error ? err.message : "");

    if (type === "warning") {
      toast.warning(String(error), { description: description || undefined });
    } else {
      toast.error(String(error), { description: description || undefined });
    }
  };

  return { handleError };
};

export default useError;
