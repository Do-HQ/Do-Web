"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, WifiOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConnectionLike = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type NetworkState = {
  status: "ok" | "offline" | "poor";
  title: string;
  description: string;
  key: string;
};

type NetworkViewState = NetworkState & {
  issueId: number;
};

const getConnection = () => {
  if (typeof navigator === "undefined") return null;

  return (
    (navigator as Navigator & { connection?: ConnectionLike }).connection ||
    (navigator as Navigator & { mozConnection?: ConnectionLike })
      .mozConnection ||
    (navigator as Navigator & { webkitConnection?: ConnectionLike })
      .webkitConnection ||
    null
  );
};

const getNetworkState = (): NetworkState => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      status: "offline",
      title: "You appear to be offline",
      description:
        "Squircle will keep trying, but saving and loading may pause until your connection returns.",
      key: "offline",
    };
  }

  const connection = getConnection();
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  const downlink = Number(connection?.downlink || 0);
  const rtt = Number(connection?.rtt || 0);
  const saveData = Boolean(connection?.saveData);
  const isPoor =
    ["slow-2g", "2g"].includes(effectiveType) ||
    (downlink > 0 && downlink <= 0.6) ||
    rtt >= 1200 ||
    saveData;

  if (isPoor) {
    return {
      status: "poor",
      title: "Poor network connectivity",
      description:
        "Some actions may take longer than usual. We will keep syncing automatically.",
      key: `poor:${effectiveType || "unknown"}:${saveData ? "save-data" : "normal"}`,
    };
  }

  return {
    status: "ok",
    title: "",
    description: "",
    key: "ok",
  };
};

export default function NetworkConnectivityBanner({
  className,
}: {
  className?: string;
}) {
  const [networkState, setNetworkState] = useState<NetworkViewState>(() => ({
    ...getNetworkState(),
    issueId: 0,
  }));
  const [dismissedIssueId, setDismissedIssueId] = useState<number | null>(null);

  useEffect(() => {
    const updateState = () => {
      const nextState = getNetworkState();

      setNetworkState((previousState) => {
        const shouldCreateNewIssue =
          nextState.status !== "ok" &&
          (previousState.status === "ok" ||
            previousState.key !== nextState.key);

        return {
          ...nextState,
          issueId: shouldCreateNewIssue
            ? previousState.issueId + 1
            : previousState.issueId,
        };
      });
    };
    const connection = getConnection();

    window.addEventListener("online", updateState);
    window.addEventListener("offline", updateState);
    connection?.addEventListener?.("change", updateState);

    const interval = window.setInterval(updateState, 15_000);

    return () => {
      window.removeEventListener("online", updateState);
      window.removeEventListener("offline", updateState);
      connection?.removeEventListener?.("change", updateState);
      window.clearInterval(interval);
    };
  }, []);

  const Icon = useMemo(
    () => (networkState.status === "offline" ? WifiOff : AlertTriangle),
    [networkState.status],
  );

  if (
    networkState.status === "ok" ||
    dismissedIssueId === networkState.issueId
  ) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "z-30 shrink-0 bg-destructive/10 px-3 py-2 text-destructive shadow-xs",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-start gap-2">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-destructive/20 bg-background/70">
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-4">
            {networkState.title}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-destructive/80">
            {networkState.description}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Dismiss network warning"
          onClick={() => setDismissedIssueId(networkState.issueId)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
