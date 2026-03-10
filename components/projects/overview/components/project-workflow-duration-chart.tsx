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
          Click a phase to inspect it. The bars compare planned duration against elapsed time.
        </p>
      </div>

      {summaries.length ? (
        <div className="space-y-2 px-3 py-3 md:px-4">
          {summaries.map((summary) => {
            const isSelected = selectedWorkflowId === summary.workflowId;

            return (
              <button
                key={summary.workflowId}
                type="button"
                onClick={() => onSelectWorkflow(summary.workflowId)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-lg px-2.5 py-2 text-left transition-colors md:flex-row md:items-center md:gap-3",
                  isSelected ? "bg-muted/30" : "hover:bg-muted/15",
                )}
              >
                <div className="w-full min-w-0 md:w-40 md:flex-none">
                  <div className="truncate text-[12px] font-medium md:text-[13px]">
                    {summary.label}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {summary.elapsedDays} / {summary.plannedDays} days
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        summary.status === "late" ? "bg-primary" : "bg-foreground/80",
                      )}
                      style={{ width: `${summary.fill}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-12 text-right text-[11px] font-medium">
                    {getVarianceLabel(summary)}
                  </span>
                  <ProjectInfoTip
                    className="shrink-0"
                    align="end"
                    content={`Variance = elapsed days - planned days.${summary.status === "complete" ? " Done means this workflow is completed." : summary.varianceDays < 0 ? " This workflow is currently ahead of schedule." : summary.varianceDays > 0 ? " This workflow is currently behind schedule." : " This workflow is currently on schedule."}`}
                  />
                  <Badge variant="outline" className={STATUS_STYLES[summary.status]}>
                    {getStatusLabel(summary)}
                  </Badge>
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
