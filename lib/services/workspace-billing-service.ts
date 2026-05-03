import axiosInstance from ".";
import {
  WorkspaceBillingCheckoutResponse,
  WorkspaceBillingPlansResponse,
  WorkspaceBillingSummaryResponse,
  WorkspaceTokenLedgerResponse,
  WorkspaceTokenPurchaseCheckoutResponse,
  WorkspaceTokenUsageResponse,
  WorkspacePlan,
} from "@/types/billing";

const WORKSPACE_BILLING_ENDPOINTS = {
  plans: (workspaceId: string) => `/workspace/${workspaceId}/billing/plans`,
  summary: (workspaceId: string) => `/workspace/${workspaceId}/billing/summary`,
  subscribe: (workspaceId: string) => `/workspace/${workspaceId}/billing/subscribe`,
  changePlan: (workspaceId: string) => `/workspace/${workspaceId}/billing/change-plan`,
  purchaseTokens: (workspaceId: string) => `/workspace/${workspaceId}/tokens/purchase`,
  tokenUsage: (workspaceId: string) => `/workspace/${workspaceId}/tokens/usage`,
  tokenLedger: (workspaceId: string) => `/workspace/${workspaceId}/tokens/ledger`,
};

export const listWorkspaceBillingPlans = async (workspaceId: string) => {
  return await axiosInstance.get<WorkspaceBillingPlansResponse>(
    WORKSPACE_BILLING_ENDPOINTS.plans(workspaceId),
  );
};

export const getWorkspaceBillingSummary = async (data: {
  workspaceId: string;
  rangeDays?: number;
}) => {
  return await axiosInstance.get<WorkspaceBillingSummaryResponse>(
    WORKSPACE_BILLING_ENDPOINTS.summary(data.workspaceId),
    {
      params:
        typeof data.rangeDays === "number" && Number.isFinite(data.rangeDays)
          ? { rangeDays: data.rangeDays }
          : undefined,
    },
  );
};

export const subscribeWorkspaceBillingPlan = async (data: {
  workspaceId: string;
  plan: WorkspacePlan;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  return await axiosInstance.post<WorkspaceBillingCheckoutResponse>(
    WORKSPACE_BILLING_ENDPOINTS.subscribe(data.workspaceId),
    {
      plan: data.plan,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    },
  );
};

export const changeWorkspaceBillingPlan = async (data: {
  workspaceId: string;
  plan: WorkspacePlan;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  return await axiosInstance.post<WorkspaceBillingCheckoutResponse>(
    WORKSPACE_BILLING_ENDPOINTS.changePlan(data.workspaceId),
    {
      plan: data.plan,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    },
  );
};

export const purchaseWorkspaceTokens = async (data: {
  workspaceId: string;
  packId: "PACK_10K" | "PACK_25K" | "PACK_75K";
  successUrl?: string;
  cancelUrl?: string;
}) => {
  return await axiosInstance.post<WorkspaceTokenPurchaseCheckoutResponse>(
    WORKSPACE_BILLING_ENDPOINTS.purchaseTokens(data.workspaceId),
    {
      packId: data.packId,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    },
  );
};

export const getWorkspaceTokenUsage = async (data: {
  workspaceId: string;
  range?: "7d" | "30d" | "90d" | "180d" | "365d";
}) => {
  return await axiosInstance.get<WorkspaceTokenUsageResponse>(
    WORKSPACE_BILLING_ENDPOINTS.tokenUsage(data.workspaceId),
    {
      params: {
        range: data.range || "30d",
      },
    },
  );
};

export const getWorkspaceTokenLedger = async (data: {
  workspaceId: string;
  page?: number;
  limit?: number;
  actorUserId?: string;
  feature?: string;
  action?: string;
}) => {
  return await axiosInstance.get<WorkspaceTokenLedgerResponse>(
    WORKSPACE_BILLING_ENDPOINTS.tokenLedger(data.workspaceId),
    {
      params: {
        page: data.page || 1,
        limit: data.limit || 25,
        actorUserId: data.actorUserId || "",
        feature: data.feature || "",
        action: data.action || "",
      },
    },
  );
};
