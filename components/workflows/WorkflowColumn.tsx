"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { TaskCard } from "./TaskCard";
import { WORKFLOW_STATUS_META, WorkflowVisual } from "./WorkflowTabs";

type WorkflowColumnProps = {
  workflow: WorkflowVisual;
  isSelected: boolean;
  isActive: boolean;
  activeTaskId?: string | null;
  onSelect: () => void;
  onOpenWorkflowDetails: () => void;
  onSelectTask: (workflowId: string, taskId: string) => void;
};

export function WorkflowColumn({
  workflow,
  isSelected,
  isActive,
  activeTaskId = null,
  onSelect,
  onOpenWorkflowDetails,
  onSelectTask,
}: WorkflowColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = WORKFLOW_STATUS_META[workflow.status];
  const orderedTasks = useMemo(() => {
    const statusRank = {
      "in-progress": 0,
      todo: 1,
      done: 2,
    } as const;
    const priorityRank = {
      high: 0,
      medium: 1,
      low: 2,
    } as const;

    return [...workflow.tasks].sort((a, b) => {
      const byStatus = statusRank[a.status] - statusRank[b.status];
      if (byStatus !== 0) {
        return byStatus;
      }

      const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
      if (byPriority !== 0) {
        return byPriority;
      }

      return a.title.localeCompare(b.title);
    });
  }, [workflow.tasks]);
  const inferredRunningTaskId = useMemo(
    () => orderedTasks.find((task) => task.status === "in-progress")?.id ?? null,
    [orderedTasks],
  );
  const effectiveActiveTaskId = activeTaskId ?? inferredRunningTaskId;
  const visibleTasks = expanded ? orderedTasks : orderedTasks.slice(0, 3);
  const hiddenCount = Math.max(0, orderedTasks.length - 3);

  return (
    <article
      className={cn(
        "w-[15rem] shrink-0 rounded-xl border border-border/20 p-2 outline-none focus-visible:outline-none",
        statusMeta.surfaceClass,
        isActive
          ? "border-orange-500/80 shadow-[0_0_0_2px_rgba(249,115,22,0.36)]"
          : "",
        !isActive && isSelected ? "border-orange-500/45" : "",
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${workflow.name}`}
    >
      <div className="mb-2 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {isActive ? (
                <span className="relative inline-flex size-2.5 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500/70 opacity-80" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
                </span>
              ) : null}
              <p className="line-clamp-1 text-[12px] font-semibold leading-5 text-foreground md:text-[13px]">
                {workflow.name}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("h-5 rounded-full px-1.5 text-[10px] font-medium", statusMeta.badgeClass)}
            >
              {statusMeta.label}
            </Badge>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenWorkflowDetails();
            }}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/70 text-muted-foreground hover:text-foreground"
            aria-label={`View ${workflow.name} details`}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="space-y-0.5">
          <div className="h-1.5 rounded-full bg-muted/60">
            <div
              className={cn("h-full rounded-full", statusMeta.progressClass)}
              style={{ width: `${workflow.progress}%` }}
            />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">{workflow.progress}% complete</p>
        </div>

        <div className="inline-flex max-w-full items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="size-3.5 shrink-0" />
          <span className="truncate">
            {workflow.teams.length ? workflow.teams.join(" · ") : "No team assigned"}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {orderedTasks.length ? (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={isSelected}
              isActive={effectiveActiveTaskId === task.id}
              onClick={() => onSelectTask(workflow.id, task.id)}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/30 bg-background/60 px-2.5 py-3 text-center text-[12px] text-muted-foreground">
            No tasks in this workflow yet.
          </div>
        )}

        {hiddenCount > 0 ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-background/70 px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            <ChevronDown
              className={cn(
                "size-3",
                expanded ? "rotate-180" : "",
              )}
            />
            {expanded ? "Show less tasks" : `Show ${hiddenCount} more task${hiddenCount > 1 ? "s" : ""}`}
          </button>
        ) : null}
      </div>
    </article>
  );
}
