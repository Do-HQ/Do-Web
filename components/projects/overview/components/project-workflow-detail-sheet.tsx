"use client";

import { CalendarDays, ClipboardList, Layers3, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  ProjectMember,
  ProjectTeamSummary,
  ProjectWorkflow,
  ProjectWorkflowTimingSummary,
} from "../types";
import {
  formatShortDate,
  getSubtaskCompletionSummary,
  getTaskCompletionSummary,
  getTaskRowProgress,
  getTaskStatusLabel,
  getWorkflowStatusLabel,
  resolveMemberById,
} from "../utils";

type ProjectWorkflowDetailSheetProps = {
  open: boolean;
  workflow: ProjectWorkflow | null;
  timingSummary: ProjectWorkflowTimingSummary | null;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  onOpenChange: (open: boolean) => void;
  onAddTask: (workflowId: string) => void;
  onEditWorkflow: (workflowId: string) => void;
};

const STATUS_STYLES: Record<ProjectWorkflow["status"], string> = {
  "on-track": "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "at-risk": "border-primary/20 bg-primary/10 text-primary",
  blocked: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  complete: "border-border bg-muted/40 text-muted-foreground",
};

function getTimingLabel(summary: ProjectWorkflowTimingSummary | null) {
  if (!summary) {
    return "No timing data";
  }

  if (summary.status === "complete") {
    return "Completed";
  }

  if (summary.status === "ahead") {
    return `${Math.abs(summary.varianceDays)}d ahead`;
  }

  if (summary.status === "late") {
    return `${summary.varianceDays}d late`;
  }

  return "On time";
}

export function ProjectWorkflowDetailSheet({
  open,
  workflow,
  timingSummary,
  members,
  teams,
  onOpenChange,
  onAddTask,
  onEditWorkflow,
}: ProjectWorkflowDetailSheetProps) {
  const owner = workflow ? resolveMemberById(members, workflow.ownerId) : null;
  const team = workflow ? teams.find((item) => item.id === workflow.teamId) : null;
  const taskSummary = workflow ? getTaskCompletionSummary(workflow.tasks) : null;
  const subtaskSummary = workflow
    ? getSubtaskCompletionSummary(workflow.tasks.flatMap((task) => task.subtasks ?? []))
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-[30rem] lg:max-w-[34rem]">
        <SheetHeader className="gap-3 border-b border-border/35 pb-4">
          <div className="space-y-1">
            <SheetTitle className="text-[16px]">Workflow details</SheetTitle>
            <SheetDescription className="text-[12.5px] leading-5">
              Inspect the selected workflow, then jump into task or workflow edits without leaving the table.
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {workflow ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border border-border/35 bg-muted/15 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[15px] font-semibold">{workflow.name}</div>
                  <Badge variant="outline" className={STATUS_STYLES[workflow.status]}>
                    {getWorkflowStatusLabel(workflow.status)}
                  </Badge>
                </div>
                {workflow.description ? (
                  <div className="text-muted-foreground text-[12px] leading-5">
                    {workflow.description}
                  </div>
                ) : null}
                <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-3.5" />
                    <span>{owner?.name ?? "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers3 className="size-3.5" />
                    <span>{team?.name ?? "No team"}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <CalendarDays className="size-3.5" />
                    <span>{workflow.dueWindow}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/35 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-medium">Progress</div>
                  <div className="text-[13px] font-semibold">{workflow.progress}%</div>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${workflow.progress}%` }} />
                </div>
                <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2">
                  <div>
                    {taskSummary?.total ?? 0} tasks • {taskSummary?.done ?? 0} done • {taskSummary?.blocked ?? 0} blocked
                  </div>
                  <div>
                    {subtaskSummary?.total ?? 0} subtasks • {subtaskSummary?.done ?? 0} done
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/35 bg-background/80 p-4">
                <div className="text-[13px] font-medium">Timing</div>
                <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/35 px-3 py-2">
                    <div>Started</div>
                    <div className="text-foreground">{formatShortDate(workflow.startedAt)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/35 px-3 py-2">
                    <div>Target end</div>
                    <div className="text-foreground">{formatShortDate(workflow.targetEndDate)}</div>
                  </div>
                  {workflow.completedAt ? (
                    <div className="rounded-lg bg-muted/35 px-3 py-2">
                      <div>Completed</div>
                      <div className="text-foreground">{formatShortDate(workflow.completedAt)}</div>
                    </div>
                  ) : null}
                  <div className="rounded-lg bg-muted/35 px-3 py-2">
                    <div>Variance</div>
                    <div className="text-foreground">{getTimingLabel(timingSummary)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/35 bg-background/80 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="size-3.5 text-muted-foreground" />
                  <div className="text-[13px] font-medium">Task snapshot</div>
                </div>
                <div className="space-y-2">
                  {workflow.tasks.slice(0, 4).map((task) => {
                    const progress = getTaskRowProgress(task);

                    return (
                      <div key={task.id} className="rounded-lg bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="line-clamp-1 text-[12px] font-medium">{task.title}</div>
                          <Badge variant="outline">{getTaskStatusLabel(task.status)}</Badge>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span>{task.subtasks?.length ?? 0} subtasks</span>
                          <span>{formatShortDate(task.dueDate)}</span>
                        </div>
                        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-[12px] leading-5">
              Select a workflow to inspect its details.
            </div>
          )}
        </div>

        {workflow ? (
          <div className="flex justify-end gap-2 border-t border-border/35 px-4 py-3">
            <Button type="button" variant="ghost" onClick={() => onEditWorkflow(workflow.id)}>
              Edit workflow
            </Button>
            <Button type="button" onClick={() => onAddTask(workflow.id)}>
              Add task
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
