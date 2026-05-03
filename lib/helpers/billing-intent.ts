import { LOCAL_KEYS, ROUTES } from "@/utils/constants";

export type PendingBillingIntent = {
  plan: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
  source?: string;
  createdAt: string;
};

const isClient = () => typeof window !== "undefined";

export const rememberPendingBillingIntent = (intent: PendingBillingIntent) => {
  if (!isClient()) {
    return;
  }

  try {
    localStorage.setItem(LOCAL_KEYS.PENDING_BILLING_INTENT, JSON.stringify(intent));
  } catch {
    // no-op
  }
};

export const consumePendingBillingIntent = (): PendingBillingIntent | null => {
  if (!isClient()) {
    return null;
  }

  const raw = String(localStorage.getItem(LOCAL_KEYS.PENDING_BILLING_INTENT) || "").trim();
  localStorage.removeItem(LOCAL_KEYS.PENDING_BILLING_INTENT);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingBillingIntent;
    const plan = String(parsed?.plan || "").toUpperCase();

    if (!["FREE", "PRO", "BUSINESS", "ENTERPRISE"].includes(plan)) {
      return null;
    }

    return {
      plan: plan as PendingBillingIntent["plan"],
      source: String(parsed?.source || "landing").trim() || "landing",
      createdAt: String(parsed?.createdAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
};

export const buildBillingRedirectPath = (plan: PendingBillingIntent["plan"]) => {
  const normalizedPlan = String(plan || "FREE").toUpperCase();
  const query = new URLSearchParams({
    plan: normalizedPlan,
    autostart: "1",
    source: "landing",
  });

  return `${ROUTES.SETTINGS_BILLING}?${query.toString()}`;
};
