"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  FlattenedProjectTask,
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTaskStatus,
} from "../types";
import {
  formatPipelineLabel,
  formatShortDate,
  getSubtaskProgressLabel,
  resolveMemberById,
} from "../utils";

type ProjectDosTaskCardProps = {
  task: FlattenedProjectTask;
  laneId: string;
  laneKind: "status" | "custom";
  laneStatus?: ProjectTaskStatus;
  members: ProjectMember[];
  selectedPipeline: ProjectPipelineSummary | null;
  onEditTask: (workflowId: string, taskId: string) => void;
};

const PRIORITY_STYLES = {
  low: "bg-muted-foreground/55",
  medium: "bg-amber-500",
  high: "bg-primary",
} as const;

export function ProjectDosTaskCard({
  task,
  laneId,
  laneKind,
  laneStatus,
  members,
  selectedPipeline,
  onEditTask,
}: ProjectDosTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      laneId,
      laneKind,
      laneStatus,
    },
  });

  const assignee = resolveMemberById(members, task.assigneeId);

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onEditTask(task.workflowId, task.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "touch-none rounded-lg border border-border/20 bg-background/92 px-2.5 py-2 text-left shadow-xs transition-all hover:bg-background",
        isDragging && "scale-[1.01] opacity-85 shadow-md ring-1 ring-primary/20",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-2 min-w-0 flex-1 text-[12px] font-medium leading-4.5 md:text-[13px]">
          {task.title}
        </div>
        <span
          className={cn(
            "mt-1 size-1.5 shrink-0 rounded-full",
            PRIORITY_STYLES[task.priority],
          )}
        />
      </div>

      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium">
          {task.workflowName}
        </Badge>
        {!selectedPipeline ? (
          <span className="text-muted-foreground max-w-[7.5rem] truncate text-[10px]">
            {formatPipelineLabel(task.pipelineId)}
          </span>
        ) : null}
        <span className="text-muted-foreground text-[10px]">Due {formatShortDate(task.dueDate)}</span>
      </div>

      <div className="mt-2 space-y-1">
        <div className="bg-muted h-1 overflow-hidden rounded-full">
          <div className="bg-primary h-full rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-[10px] leading-4">
          <span className="truncate">{assignee?.name ?? "Unassigned"}</span>
          <span className="shrink-0">{getSubtaskProgressLabel(task)}</span>
        </div>
      </div>
    </button>
  );
}
