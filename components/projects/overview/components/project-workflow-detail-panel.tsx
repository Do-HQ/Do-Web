import { CalendarDays, ClipboardList, Layers3, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  getTaskStatusLabel,
  getTaskRowProgress,
  getWorkflowStatusLabel,
  resolveMemberById,
} from "../utils";

type ProjectWorkflowDetailPanelProps = {
  workflow: ProjectWorkflow | null;
  timingSummary: ProjectWorkflowTimingSummary | null;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  onAddTask: (workflowId: string) => void;
  onEditWorkflow: (workflowId: string) => void;
};

const STATUS_STYLES: Record<ProjectWorkflow["status"], string> = {
  "on-track":
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "at-risk": "border-primary/20 bg-primary/10 text-primary",
  blocked:
    "border-red-700/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  complete: "border-border bg-muted/40 text-muted-foreground",
};

function getTimingStatusLabel(summary: ProjectWorkflowTimingSummary | null) {
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

export function ProjectWorkflowDetailPanel({
  workflow,
  timingSummary,
  members,
  teams,
  onAddTask,
  onEditWorkflow,
}: ProjectWorkflowDetailPanelProps) {
  if (!workflow) {
    return (
      <section className="rounded-xl border border-border/35 bg-card/70 p-4 shadow-xs">
        <div className="text-[14px] font-semibold">Workflow details</div>
        <div className="text-muted-foreground mt-2 text-[12px] leading-5">
          Select a workflow to inspect the phase details, timing, and task
          breakdown.
        </div>
      </section>
    );
  }

  const owner = resolveMemberById(members, workflow.ownerId);
  const team = teams.find((item) => item.id === workflow.teamId);
  const taskSummary = getTaskCompletionSummary(workflow.tasks);
  const subtaskSummary = getSubtaskCompletionSummary(
    workflow.tasks.flatMap((task) => task.subtasks ?? []),
  );

  return (
    <section className="rounded-xl border border-border/35 bg-card/70 p-4 shadow-xs">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:items-start">
        <div className="space-y-4">
          <div className="space-y-2 border-b border-border/35 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold md:text-[16px]">
                {workflow.name}
              </h2>
              <Badge
                variant="outline"
                className={STATUS_STYLES[workflow.status]}
              >
                {getWorkflowStatusLabel(workflow.status)}
              </Badge>
            </div>
            {workflow.description ? (
              <p className="text-muted-foreground text-[12px] leading-5">
                {workflow.description}
              </p>
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

          <div className="space-y-2 border-b border-border/35 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] font-medium">Progress</div>
              <div className="text-[13px] font-semibold">
                {workflow.progress}%
              </div>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${workflow.progress}%` }}
              />
            </div>
            <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2">
              <div>
                {taskSummary.total} tasks • {taskSummary.done} done •{" "}
                {taskSummary.blocked} blocked
              </div>
              <div>
                {subtaskSummary.total} subtasks • {subtaskSummary.done} done
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[13px] font-medium">Timing</div>
            <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 sm:block sm:space-y-1">
                <span>Started</span>
                <div className="text-foreground">
                  {formatShortDate(workflow.startedAt)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 sm:block sm:space-y-1">
                <span>Target end</span>
                <div className="text-foreground">
                  {formatShortDate(workflow.targetEndDate)}
                </div>
              </div>
              {workflow.completedAt ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 sm:block sm:space-y-1">
                  <span>Completed</span>
                  <div className="text-foreground">
                    {formatShortDate(workflow.completedAt)}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 sm:block sm:space-y-1">
                <span>Variance</span>
                <div className="text-foreground">
                  {getTimingStatusLabel(timingSummary)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:border-l xl:border-border/35 xl:pl-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-3.5 text-muted-foreground" />
              <div className="text-[13px] font-medium">Task snapshot</div>
            </div>
            <div className="space-y-2">
              {workflow.tasks.slice(0, 4).map((task) => {
                const progress = getTaskRowProgress(task);

                return (
                  <div
                    key={task.id}
                    className="rounded-lg bg-background/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="line-clamp-1 text-[12px] font-medium md:text-[13px]">
                        {task.title}
                      </div>
                      <Badge variant="outline" className="font-medium">
                        {getTaskStatusLabel(task.status)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {task.subtasks?.length ?? 0} subtask
                        {task.subtasks?.length === 1 ? "" : "s"}
                      </span>
                      <span>{formatShortDate(task.dueDate)}</span>
                    </div>
                    <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddTask(workflow.id)}
            >
              Add task
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditWorkflow(workflow.id)}
            >
              Edit workflow
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
