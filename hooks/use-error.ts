import { AxiosError } from "axios";
import { toast } from "sonner";
import { ResponseObject } from "@/types/file";
import { ROUTES } from "@/utils/constants";

type ApiErrorPayload = ResponseObject & {
  code?: string;
  details?: {
    requiredTokens?: number;
    currentBalance?: number;
    monthlyAllocation?: number;
    plan?: string;
  };
};

const useError = () => {
  const handleError = (err: AxiosError, type?: "error" | "warning") => {
    if (err?.status === 401) {
    }

    const payload = ((err?.response?.data as ApiErrorPayload | undefined) ||
      {}) as ApiErrorPayload;
    const errorCode = String(payload?.code || "").trim().toUpperCase();

    if (errorCode === "TOKEN_INSUFFICIENT") {
      const requiredTokens = Number(payload?.details?.requiredTokens || 0);
      const currentBalance = Number(payload?.details?.currentBalance || 0);
      const plan = String(payload?.details?.plan || "").trim().toUpperCase();
      const estimateLabel =
        requiredTokens > 0 ? requiredTokens.toLocaleString() : "this amount of";
      const balanceLabel = currentBalance.toLocaleString();
      const description = `This action needs about ${estimateLabel} tokens. Your workspace has ${balanceLabel} available${plan ? ` on ${plan}` : ""}.`;

      toast.error("Not enough AI tokens", {
        description,
        action: {
          label: "Open billing",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.assign(ROUTES.SETTINGS_BILLING);
            }
          },
        },
      });
      return;
    }

    const fallbackMessage =
      err instanceof Error && err.message
        ? err.message
        : "An error occured, please try again in few minutes";
    const error =
      payload?.message ||
      fallbackMessage;
    const description =
      payload?.description ||
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
