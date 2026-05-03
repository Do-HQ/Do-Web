"use client";

import {
  PiCalendarBlankDuotone,
  PiFlagPennantDuotone,
  PiListChecksDuotone,
  PiUserDuotone,
} from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/components/projects/overview/utils";

import { WORKFLOW_STATUS_META, WorkflowTaskVisual, WorkflowVisual } from "./WorkflowTabs";

type TaskDetailsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowVisual | null;
  task: WorkflowTaskVisual | null;
  onOpenWorkflowDetails?: (workflowId: string) => void;
};

const TASK_STATUS_BADGE_CLASS: Record<WorkflowTaskVisual["status"], string> = {
  todo: "border-border/30 bg-muted/40 text-muted-foreground",
  "in-progress": "border-primary/30 bg-primary/10 text-primary",
  done: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
};

export function TaskDetailsDrawer({
  open,
  onOpenChange,
  workflow,
  task,
  onOpenWorkflowDetails,
}: TaskDetailsDrawerProps) {
  const workflowMeta = workflow ? WORKFLOW_STATUS_META[workflow.status] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[92vw] gap-0 border-l border-border/30 bg-background p-0 text-foreground sm:max-w-[28rem]"
      >
        <SheetHeader className="border-b border-border/30 px-5 py-4">
          <SheetTitle className="line-clamp-2 text-base font-semibold">
            {task?.title || "Task details"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Workflow task details and execution context.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {task ? (
              <Badge
                variant="outline"
                className={TASK_STATUS_BADGE_CLASS[task.status]}
              >
                {task.status === "in-progress"
                  ? "In Progress"
                  : task.status === "done"
                    ? "Done"
                    : "Todo"}
              </Badge>
            ) : null}
            {workflowMeta ? (
              <Badge variant="outline" className={workflowMeta.badgeClass}>
                Workflow: {workflowMeta.label}
              </Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Team
              </p>
              <p className="font-medium">{task?.team || "No team assigned"}</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Assignee
              </p>
              <p className="font-medium">{task?.assignee || "Unassigned"}</p>
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border/30 bg-muted/20 p-3 text-sm">
            <div className="flex items-start gap-2">
              <PiListChecksDuotone className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Workflow</p>
                <p className="font-medium text-foreground">{workflow?.name || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <PiUserDuotone className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assignee</p>
                <p className="font-medium text-foreground">{task?.assignee || "Unassigned"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <PiCalendarBlankDuotone className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Start</p>
                <p className="font-medium text-foreground">
                  {task?.startDate ? formatShortDate(task.startDate) : "No date"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <PiCalendarBlankDuotone className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="font-medium text-foreground">
                  {task?.dueDate ? formatShortDate(task.dueDate) : "No date"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <PiFlagPennantDuotone className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p>
                <p className="font-medium capitalize text-foreground">{task?.priority || "low"}</p>
              </div>
            </div>
          </div>

          {workflow?.id && onOpenWorkflowDetails ? (
            <Button
              type="button"
              className="h-9 w-full rounded-lg"
              onClick={() => {
                onOpenChange(false);
                onOpenWorkflowDetails(workflow.id);
              }}
            >
              Open workflow details
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
