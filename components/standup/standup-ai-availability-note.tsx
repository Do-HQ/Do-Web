"use client";

import { CircleAlert } from "lucide-react";

import useWorkspaceAi from "@/hooks/use-workspace-ai";
import { cn } from "@/lib/utils";

const StandupAiAvailabilityNote = ({
  workspaceId,
  className,
}: {
  workspaceId: string;
  className?: string;
}) => {
  const { useWorkspaceAiStatus } = useWorkspaceAi();
  const aiStatusQuery = useWorkspaceAiStatus(workspaceId, {
    enabled: Boolean(workspaceId),
  });
  const status = aiStatusQuery.data?.data;

  if (aiStatusQuery.isLoading || status?.available !== false) {
    return null;
  }

  const reason =
    String(status?.disabledReason || status?.reason || "").trim() ||
    "Scribe is unavailable right now.";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-[12px] leading-5 text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium text-foreground">
          Scribe is not available right now
        </p>
        <p className="mt-0.5 text-muted-foreground">
          {reason} Standups will still work with Squircle&apos;s built-in question
          builder. AI-polished questions and summaries will resume when Scribe is
          available again.
        </p>
      </div>
    </div>
  );
};

export default StandupAiAvailabilityNote;
