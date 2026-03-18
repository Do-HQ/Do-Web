"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceProjectTaskRecord } from "@/types/project";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceStore from "@/stores/workspace";
import useAuthStore from "@/stores/auth";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ProjectDosStatusFilter,
  ProjectDosView,
  ProjectExecutionState,
  ProjectKanbanSectionTone,
  ProjectMember,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
  ProjectTaskEditorValues,
  ProjectTaskStatus,
  ProjectTeamSummary,
  FlattenedProjectTask,
} from "../types";
import {
  flattenProjectTasks,
  getFilteredTaskRows,
  getTaskExecutionState,
  getTaskRowProgress,
  getViewChipClass,
  resolveSelectedTeam,
} from "../utils";
import { ProjectDosCharts } from "./project-dos-charts";
import { ProjectDosKanban, ProjectDosLaneTarget } from "./project-dos-kanban";
import { ProjectDosTable } from "./project-dos-table";
import { ProjectDosViewSwitcher } from "./project-dos-view-switcher";

type ProjectDosTabProps = {
  projectId: string;
  project: ProjectOverviewRecord;
  initialTaskId?: string;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  selectedPipeline: ProjectPipelineSummary | null;
  selectedTeamId: string;
  onTeamChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  onCreateTask: (
    workflowId: string,
    defaults?: Partial<ProjectTaskEditorValues>,
  ) => void;
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateSubtask?: (workflowId: string, taskId: string) => void;
  onEditSubtask?: (
    workflowId: string,
    taskId: string,
    subtaskId: string,
  ) => void;
  onMoveTask: (
    workflowId: string,
    taskId: string,
    nextStatus: ProjectTaskStatus,
    sectionId?: string,
  ) => void;
  onCreateCustomSection: (
    label: string,
    tone: ProjectKanbanSectionTone,
  ) => void;
  onDeleteCustomSection: (sectionId: string) => void;
  onTaskAction: (
    label: string,
    workflowId: string,
    taskId: string,
    taskName?: string,
  ) => void;
  onSubtaskAction?: (
    label: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
    subtaskName: string,
  ) => void;
};

const COMPLETE_STATUS = new Set<ProjectTaskStatus>(["done"]);

function mapTasksToFlattenedRows(
  tasks: WorkspaceProjectTaskRecord[],
): FlattenedProjectTask[] {
  return tasks.map((task) => {
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const subtaskDoneCount = subtasks.filter((subtask) =>
      COMPLETE_STATUS.has(subtask.status),
    ).length;
    const progress =
      typeof task.progress === "number"
        ? task.progress
        : getTaskRowProgress(task);
    const executionState =
      (task.executionState as ProjectExecutionState | undefined) ??
      getTaskExecutionState(task);

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      teamId: task.teamId,
      pipelineId: task.pipelineId,
      workflowId: task.workflowId,
      workflowName: task.workflowName,
      startDate: task.startDate || "",
      dueDate: task.dueDate,
      updatedAt: task.updatedAt,
      subtaskCount: subtasks.length,
      subtaskDoneCount,
      subtasks,
      sectionId: task.sectionId,
      progress,
      executionState,
      isBlocked: task.status === "blocked",
    };
  });
}

const STATUS_OPTIONS: { value: ProjectDosStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

type TaskAssigneeScope = "all" | "mine";

const ASSIGNEE_SCOPE_OPTIONS: { value: TaskAssigneeScope; label: string }[] = [
  { value: "all", label: "All assignees" },
  { value: "mine", label: "Assigned to me" },
];

export function ProjectDosTab({
  projectId,
  project,
  initialTaskId,
  members,
  teams,
  selectedPipeline,
  selectedTeamId,
  onTeamChange,
  startDate,
  onStartDateChange,
  onCreateTask,
  onEditTask,
  onCreateSubtask,
  onEditSubtask,
  onMoveTask,
  onCreateCustomSection,
  onDeleteCustomSection,
  onTaskAction,
  onSubtaskAction,
}: ProjectDosTabProps) {
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { useWorkspaceProjectTasks } = useWorkspaceProject();
  const [view, setView] = useState<ProjectDosView>("kanban");
  const [statusFilter, setStatusFilter] =
    useState<ProjectDosStatusFilter>("all");
  const [assigneeScope, setAssigneeScope] = useState<TaskAssigneeScope>("all");
  const autoOpenedTaskRef = useRef(false);

  const selectedTeam = resolveSelectedTeam(project, selectedTeamId);

  const fallbackTasks = useMemo(
    () =>
      flattenProjectTasks(
        project.workflows,
        selectedPipeline,
        selectedTeam,
        startDate,
      ),
    [project.workflows, selectedPipeline, selectedTeam, startDate],
  );

  const taskListQuery = useWorkspaceProjectTasks(
    workspaceId ?? "",
    projectId,
    {
      teamId: selectedTeamId,
      pipelineId: selectedPipeline?.id ?? "",
      startDate,
      statusFilter,
      assigneeScope,
    },
    {
      enabled: Boolean(workspaceId) && Boolean(projectId),
    },
  );

  const scopedTasks = useMemo(() => {
    const taskRecords = taskListQuery.data?.data?.tasks;

    if (Array.isArray(taskRecords)) {
      return mapTasksToFlattenedRows(taskRecords).filter((task) => {
        if (assigneeScope !== "mine") {
          return true;
        }

        return String(task.assigneeId || "") === String(user?._id || "");
      });
    }

    return getFilteredTaskRows(fallbackTasks, statusFilter).filter((task) => {
      if (assigneeScope !== "mine") {
        return true;
      }

      return String(task.assigneeId || "") === String(user?._id || "");
    });
  }, [
    assigneeScope,
    fallbackTasks,
    statusFilter,
    taskListQuery.data,
    user?._id,
  ]);

  const visibleTasks = scopedTasks;

  useEffect(() => {
    if (autoOpenedTaskRef.current || !initialTaskId) {
      return;
    }

    const targetTask = visibleTasks.find((task) => task.id === initialTaskId);
    if (!targetTask) {
      return;
    }

    autoOpenedTaskRef.current = true;
    setView("table");
    onEditTask(targetTask.workflowId, targetTask.id);
  }, [initialTaskId, onEditTask, visibleTasks]);

  const visibleWorkflowOptions = useMemo(
    () =>
      project.workflows
        .filter((workflow) => {
          if (workflow.archived) {
            return false;
          }

          if (selectedPipeline && workflow.pipelineId !== selectedPipeline.id) {
            return false;
          }

          if (selectedTeam && workflow.teamId !== selectedTeam.id) {
            return false;
          }

          return true;
        })
        .map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
        })),
    [project.workflows, selectedPipeline, selectedTeam],
  );

  const createTargetWorkflowId = useMemo(() => {
    const preferredWorkflowId =
      visibleTasks[0]?.workflowId ?? scopedTasks[0]?.workflowId;

    if (preferredWorkflowId) {
      return preferredWorkflowId;
    }

    return visibleWorkflowOptions[0]?.id ?? null;
  }, [scopedTasks, visibleTasks, visibleWorkflowOptions]);

  const handleMoveTaskToLane = (
    workflowId: string,
    taskId: string,
    target: ProjectDosLaneTarget,
  ) => {
    const task = visibleTasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    if (target.kind === "custom") {
      if (task.sectionId === target.laneId) {
        return;
      }

      onMoveTask(workflowId, taskId, task.status, target.laneId);
      return;
    }

    if (task.status !== target.status || task.sectionId) {
      onMoveTask(workflowId, taskId, target.status, undefined);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <section className="rounded-xl border border-border/35 bg-card/70 p-3 shadow-xs">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div>
              <div className="text-[14px] font-semibold md:text-[15px]">
                Task workspace
              </div>
              <div className="text-muted-foreground text-[12px] leading-5">
                {visibleTasks.length} visible task
                {visibleTasks.length === 1 ? "" : "s"}
                {selectedPipeline
                  ? ` • ${selectedPipeline.name}`
                  : " • All pipelines"}
                {selectedTeam ? ` • ${selectedTeam.name}` : ""}
              </div>
            </div>
            <ProjectDosViewSwitcher value={view} onValueChange={setView} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-muted/80 inline-flex rounded-md p-0.5">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter(option.value)}
                  className={getViewChipClass(statusFilter === option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <Select value={selectedTeamId} onValueChange={onTeamChange}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={assigneeScope}
              onValueChange={(value) =>
                setAssigneeScope((value as TaskAssigneeScope) || "all")
              }
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="Assignee scope" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNEE_SCOPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-0.5">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="h-8 w-40"
                aria-label="Filter tasks by due date"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                createTargetWorkflowId && onCreateTask(createTargetWorkflowId)
              }
              disabled={!createTargetWorkflowId}
            >
              <Plus />
              Task
            </Button>
          </div>
        </div>
      </section>

      {view === "kanban" ? (
        <ProjectDosKanban
          tasks={visibleTasks}
          members={members}
          selectedPipeline={selectedPipeline}
          workflowOptions={visibleWorkflowOptions}
          customSections={project.customSections ?? []}
          onCreateCustomSection={onCreateCustomSection}
          onDeleteCustomSection={onDeleteCustomSection}
          onEditTask={onEditTask}
          onCreateTask={onCreateTask}
          onMoveTaskToLane={handleMoveTaskToLane}
        />
      ) : null}

      {view === "table" ? (
        <ProjectDosTable
          projectId={projectId}
          tasks={visibleTasks}
          members={members}
          teams={teams}
          onEditTask={onEditTask}
          onCreateSubtask={onCreateSubtask}
          onEditSubtask={onEditSubtask}
          onTaskAction={onTaskAction}
          onSubtaskAction={onSubtaskAction}
        />
      ) : null}

      {view === "charts" ? (
        <ProjectDosCharts tasks={visibleTasks} onEditTask={onEditTask} />
      ) : null}
    </div>
  );
}
