export type WorkspacePlan =
  | "FREE"
  | "PRO"
  | "BUSINESS"
  | "ENTERPRISE"
  | "STARTER";

export type BillingPlanRecord = {
  key: WorkspacePlan;
  label: string;
  priceLabel: string;
  monthlyAllocation: number;
  isSelfServe: boolean;
  checkoutMode: "none" | "subscription" | "sales";
  stripePriceId: string;
};

export type TokenPackRecord = {
  id: "PACK_10K" | "PACK_25K" | "PACK_75K";
  label: string;
  amountUsdCents: number;
  tokens: number;
  currency: string;
};

export type WorkspaceBillingPlansResponse = {
  message: string;
  provider: string;
  plans: BillingPlanRecord[];
  tokenPacks: TokenPackRecord[];
  stripePrices: Record<string, string>;
};

export type WorkspaceBillingSummaryResponse = {
  message: string;
  workspace: {
    id: string;
    name: string;
    plan: WorkspacePlan;
    tokens: {
      balance: number;
      monthlyAllocation: number;
      lastRefillDate: string | null;
      lowBalanceThreshold: number;
      isLowBalance: boolean;
    };
  };
  subscription: {
    provider: string;
    status: string;
    plan: WorkspacePlan;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    rangeDays: number;
    myUsage: {
      userId: string;
      netTokens: number;
      byFeature: Array<{
        feature: string;
        netTokens: number;
      }>;
    };
    teamUsage: Array<{
      userId: string;
      name: string;
      email: string;
      avatarUrl: string;
      netTokens: number;
    }>;
  };
};

export type WorkspaceBillingCheckoutResponse = {
  message: string;
  checkoutRequired: boolean;
  plan?: WorkspacePlan;
  provider?: string;
  mode?: "sales";
  contactRoute?: string;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  workspace?: {
    plan: WorkspacePlan;
    tokens: {
      balance: number;
      monthlyAllocation: number;
      lastRefillDate?: string;
    };
  };
};

export type WorkspaceTokenPurchaseCheckoutResponse = {
  message: string;
  checkoutRequired: boolean;
  provider: string;
  pack: TokenPackRecord;
  checkoutSessionId: string;
  checkoutUrl: string;
};

export type WorkspaceTokenUsageResponse = {
  message: string;
  range: "7d" | "30d" | "90d" | "180d" | "365d";
  usage: {
    rangeDays: number;
    myUsage: {
      userId: string;
      netTokens: number;
      byFeature: Array<{
        feature: string;
        netTokens: number;
      }>;
    };
    teamUsage: Array<{
      userId: string;
      name: string;
      email: string;
      avatarUrl: string;
      netTokens: number;
    }>;
  };
};

export type WorkspaceTokenLedgerResponse = {
  message: string;
  ledger: Array<{
    id: string;
    workspaceId: string;
    actorUserId: string;
    actorName: string;
    actorEmail: string;
    actorAvatarUrl: string;
    feature: string;
    action: string;
    delta: number;
    balanceBefore: number;
    balanceAfter: number;
    estimateTokens: number;
    actualTokens: number;
    reservationId: string;
    reservationState: string;
    referenceType: string;
    referenceId: string;
    metadata: Record<string, unknown>;
    createdAt: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};
