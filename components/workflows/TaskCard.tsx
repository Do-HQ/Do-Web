"use client";

import { Activity } from "lucide-react";
import { PiFlagPennantDuotone, PiTimerDuotone, PiUserDuotone } from "react-icons/pi";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/components/projects/overview/utils";

import { WorkflowTaskVisual } from "./WorkflowTabs";

type TaskCardProps = {
  task: WorkflowTaskVisual;
  expanded?: boolean;
  isActive?: boolean;
  onClick: () => void;
};

const TASK_STATUS_META: Record<
  WorkflowTaskVisual["status"],
  { label: string; className: string }
> = {
  todo: {
    label: "Todo",
    className: "border-border/30 bg-muted/40 text-muted-foreground",
  },
  "in-progress": {
    label: "In Progress",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  done: {
    label: "Done",
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
};

const PRIORITY_DOT_CLASS: Record<WorkflowTaskVisual["priority"], string> = {
  low: "bg-sky-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

export function TaskCard({
  task,
  expanded = false,
  isActive = false,
  onClick,
}: TaskCardProps) {
  const statusMeta = TASK_STATUS_META[task.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border border-border/20 bg-card/95 px-2.5 py-2 text-left hover:bg-card",
        isActive ? "border-orange-500/70 ring-1 ring-orange-500/35" : "",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[12px] font-medium leading-5 text-foreground md:text-[13px]">
          {task.title}
        </p>
        <div className="mt-1 flex items-center gap-1">
          {isActive ? (
            <Activity className="size-3 animate-pulse text-orange-500" aria-hidden="true" />
          ) : null}
          <span
            className={cn(
              "size-1.5 rounded-full",
              PRIORITY_DOT_CLASS[task.priority],
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("h-4 rounded-full px-1.5 py-0 text-[10px] font-medium", statusMeta.className)}
        >
          {statusMeta.label}
        </Badge>
        {task.status === "in-progress" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-medium text-orange-500">
            <span className="relative inline-flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500/75 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
            </span>
            Running
          </span>
        ) : null}
        <span className="truncate text-[10px] text-muted-foreground">{task.team}</span>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
          {task.assignee ? (
            <p className="inline-flex items-center gap-1">
              <PiUserDuotone className="size-3.5" />
              {task.assignee}
            </p>
          ) : null}
          {task.dueDate ? (
            <p className="inline-flex items-center gap-1">
              <PiTimerDuotone className="size-3.5" />
              Due {formatShortDate(task.dueDate)}
            </p>
          ) : null}
          <p className="inline-flex items-center gap-1">
            <PiFlagPennantDuotone className="size-3.5" />
            Priority: {task.priority}
          </p>
        </div>
      ) : null}
    </button>
  );
}
