"use client";

import { Fragment } from "react";
import { Calendar, ChevronRight, Users } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/components/projects/overview/utils";

import { WORKFLOW_STATUS_META, WorkflowVisual } from "./WorkflowTabs";

type WorkflowGraphProps = {
  workflows: WorkflowVisual[];
  selectedWorkflowId: string | null;
  activeWorkflowId: string | null;
  onSelectWorkflow: (workflowId: string) => void;
};

export function WorkflowGraph({
  workflows,
  selectedWorkflowId,
  activeWorkflowId,
  onSelectWorkflow,
}: WorkflowGraphProps) {
  const completedNodes = workflows.filter((workflow) => workflow.progress >= 100).length;
  const pipelineProgress = workflows.length
    ? Math.round((completedNodes / workflows.length) * 100)
    : 0;
  const activeWorkflowIndex = workflows.findIndex(
    (workflow) => workflow.id === activeWorkflowId,
  );

  return (
    <div className="rounded-xl border border-border/20 bg-background/80 p-2.5">
      <div className="mb-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-foreground">Pipeline progress</p>
          <p className="text-[11px] text-muted-foreground">
            {completedNodes}/{workflows.length || 0} workflows completed
          </p>
        </div>
        <div className="overflow-x-auto pb-0.5">
          <div className="inline-flex min-w-max items-center gap-1.5 rounded-lg border border-border/25 bg-muted/20 p-1">
            {workflows.map((workflow, index) => {
              const statusMeta = WORKFLOW_STATUS_META[workflow.status];
              const isActiveWorkflow = index === activeWorkflowIndex;

              return (
                <div
                  key={`${workflow.id}-segment`}
                  className={cn(
                    "relative h-2.5 w-14 overflow-hidden rounded-full border border-border/35 bg-muted/55",
                    isActiveWorkflow ? "border-orange-400/75" : "",
                  )}
                  aria-label={`${workflow.name} progress ${workflow.progress}%`}
                >
                  <div
                    className={cn("h-full rounded-full", statusMeta.progressClass)}
                    style={{ width: `${workflow.progress}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Quick
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-sky-500" aria-hidden="true" />
            Average
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Delayed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" />
            Late
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-orange-400" aria-hidden="true" />
            Active
          </span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2 pr-2">
          {workflows.map((workflow, index) => {
            const statusMeta = WORKFLOW_STATUS_META[workflow.status];
            const selected = selectedWorkflowId === workflow.id;
            const active = activeWorkflowId === workflow.id;

            return (
              <Fragment key={workflow.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelectWorkflow(workflow.id)}
                      className={cn(
                        "w-52 rounded-xl border border-border/15 p-2 text-left outline-none transition-colors hover:bg-card focus-visible:outline-none",
                        active
                          ? "border-orange-400/80 shadow-[0_0_0_2px_rgba(251,146,60,0.34)]"
                          : selected
                            ? "border-orange-400/45"
                            : "",
                        statusMeta.surfaceClass,
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <span
                            className={cn("size-2 rounded-full", statusMeta.dotClass)}
                            aria-hidden="true"
                          />
                          {active ? (
                            <span
                              className="relative mr-0.5 inline-flex size-2.5"
                              aria-hidden="true"
                            >
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400/70 opacity-80" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400" />
                            </span>
                          ) : null}
                          {statusMeta.label}
                        </div>
                        <span className="text-[11px] font-medium text-foreground/90">
                          {workflow.progress}%
                        </span>
                      </div>

                      <p className="line-clamp-1 text-[13px] font-medium text-foreground">
                        {workflow.name}
                      </p>

                      <div className="mt-2 h-1.5 rounded-full bg-muted/60">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            statusMeta.progressClass,
                          )}
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    sideOffset={8}
                    showArrow={false}
                    className="max-w-xs rounded-lg border border-border/30 bg-popover px-3 py-2 text-[12px]"
                  >
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">{workflow.name}</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          Start: {formatShortDate(workflow.startDate)}
                        </p>
                        <p className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          Expected: {formatShortDate(workflow.endDate)}
                        </p>
                        <p>Progress: {workflow.progress}%</p>
                        <p className="inline-flex items-center gap-1">
                          <Users className="size-3.5" />
                          Teams: {workflow.teams.join(", ") || "No team assigned"}
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {index < workflows.length - 1 ? (
                  <div className="inline-flex items-center px-1 text-muted-foreground/80">
                    <ChevronRight className="size-4" />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
