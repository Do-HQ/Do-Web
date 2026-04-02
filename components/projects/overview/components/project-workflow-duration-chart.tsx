import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

import { ProjectWorkflowTimingSummary } from "../types";
import { ProjectInfoTip } from "./project-info-tip";
import { ProjectProgressRing } from "./project-progress-ring";

type ProjectWorkflowDurationChartProps = {
  summaries: ProjectWorkflowTimingSummary[];
  selectedWorkflowId: string | null;
  onSelectWorkflow: (workflowId: string) => void;
};

const STATUS_STYLES: Record<ProjectWorkflowTimingSummary["status"], string> = {
  "on-time": "border-border bg-muted/50 text-foreground",
  ahead: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  late: "border-primary/20 bg-primary/10 text-primary",
  complete: "border-border bg-muted/40 text-muted-foreground",
};

const STATUS_META: Record<
  ProjectWorkflowTimingSummary["status"],
  {
    ringTone: "good" | "warning" | "danger" | "info";
    textClass: string;
    note: string;
  }
> = {
  "on-time": {
    ringTone: "info",
    textClass: "text-foreground",
    note: "On pace",
  },
  ahead: {
    ringTone: "good",
    textClass: "text-emerald-600 dark:text-emerald-300",
    note: "Ahead",
  },
  late: {
    ringTone: "danger",
    textClass: "text-primary",
    note: "Delayed",
  },
  complete: {
    ringTone: "good",
    textClass: "text-muted-foreground",
    note: "Completed",
  },
};

function getVarianceLabel(summary: ProjectWorkflowTimingSummary) {
  if (summary.status === "complete") {
    return "Done";
  }

  if (summary.varianceDays > 0) {
    return `+${summary.varianceDays}d`;
  }

  if (summary.varianceDays < 0) {
    return `${summary.varianceDays}d`;
  }

  return "On time";
}

function getStatusLabel(summary: ProjectWorkflowTimingSummary) {
  switch (summary.status) {
    case "ahead":
      return "Ahead";
    case "late":
      return "Late";
    case "complete":
      return "Complete";
    default:
      return "On time";
  }
}

export function ProjectWorkflowDurationChart({
  summaries,
  selectedWorkflowId,
  onSelectWorkflow,
}: ProjectWorkflowDurationChartProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      <div className="border-b border-border/35 px-3 py-3 md:px-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[14px] font-semibold md:text-[15px]">Phase timing</h2>
          <ProjectInfoTip content="Compares planned duration with elapsed duration. Negative variance is ahead of schedule, positive variance is delayed." />
        </div>
        <p className="text-muted-foreground text-[12px] leading-5">
          Click a phase to inspect it. Rings compare elapsed duration to the planned timeline.
        </p>
      </div>

      {summaries.length ? (
        <div className="space-y-2 px-3 py-3 md:px-4">
          {summaries.map((summary) => {
            const isSelected = selectedWorkflowId === summary.workflowId;
            const statusMeta = STATUS_META[summary.status];

            return (
              <button
                key={summary.workflowId}
                type="button"
                onClick={() => onSelectWorkflow(summary.workflowId)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-lg px-2.5 py-2 text-left transition-colors md:flex-row md:items-center md:gap-3",
                  isSelected ? "bg-muted/30" : "hover:bg-muted/15",
                )}
              >
                <div className="w-full min-w-0 md:w-40 md:flex-none">
                  <div className="truncate text-[12px] font-medium md:text-[13px]">
                    {summary.label}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {summary.elapsedDays} / {summary.plannedDays} days elapsed
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ProjectProgressRing
                      value={summary.fill}
                      tone={statusMeta.ringTone}
                      size={32}
                      strokeWidth={3.25}
                      textClassName="text-[9px]"
                    />
                    <div className="min-w-0 leading-tight">
                      <div
                        className={cn(
                          "text-[11px] font-semibold",
                          statusMeta.textClass,
                        )}
                      >
                        {getVarianceLabel(summary)}
                      </div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        {statusMeta.note}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProjectInfoTip
                      className="shrink-0"
                      align="end"
                      content={`Variance = elapsed days - planned days.${summary.status === "complete" ? " Done means this workflow is completed." : summary.varianceDays < 0 ? " This workflow is currently ahead of schedule." : summary.varianceDays > 0 ? " This workflow is currently behind schedule." : " This workflow is currently on schedule."}`}
                    />
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[summary.status]}
                    >
                      {getStatusLabel(summary)}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-3 md:px-4">
          <Empty className="border-0 p-0 md:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Timer className="size-4 text-primary/85" />
              </EmptyMedia>
              <EmptyDescription className="text-[12px]">
                No workflow timing data is available in this scope.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </section>
  );
}
