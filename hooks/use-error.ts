import { AxiosError } from "axios";
import { toast } from "sonner";
import { ResponseObject } from "@/types/file";

const useError = () => {
  const handleError = (err: AxiosError, type?: "error" | "warning") => {
    if (err?.status === 401) {
    }

    const error =
      (err?.response?.data as ResponseObject)?.message ||
      "An error occured, please try again in few minutes";
    const description = (err?.response?.data as ResponseObject)?.description;

    if (type === "warning") {
      toast.warning(String(error), { description: description! });
    } else {
      toast.error(String(error), { description: description! });
    }
  };

  return { handleError };
};

export default useError;
