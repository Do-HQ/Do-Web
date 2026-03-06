"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import {
  FlattenedProjectTask,
  ProjectKanbanSection,
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTaskEditorValues,
  ProjectTaskStatus,
} from "../types";
import { getTaskStatusGroupings } from "../utils";
import { ProjectDosKanbanLane } from "./project-dos-kanban-lane";
import {
  ProjectDosSectionDialog,
  ProjectDosSectionTone,
} from "./project-dos-section-dialog";

export type ProjectDosLaneTarget =
  | {
      kind: "status";
      laneId: ProjectTaskStatus;
      status: ProjectTaskStatus;
    }
  | {
      kind: "custom";
      laneId: string;
    };

type WorkflowOption = {
  id: string;
  name: string;
};

type ProjectDosKanbanProps = {
  tasks: FlattenedProjectTask[];
  members: ProjectMember[];
  selectedPipeline: ProjectPipelineSummary | null;
  workflowOptions: WorkflowOption[];
  customSections: ProjectKanbanSection[];
  onCreateCustomSection: (label: string, tone: ProjectDosSectionTone) => void;
  onDeleteCustomSection: (sectionId: string) => void;
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateTask: (
    workflowId: string,
    defaults?: Partial<ProjectTaskEditorValues>,
  ) => void;
  onMoveTaskToLane: (workflowId: string, taskId: string, target: ProjectDosLaneTarget) => void;
};

const STATUS_COLUMNS: Array<{
  status: ProjectTaskStatus;
  label: string;
  surfaceClassName: string;
  countClassName: string;
}> = [
  {
    status: "todo",
    label: "To do",
    surfaceClassName: "bg-gradient-to-b from-slate-500/6 via-background/92 to-background/78",
    countClassName: "border-border/35 bg-background/85 text-muted-foreground",
  },
  {
    status: "in-progress",
    label: "In progress",
    surfaceClassName: "bg-gradient-to-b from-primary/10 via-background/92 to-background/78",
    countClassName: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    status: "review",
    label: "Review",
    surfaceClassName: "bg-gradient-to-b from-emerald-500/10 via-background/92 to-background/78",
    countClassName:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  {
    status: "blocked",
    label: "Blocked",
    surfaceClassName: "bg-gradient-to-b from-amber-500/10 via-background/92 to-background/78",
    countClassName:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  {
    status: "done",
    label: "Done",
    surfaceClassName: "bg-gradient-to-b from-zinc-500/8 via-background/92 to-background/78",
    countClassName: "border-border/35 bg-background/85 text-muted-foreground",
  },
];

const CUSTOM_SECTION_STYLES: Record<
  ProjectDosSectionTone,
  { surfaceClassName: string; countClassName: string }
> = {
  sky: {
    surfaceClassName: "bg-gradient-to-b from-sky-500/10 via-background/92 to-background/78",
    countClassName: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  violet: {
    surfaceClassName: "bg-gradient-to-b from-violet-500/10 via-background/92 to-background/78",
    countClassName:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  cyan: {
    surfaceClassName: "bg-gradient-to-b from-cyan-500/10 via-background/92 to-background/78",
    countClassName: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  },
  rose: {
    surfaceClassName: "bg-gradient-to-b from-rose-500/10 via-background/92 to-background/78",
    countClassName: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  amber: {
    surfaceClassName: "bg-gradient-to-b from-amber-500/10 via-background/92 to-background/78",
    countClassName: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  emerald: {
    surfaceClassName: "bg-gradient-to-b from-emerald-500/10 via-background/92 to-background/78",
    countClassName:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
};

function resolveDropTarget(
  over: DragOverEvent["over"] | DragEndEvent["over"],
): ProjectDosLaneTarget | null {
  if (!over?.data.current) {
    return null;
  }

  const overData = over.data.current;

  if (overData.type === "lane") {
    if (overData.laneKind === "custom") {
      return {
        kind: "custom",
        laneId: String(overData.laneId),
      };
    }

    return {
      kind: "status",
      laneId: overData.laneStatus as ProjectTaskStatus,
      status: overData.laneStatus as ProjectTaskStatus,
    };
  }

  if (overData.type === "task") {
    if (overData.laneKind === "custom") {
      return {
        kind: "custom",
        laneId: String(overData.laneId),
      };
    }

    return {
      kind: "status",
      laneId: overData.laneStatus as ProjectTaskStatus,
      status: overData.laneStatus as ProjectTaskStatus,
    };
  }

  return null;
}

function getTaskLaneId(task: FlattenedProjectTask) {
  return task.sectionId || task.status;
}

export function ProjectDosKanban({
  tasks,
  members,
  selectedPipeline,
  workflowOptions,
  customSections,
  onCreateCustomSection,
  onDeleteCustomSection,
  onEditTask,
  onCreateTask,
  onMoveTaskToLane,
}: ProjectDosKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overLaneId, setOverLaneId] = useState<string | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);

  const defaultGroupings = useMemo(() => getTaskStatusGroupings(tasks), [tasks]);
  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, tasks],
  );

  const customTaskMap = useMemo(() => {
    const nextMap = new Map<string, FlattenedProjectTask[]>();
    customSections.forEach((section) => {
      nextMap.set(section.id, []);
    });

    tasks.forEach((task) => {
      if (task.sectionId && nextMap.has(task.sectionId)) {
        nextMap.get(task.sectionId)?.push(task);
      }
    });

    return nextMap;
  }, [customSections, tasks]);

  const statusLaneTasks = useMemo(() => {
    const next = { ...defaultGroupings };

    STATUS_COLUMNS.forEach((column) => {
      next[column.status] = defaultGroupings[column.status].filter(
        (task) => !task.sectionId || !customTaskMap.has(task.sectionId),
      );
    });

    return next;
  }, [customTaskMap, defaultGroupings]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const target = resolveDropTarget(event.over);
    setOverLaneId(target?.laneId ?? null);
  };

  const resetDragState = () => {
    setActiveTaskId(null);
    setOverLaneId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const target = resolveDropTarget(event.over);
    const draggedTask = activeTask;

    resetDragState();

    if (!draggedTask || !target) {
      return;
    }

    const currentLaneId = getTaskLaneId(draggedTask);

    if (currentLaneId === target.laneId) {
      return;
    }

    onMoveTaskToLane(draggedTask.workflowId, draggedTask.id, target);
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs">
        <div className="border-b border-border/20 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[13px] font-semibold">Board lanes</div>
              <div className="text-muted-foreground text-[12px] leading-5">
                Drag tasks between status lanes or park them in custom sections while you work.
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSectionDialogOpen(true)}
            >
              <Plus />
              Section
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDragState}
        >
          <ScrollArea className="w-full">
            <div className="flex min-w-max snap-x snap-mandatory gap-3 p-3">
              {STATUS_COLUMNS.map((column) => {
                const columnTasks = statusLaneTasks[column.status];

                return (
                  <ProjectDosKanbanLane
                    key={column.status}
                    laneId={column.status}
                    label={column.label}
                    kind="status"
                    status={column.status}
                    tasks={columnTasks}
                    members={members}
                    selectedPipeline={selectedPipeline}
                    workflowOptions={workflowOptions}
                    highlightDropTarget={Boolean(
                      activeTask &&
                        overLaneId === column.status &&
                        getTaskLaneId(activeTask) !== column.status,
                    )}
                    surfaceClassName={column.surfaceClassName}
                    countClassName={column.countClassName}
                    canCreate
                    onEditTask={onEditTask}
                    onCreateTask={(workflowId, defaults) => onCreateTask(workflowId, defaults)}
                  />
                );
              })}

              {customSections.map((section) => {
                const style = CUSTOM_SECTION_STYLES[section.tone];
                const sectionTasks = customTaskMap.get(section.id) ?? [];

                return (
                  <ProjectDosKanbanLane
                    key={section.id}
                    laneId={section.id}
                    label={section.label}
                    kind="custom"
                    tasks={sectionTasks}
                    members={members}
                    selectedPipeline={selectedPipeline}
                    workflowOptions={workflowOptions}
                    highlightDropTarget={Boolean(
                      activeTask &&
                        overLaneId === section.id &&
                        getTaskLaneId(activeTask) !== section.id,
                    )}
                    surfaceClassName={style.surfaceClassName}
                    countClassName={style.countClassName}
                    canCreate
                    onEditTask={onEditTask}
                    onCreateTask={(workflowId, defaults) => onCreateTask(workflowId, defaults)}
                    onDeleteSection={() => onDeleteCustomSection(section.id)}
                  />
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DndContext>
      </section>

      <ProjectDosSectionDialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        onCreate={onCreateCustomSection}
      />
    </>
  );
}
