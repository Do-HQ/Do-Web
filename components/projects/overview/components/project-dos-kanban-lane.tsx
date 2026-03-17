"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  FlattenedProjectTask,
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTaskEditorValues,
  ProjectTaskStatus,
} from "../types";
import { ProjectDosTaskCard } from "./project-dos-task-card";

type WorkflowOption = {
  id: string;
  name: string;
};

type ProjectDosKanbanLaneProps = {
  laneId: string;
  label: string;
  kind: "status" | "custom";
  status?: ProjectTaskStatus;
  tasks: FlattenedProjectTask[];
  members: ProjectMember[];
  selectedPipeline: ProjectPipelineSummary | null;
  workflowOptions: WorkflowOption[];
  highlightDropTarget: boolean;
  surfaceClassName: string;
  countClassName: string;
  canCreate?: boolean;
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateTask?: (
    workflowId: string,
    defaults?: Partial<ProjectTaskEditorValues>,
  ) => void;
  onDeleteSection?: () => void;
};

export function ProjectDosKanbanLane({
  laneId,
  label,
  kind,
  status,
  tasks,
  members,
  selectedPipeline,
  workflowOptions,
  highlightDropTarget,
  surfaceClassName,
  countClassName,
  canCreate = false,
  onEditTask,
  onCreateTask,
  onDeleteSection,
}: ProjectDosKanbanLaneProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const { setNodeRef } = useDroppable({
    id: `lane:${laneId}`,
    data: {
      type: "lane",
      laneId,
      laneKind: kind,
      laneStatus: status,
    },
  });

  const createDefaults =
    kind === "custom"
      ? { status: "todo" as ProjectTaskStatus, sectionId: laneId }
      : status
        ? { status, sectionId: undefined }
        : undefined;

  const renderCreateTrigger = () => {
    if (!canCreate || !onCreateTask) {
      return null;
    }

    if (workflowOptions.length === 1) {
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onCreateTask(workflowOptions[0].id, createDefaults)}
          aria-label={`Add task to ${label}`}
        >
          <Plus />
        </Button>
      );
    }

    if (workflowOptions.length > 1) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Choose workflow for ${label}`}
            >
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {workflowOptions.map((workflow) => (
              <DropdownMenuItem
                key={workflow.id}
                onClick={() => onCreateTask(workflow.id, createDefaults)}
              >
                {workflow.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return null;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[16.5rem] shrink-0 snap-start flex-col gap-2.5 rounded-xl border border-border/20 p-2.5 transition-all",
        surfaceClassName,
        highlightDropTarget && "border-primary/30 shadow-sm ring-1 ring-primary/15",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-[13px] font-semibold leading-5">{label}</div>
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[11px] font-medium", countClassName)}>
            {tasks.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {renderCreateTrigger()}
          {kind === "custom" && onDeleteSection ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onDeleteSection}
              aria-label={`Delete ${label}`}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-16 flex-col gap-2">
          {tasks.length ? (
            tasks.map((task) => (
              <ProjectDosTaskCard
                key={task.id}
                task={task}
                laneId={laneId}
                laneKind={kind}
                laneStatus={status}
                members={members}
                selectedPipeline={selectedPipeline}
                onEditTask={onEditTask}
                isExpanded={expandedTaskIds.includes(task.id)}
                onToggleExpand={(taskId) =>
                  setExpandedTaskIds((current) =>
                    current.includes(taskId)
                      ? current.filter((item) => item !== taskId)
                      : [...current, taskId],
                  )
                }
              />
            ))
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed border-border/20 px-2.5 py-3 text-[12px] leading-5">
              Drop work here or create a new task for this lane.
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
