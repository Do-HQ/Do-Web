import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

import useError from "./use-error";
import {
  changeWorkspaceBillingPlan,
  getWorkspaceBillingSummary,
  getWorkspaceTokenLedger,
  getWorkspaceTokenUsage,
  listWorkspaceBillingPlans,
  purchaseWorkspaceTokens,
  subscribeWorkspaceBillingPlan,
} from "@/lib/services/workspace-billing-service";

const useWorkspaceBilling = () => {
  const { handleError } = useError();

  const useWorkspaceBillingPlans = (
    workspaceId: string,
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-billing-plans", workspaceId],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await listWorkspaceBillingPlans(workspaceId);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceBillingSummary = (
    workspaceId: string,
    params?: { rangeDays?: number },
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-billing-summary", workspaceId, params?.rangeDays],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceBillingSummary({
            workspaceId,
            rangeDays: params?.rangeDays,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
      staleTime: 20_000,
    });
  };

  const useWorkspaceTokenUsage = (
    workspaceId: string,
    params?: { range?: "7d" | "30d" | "90d" | "180d" | "365d" },
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-token-usage", workspaceId, params?.range],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceTokenUsage({
            workspaceId,
            range: params?.range,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useWorkspaceTokenLedger = (
    workspaceId: string,
    params?: {
      page?: number;
      limit?: number;
      actorUserId?: string;
      feature?: string;
      action?: string;
    },
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: [
        "workspace-token-ledger",
        workspaceId,
        params?.page,
        params?.limit,
        params?.actorUserId,
        params?.feature,
        params?.action,
      ],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await getWorkspaceTokenLedger({
            workspaceId,
            ...params,
          });
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  const useSubscribeWorkspaceBillingPlan = () => {
    return useMutation({
      mutationFn: subscribeWorkspaceBillingPlan,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  const useChangeWorkspaceBillingPlan = () => {
    return useMutation({
      mutationFn: changeWorkspaceBillingPlan,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  const usePurchaseWorkspaceTokens = () => {
    return useMutation({
      mutationFn: purchaseWorkspaceTokens,
      onError: (error) => {
        handleError(error as AxiosError);
      },
    });
  };

  return {
    useWorkspaceBillingPlans,
    useWorkspaceBillingSummary,
    useWorkspaceTokenUsage,
    useWorkspaceTokenLedger,
    useSubscribeWorkspaceBillingPlan,
    useChangeWorkspaceBillingPlan,
    usePurchaseWorkspaceTokens,
  };
};

export default useWorkspaceBilling;
