"use client";

import { useMemo } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ChevronDown } from "lucide-react";

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
  getProgressBarTone,
  getSubtaskProgressLabel,
  getTaskStatusLabel,
  resolveMemberById,
} from "../utils";

type ProjectDosTaskCardProps = {
  task: FlattenedProjectTask;
  laneId: string;
  laneOrderId: string;
  laneKind: "status" | "custom";
  laneStatus?: ProjectTaskStatus;
  members: ProjectMember[];
  selectedPipeline: ProjectPipelineSummary | null;
  onEditTask: (workflowId: string, taskId: string) => void;
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
};

const PRIORITY_STYLES = {
  low: "bg-muted-foreground/55",
  medium: "bg-amber-500",
  high: "bg-primary",
} as const;

export function ProjectDosTaskCard({
  task,
  laneId,
  laneOrderId,
  laneKind,
  laneStatus,
  members,
  selectedPipeline,
  onEditTask,
  isExpanded,
  onToggleExpand,
}: ProjectDosTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      laneId,
      laneOrderId,
      laneKind,
      laneStatus,
    },
  });

  const assignee = resolveMemberById(members, task.assigneeId);
  const previewSubtasks = useMemo(
    () => (Array.isArray(task.subtasks) ? task.subtasks.slice(0, 3) : []),
    [task.subtasks],
  );
  const progressTone = getProgressBarTone({
    progress: task.progress,
    status: task.status,
    startDate: task.startDate,
    dueDate: task.dueDate,
    executionState: task.executionState,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onEditTask(task.workflowId, task.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group touch-none cursor-grab active:cursor-grabbing overflow-hidden rounded-xl border border-border/15 bg-card/95 px-2.5 py-2 text-left shadow-xs transition-all hover:bg-card",
        isDragging && "scale-[1.01] opacity-90 shadow-md ring-1 ring-primary/20",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-2 min-w-0 flex-1 text-[12px] font-medium leading-5 md:text-[13px]">
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
        <div
          className={cn(
            "h-1.5 overflow-hidden rounded-full",
            progressTone.trackClass,
          )}
        >
          <div
            className={cn("h-full rounded-full", progressTone.fillClass)}
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] leading-4">
          <span className="text-muted-foreground truncate">
            {assignee?.name ?? "Unassigned"}
          </span>
          <span className={cn("shrink-0 font-medium", progressTone.textClass)}>
            {task.progress}%
          </span>
        </div>
        <div className="text-muted-foreground text-[10px] leading-4">
          {getSubtaskProgressLabel(task)}
        </div>
      </div>

      {task.subtaskCount > 0 ? (
        <div className="mt-2 border-t border-border/20 pt-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px] font-medium transition-colors"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(task.id);
            }}
          >
            <ChevronDown
              className={cn("size-3 transition-transform", isExpanded && "rotate-180")}
            />
            {isExpanded ? "Hide subtasks" : "Preview subtasks"}
          </button>
          {isExpanded ? (
            <div className="mt-1.5 space-y-1">
              {previewSubtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/15 bg-background/55 px-2 py-1 text-[10px]"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    {subtask.title}
                  </span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                    {getTaskStatusLabel(subtask.status)}
                  </Badge>
                </div>
              ))}
              {task.subtaskCount > previewSubtasks.length ? (
                <div className="text-muted-foreground px-1 text-[10px]">
                  +{task.subtaskCount - previewSubtasks.length} more subtasks
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
