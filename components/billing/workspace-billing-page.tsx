"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Coins,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import {
  buildBillingRedirectPath,
  consumePendingBillingIntent,
} from "@/lib/helpers/billing-intent";
import useWorkspaceStore from "@/stores/workspace";
import type { WorkspacePlan } from "@/types/billing";
import { ROUTES } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PLAN_ORDER: WorkspacePlan[] = [
  "FREE",
  "STARTER",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const formatCurrency = (amountUsdCents: number) => {
  const dollars = Number(amountUsdCents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(dollars);
};

const parsePlanFromValue = (value: string): WorkspacePlan | "" => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["FREE", "PRO", "BUSINESS", "ENTERPRISE"].includes(normalized)) {
    return normalized as WorkspacePlan;
  }

  return "";
};

const WorkspaceBillingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const permissions = useWorkspacePermissions();
  const workspaceBilling = useWorkspaceBilling();

  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const [usageRange, setUsageRange] = useState<
    "7d" | "30d" | "90d" | "180d" | "365d"
  >("30d");
  const [checkoutWizardOpen, setCheckoutWizardOpen] = useState(false);
  const [wizardPlan, setWizardPlan] = useState<WorkspacePlan | "">("");

  const plansQuery = workspaceBilling.useWorkspaceBillingPlans(
    normalizedWorkspaceId,
    {
      enabled: !!normalizedWorkspaceId,
    },
  );
  const summaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    normalizedWorkspaceId,
    {
      rangeDays:
        usageRange === "7d"
          ? 7
          : usageRange === "90d"
            ? 90
            : usageRange === "180d"
              ? 180
              : usageRange === "365d"
                ? 365
                : 30,
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );
  const usageQuery = workspaceBilling.useWorkspaceTokenUsage(
    normalizedWorkspaceId,
    { range: usageRange },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );
  const ledgerQuery = workspaceBilling.useWorkspaceTokenLedger(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 12,
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const subscribeMutation = workspaceBilling.useSubscribeWorkspaceBillingPlan();
  const purchaseMutation = workspaceBilling.usePurchaseWorkspaceTokens();

  const isAdminLike = permissions.isAdminLike;
  const canManageBilling = isAdminLike;
  const summary = summaryQuery.data?.data;
  const plans = plansQuery.data?.data?.plans || [];
  const tokenPacks = plansQuery.data?.data?.tokenPacks || [];
  const usage = usageQuery.data?.data?.usage;
  const ledger = ledgerQuery.data?.data?.ledger || [];

  const currentPlan = (summary?.workspace?.plan || "FREE") as WorkspacePlan;

  const sortedPlans = useMemo(() => {
    const map = new Map(plans.map((entry) => [entry.key, entry]));
    return PLAN_ORDER.map((plan) => map.get(plan)).filter(Boolean);
  }, [plans]);

  const invalidateBillingData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-billing-summary", normalizedWorkspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-billing-plans", normalizedWorkspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-token-usage", normalizedWorkspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-token-ledger", normalizedWorkspaceId],
      }),
    ]);
  }, [normalizedWorkspaceId, queryClient]);

  useEffect(() => {
    const checkoutStatus = String(searchParams?.get("checkout") || "")
      .trim()
      .toLowerCase();
    if (!checkoutStatus || !normalizedWorkspaceId) {
      return;
    }

    if (checkoutStatus === "success") {
      toast.success("Checkout completed. Syncing billing state...");
      void invalidateBillingData();
    } else if (checkoutStatus === "cancel") {
      toast.message("Checkout canceled.");
    }

    const nextQuery = new URLSearchParams(searchParams?.toString() || "");
    nextQuery.delete("checkout");
    nextQuery.delete("plan");
    nextQuery.delete("autostart");
    nextQuery.delete("source");
    const nextSuffix = nextQuery.toString() ? `?${nextQuery.toString()}` : "";
    router.replace(`${ROUTES.SETTINGS_BILLING}${nextSuffix}`);
  }, [invalidateBillingData, normalizedWorkspaceId, router, searchParams]);

  useEffect(() => {
    const requestedPlan = parsePlanFromValue(
      String(searchParams?.get("plan") || ""),
    );
    const autoStart = String(searchParams?.get("autostart") || "") === "1";

    if (requestedPlan && autoStart) {
      setWizardPlan(requestedPlan);
      setCheckoutWizardOpen(true);
      return;
    }

    if (!requestedPlan && typeof window !== "undefined") {
      const pending = consumePendingBillingIntent();
      if (pending?.plan) {
        router.replace(buildBillingRedirectPath(pending.plan));
      }
    }
  }, [router, searchParams]);

  const handlePlanAction = async (plan: WorkspacePlan) => {
    if (!normalizedWorkspaceId || !isAdminLike) {
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const successUrl = `${origin}${ROUTES.SETTINGS_BILLING}?checkout=success`;
    const cancelUrl = `${origin}${ROUTES.SETTINGS_BILLING}?checkout=cancel`;

    const requestPromise = subscribeMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      plan,
      successUrl,
      cancelUrl,
    });

    await toast.promise(requestPromise, {
      loading:
        plan === "FREE" ? "Switching to Free plan..." : "Preparing checkout...",
      success: (result) => result?.data?.message || "Billing action completed.",
      error: "We could not start this billing action.",
    });
    const response = await requestPromise;

    const payload = response?.data;
    if (payload?.checkoutRequired && payload?.checkoutUrl) {
      if (typeof window !== "undefined") {
        window.location.assign(payload.checkoutUrl);
      }
      return;
    }

    if (payload?.mode === "sales") {
      router.push(payload?.contactRoute || "/support");
      return;
    }

    await invalidateBillingData();
  };

  const handlePurchasePack = async (
    packId: "PACK_10K" | "PACK_25K" | "PACK_75K",
  ) => {
    if (!normalizedWorkspaceId || !isAdminLike) {
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const successUrl = `${origin}${ROUTES.SETTINGS_BILLING}?checkout=success`;
    const cancelUrl = `${origin}${ROUTES.SETTINGS_BILLING}?checkout=cancel`;

    const requestPromise = purchaseMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      packId,
      successUrl,
      cancelUrl,
    });

    await toast.promise(requestPromise, {
      loading: "Preparing token checkout...",
      success: (result) => result?.data?.message || "Checkout created.",
      error: "We could not start token purchase.",
    });
    const response = await requestPromise;

    const payload = response?.data;
    if (
      payload?.checkoutRequired &&
      payload?.checkoutUrl &&
      typeof window !== "undefined"
    ) {
      window.location.assign(payload.checkoutUrl);
      return;
    }

    await invalidateBillingData();
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Plan & Billing
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your workspace subscription and shared AI token wallet.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void invalidateBillingData();
          }}
        >
          Refresh
        </Button>
      </div>

      {summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Subscription</CardTitle>
              <CardDescription>
                Current workspace plan and renewal status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge>{summary?.workspace?.plan || "FREE"}</Badge>
                <Badge variant="outline">
                  {summary?.subscription?.status || "INACTIVE"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Current period end:{" "}
                {formatDateTime(summary?.subscription?.currentPeriodEnd)}
              </p>
              <p className="text-muted-foreground">
                Cancel at period end:{" "}
                {summary?.subscription?.cancelAtPeriodEnd ? "Yes" : "No"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">AI token wallet</CardTitle>
              <CardDescription>
                Shared workspace balance for Scribe, reports, and draft
                generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold">
                  {Number(
                    summary?.workspace?.tokens?.balance || 0,
                  ).toLocaleString()}
                </span>
                <span className="text-muted-foreground pb-1 text-xs">
                  tokens remaining
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                Monthly allocation:{" "}
                {Number(
                  summary?.workspace?.tokens?.monthlyAllocation || 0,
                ).toLocaleString()}{" "}
                tokens
              </p>
              <p className="text-muted-foreground text-sm">
                Last refill:{" "}
                {formatDateTime(summary?.workspace?.tokens?.lastRefillDate)}
              </p>
              {summary?.workspace?.tokens?.isLowBalance ? (
                <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
                  Low token balance. Top up now to avoid AI action blocks.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {!canManageBilling ? (
        <Card className="border-border/70">
          <CardContent className="py-3">
            <div className="text-muted-foreground flex items-start gap-2 text-sm">
              <ShieldCheck className="mt-0.5 size-4" />
              Workspace owners and admins can manage plan upgrades and token
              top-ups. You can still view usage and wallet status here.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Plans</CardTitle>
            <CardDescription>
              Upgrade, downgrade, or contact sales for Enterprise.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {plansQuery.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`plan-skeleton-${index + 1}`}
                    className="h-40 w-full"
                  />
                ))
              : sortedPlans.map((plan) => {
                  if (!plan) {
                    return null;
                  }

                  const isCurrent = currentPlan === plan.key;
                  const isBusy = subscribeMutation.isPending;
                  const hasCheckoutConfig =
                    plan.checkoutMode !== "subscription" ||
                    Boolean(String(plan.stripePriceId || "").trim());

                  return (
                    <div
                      key={plan.key}
                      className={cn(
                        "rounded-lg border border-border/70 p-3",
                        isCurrent && "ring-primary/20 border-primary/45 ring-1",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{plan.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {plan.priceLabel}
                          </p>
                        </div>
                        {isCurrent ? <Badge>Current</Badge> : null}
                      </div>

                      <p className="text-muted-foreground mb-3 text-xs">
                        {Number(plan.monthlyAllocation || 0).toLocaleString()}{" "}
                        tokens / month
                      </p>
                      {plan.checkoutMode === "subscription" &&
                      !hasCheckoutConfig ? (
                        <p className="text-amber-700 dark:text-amber-300 mb-3 text-[11px]">
                          Checkout is not configured for this plan in this
                          environment yet.
                        </p>
                      ) : null}

                      <Button
                        size="sm"
                        variant={isCurrent ? "outline" : "default"}
                        className="w-full"
                        disabled={
                          !canManageBilling ||
                          isBusy ||
                          !hasCheckoutConfig ||
                          (isCurrent && plan.key !== "FREE")
                        }
                        onClick={() => {
                          void handlePlanAction(plan.key);
                        }}
                      >
                        {plan.checkoutMode === "sales"
                          ? "Contact sales"
                          : isCurrent
                            ? "Current plan"
                            : "Select plan"}
                      </Button>
                    </div>
                  );
                })}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Top up tokens</CardTitle>
            <CardDescription>
              Buy one-time token packs for extra AI usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {tokenPacks.map((pack) => (
              <div
                key={pack.id}
                className="rounded-lg border border-border/70 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{pack.label}</p>
                  <Badge variant="outline">
                    {formatCurrency(pack.amountUsdCents)}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!canManageBilling || purchaseMutation.isPending}
                  onClick={() => {
                    void handlePurchasePack(pack.id);
                  }}
                >
                  <CreditCard className="size-3.5" />
                  Buy pack
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Usage analytics</CardTitle>
                <CardDescription>
                  Track personal and team AI token consumption.
                </CardDescription>
              </div>
              <div className="w-28">
                <Label className="sr-only">Range</Label>
                <Select
                  value={usageRange}
                  onValueChange={(value) =>
                    setUsageRange(
                      value as "7d" | "30d" | "90d" | "180d" | "365d",
                    )
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                    <SelectItem value="90d">Last 90d</SelectItem>
                    <SelectItem value="180d">Last 180d</SelectItem>
                    <SelectItem value="365d">Last 365d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageQuery.isLoading ? (
              <Skeleton className="h-30 w-full" />
            ) : (
              <>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-muted-foreground text-xs">
                    My usage ({usageRange})
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {Number(usage?.myUsage?.netTokens || 0).toLocaleString()}{" "}
                    tokens
                  </p>
                </div>

                <div className="space-y-2">
                  {(usage?.myUsage?.byFeature || []).map((row) => (
                    <div
                      key={row.feature}
                      className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {row.feature.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium">
                        {Number(row.netTokens || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {isAdminLike && usage?.teamUsage?.length ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-muted-foreground text-xs">
                      Top team usage
                    </p>
                    {usage.teamUsage.slice(0, 8).map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-sm"
                      >
                        <span className="truncate pr-3">{member.name}</span>
                        <span className="font-medium">
                          {Number(member.netTokens || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Recent ledger</CardTitle>
            <CardDescription>
              Latest token reserve, reconcile, refund, and top-up records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ledgerQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : ledger.length ? (
              ledger.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-medium">{entry.action}</p>
                    <p className="text-muted-foreground truncate">
                      {entry.feature.replace(/_/g, " ")} ·{" "}
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      entry.delta < 0 ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed border-border/70 px-3 py-5 text-center text-sm">
                No ledger entries yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={checkoutWizardOpen} onOpenChange={setCheckoutWizardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Continue billing setup</DialogTitle>
            <DialogDescription>
              You selected the <strong>{wizardPlan || ""}</strong> plan.
              Continue to checkout to activate it for this workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Coins className="size-4" />
              Billing wizard
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              Subscription controls feature tier and monthly allocation. Token
              packs can be purchased any time for additional AI usage.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCheckoutWizardOpen(false)}
            >
              Later
            </Button>
            <Button
              onClick={() => {
                if (!wizardPlan) {
                  return;
                }

                setCheckoutWizardOpen(false);
                void handlePlanAction(wizardPlan);
              }}
              disabled={!wizardPlan || subscribeMutation.isPending}
            >
              <ArrowUpRight className="size-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!normalizedWorkspaceId ? (
        <Card className="border-border/70">
          <CardContent className="py-8">
            <div className="text-muted-foreground flex items-start gap-2 text-sm">
              <AlertCircle className="mt-0.5 size-4" />
              Select a workspace to manage plan and token settings.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default WorkspaceBillingPage;
