import { AxiosError } from "axios";
import { toast } from "sonner";

interface ErrorObject {
  message: string;
  description: string;
}

const useError = () => {
  // Utils
  const handleError = (err: AxiosError, type?: "error" | "warning") => {
    if (err?.status === 401) {
    }

    const error =
      (err?.response?.data as ErrorObject)?.message ||
      "An error occured, please try again in few minutes";

    const description = (err?.response?.data as ErrorObject)?.description;

    if (type === "warning") {
      toast.warning(String(error), { description: description! });
    } else {
      toast.error(String(error), { description: description! });
    }
  };

  return { handleError };
};

export default useError;
