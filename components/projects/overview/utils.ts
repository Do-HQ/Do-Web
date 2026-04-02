import { cn } from "@/lib/utils";

import {
  FlattenedProjectTask,
  ProjectDosStatusFilter,
  ProjectExecutionState,
  ProjectHeatmapDay,
  ProjectMember,
  ProjectMilestone,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
  ProjectRiskSeverity,
  ProjectTabKey,
  ProjectTaskCounts,
  ProjectTaskStatus,
  ProjectTeamSummary,
  ProjectWorkflow,
  ProjectWorkflowSubtask,
  ProjectWorkflowStatus,
  ProjectWorkflowTimingSummary,
  ProjectWorkflowView,
} from "./types";

export type WeeklyHeatmapSummary = {
  label: string;
  average: number;
  fill: number;
  level: ProjectHeatmapDay["level"];
  note: string;
};

export type WorkflowLoadSummary = {
  label: "Light" | "Balanced" | "Heavy";
  fill: number;
  note: string;
};

export type TaskChartSummary = {
  total: number;
  completed: number;
  open: number;
  blocked: number;
  completionRate: number;
  statusBreakdown: Array<{
    status: ProjectTaskStatus;
    label: string;
    count: number;
    percentage: number;
  }>;
  throughput: Array<{
    workflowId: string;
    workflowName: string;
    total: number;
    done: number;
    fill: number;
  }>;
};

export const PROJECT_TABS: { key: ProjectTabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "workflows", label: "Workflows" },
  { key: "dos", label: "Do's" },
  { key: "files-assets", label: "Files & Assets" },
  { key: "risks-issues", label: "Risks & Issues" },
  { key: "secrets", label: "Secrets" },
];

export const HEATMAP_LEVEL_CLASSES: Record<ProjectHeatmapDay["level"], string> = {
  low: "bg-primary/8 border-primary/10",
  medium: "bg-primary/18 border-primary/20",
  high: "bg-primary/28 border-primary/30",
};

export const RISK_BADGE_CLASSES: Record<ProjectRiskSeverity, string> = {
  low: "border-border bg-muted/40 text-muted-foreground",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  high: "border-primary/30 bg-primary/10 text-primary",
};

export function resolveSelectedPipeline(
  project: ProjectOverviewRecord,
  pipelineId?: string,
) {
  return project.pipelines.find((item) => item.id === pipelineId) ?? null;
}

export function resolveSelectedTeam(
  project: ProjectOverviewRecord,
  teamId: string,
) {
  if (teamId === "all") {
    return null;
  }

  return project.teams.find((item) => item.id === teamId) ?? null;
}

export function getScopedTaskCounts(
  project: ProjectOverviewRecord,
  selectedPipeline: ProjectPipelineSummary | null,
  selectedTeam: ProjectTeamSummary | null,
): ProjectTaskCounts {
  if (selectedPipeline) {
    return selectedPipeline.taskCounts;
  }

  if (selectedTeam) {
    return selectedTeam.taskCounts;
  }

  return project.taskCounts;
}

export function getScopedProgress(
  project: ProjectOverviewRecord,
  selectedPipeline: ProjectPipelineSummary | null,
  selectedTeam: ProjectTeamSummary | null,
) {
  if (selectedPipeline) {
    return selectedPipeline.progress;
  }

  if (selectedTeam) {
    return selectedTeam.progress;
  }

  return project.progress;
}

export function getScopedDueWindow(
  project: ProjectOverviewRecord,
  selectedPipeline: ProjectPipelineSummary | null,
  selectedTeam: ProjectTeamSummary | null,
) {
  if (selectedPipeline) {
    return selectedPipeline.dueWindow;
  }

  if (selectedTeam) {
    return selectedTeam.dueWindow;
  }

  return project.dueWindow;
}

export function matchesText(
  values: Array<string | undefined>,
  searchTerm: string,
) {
  const normalized = searchTerm.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export function matchesScope(
  item: { pipelineId?: string; teamId?: string },
  selectedPipelineId?: string,
  selectedTeamId?: string,
) {
  const pipelineMatches =
    !selectedPipelineId || item.pipelineId === selectedPipelineId;
  const teamMatches = !selectedTeamId || item.teamId === selectedTeamId;

  return pipelineMatches && teamMatches;
}

export function buildRoleSummary(members: ProjectMember[]) {
  const roles = [...new Set(members.map((member) => member.role))];

  if (!roles.length) {
    return "No active contributors";
  }

  if (roles.length === 1) {
    return roles[0];
  }

  if (roles.length === 2) {
    return `${roles[0]} + ${roles[1]}`;
  }

  return `${roles[0]}, ${roles[1]} +${roles.length - 2}`;
}

export function getScopedHeatmap(
  project: ProjectOverviewRecord,
  selectedPipeline: ProjectPipelineSummary | null,
) {
  return selectedPipeline?.heatmap ?? project.heatmap;
}

export function formatShortDate(value: string) {
  const parsed = new Date(String(value || "").trim());

  if (Number.isNaN(parsed.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function parseProjectDateValue(value?: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  const now = Date.now();

  if (lower === "just now") {
    return now;
  }

  if (lower === "today") {
    return new Date().setHours(0, 0, 0, 0);
  }

  if (lower === "yesterday") {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
  }

  const relativeMatch = lower.match(/^(\d+)\s*([smhdw])\s*ago$/);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return now - amount * (unitMs[unit] || 0);
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatProjectRelativeDate(value?: string) {
  const parsed = parseProjectDateValue(value);

  if (parsed === null) {
    return String(value || "").trim() || "Just now";
  }

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.round(elapsedSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

export function resolveUpdatedAtLabel(
  primaryValue?: string,
  fallbackValues: string[] = [],
) {
  const candidates = [
    String(primaryValue || "").trim(),
    ...fallbackValues
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  ].filter(Boolean);

  if (!candidates.length) {
    return "Just now";
  }

  const preferred = candidates.find((candidate) => {
    const lower = candidate.toLowerCase();
    return lower !== "just now" && parseProjectDateValue(candidate) !== null;
  });

  const resolved = preferred || candidates[0];
  return formatProjectRelativeDate(resolved);
}

export function formatTaskSummary(taskCounts: ProjectTaskCounts) {
  return `${taskCounts.done} done · ${taskCounts.inProgress} in progress · ${taskCounts.blocked} blocked`;
}

export function formatPipelineLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function aggregateHeatmapByWeek(
  heatmap: ProjectHeatmapDay[],
): WeeklyHeatmapSummary[] {
  const weights: Record<ProjectHeatmapDay["level"], number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const noteByLevel: Record<ProjectHeatmapDay["level"], string> = {
    low: "A lighter week with lower coordination overhead.",
    medium: "A balanced week with steady delivery expectations.",
    high: "A heavier week that needs close execution focus.",
  };

  return Array.from({ length: Math.ceil(heatmap.length / 7) }, (_, index) => {
    const slice = heatmap.slice(index * 7, index * 7 + 7);
    const average =
      slice.reduce((total, item) => total + weights[item.level], 0) /
      Math.max(slice.length, 1);

    const level: ProjectHeatmapDay["level"] =
      average >= 2.35 ? "high" : average >= 1.6 ? "medium" : "low";

    return {
      label: `Week ${index + 1}`,
      average,
      fill: Math.round((average / 3) * 100),
      level,
      note: noteByLevel[level],
    };
  });
}

export function getNearestMilestone(milestones: ProjectMilestone[]) {
  if (!milestones.length) {
    return null;
  }

  return [...milestones].sort(
    (left, right) =>
      new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
  )[0];
}

export function getWorkflowLoadSummary(
  heatmap: ProjectHeatmapDay[],
): WorkflowLoadSummary {
  const weeklyLoad = aggregateHeatmapByWeek(heatmap);

  if (!weeklyLoad.length) {
    return {
      label: "Light",
      fill: 28,
      note: "There is room to absorb more work in the current cycle.",
    };
  }

  const average =
    weeklyLoad.reduce((total, item) => total + item.average, 0) / weeklyLoad.length;

  if (average >= 2.2) {
    return {
      label: "Heavy",
      fill: 84,
      note: "Execution pressure is elevated and needs close coordination.",
    };
  }

  if (average >= 1.55) {
    return {
      label: "Balanced",
      fill: 62,
      note: "The workload looks healthy, with a few heavier stretches.",
    };
  }

  return {
    label: "Light",
    fill: 36,
    note: "The current cycle is relatively light and stable.",
  };
}

export function getTaskCompletionSummary(tasks: ProjectWorkflow["tasks"]) : ProjectTaskCounts {
  return {
    total: tasks.length,
    done: tasks.filter((task) => task.status === "done").length,
    inProgress: tasks.filter((task) =>
      ["todo", "in-progress", "review"].includes(task.status),
    ).length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
  };
}

export function getSubtaskCompletionSummary(
  subtasks: ProjectWorkflowSubtask[] = [],
): ProjectTaskCounts {
  return {
    total: subtasks.length,
    done: subtasks.filter((task) => task.status === "done").length,
    inProgress: subtasks.filter((task) =>
      ["todo", "in-progress", "review"].includes(task.status),
    ).length,
    blocked: subtasks.filter((task) => task.status === "blocked").length,
  };
}

function summarizeWorkflowTasks(tasks: ProjectWorkflow["tasks"]): ProjectTaskCounts {
  return getTaskCompletionSummary(tasks);
}

export function getProjectWorkflowRows(
  project: ProjectOverviewRecord,
  selectedPipeline: ProjectPipelineSummary | null,
  selectedTeam: ProjectTeamSummary | null,
  view: ProjectWorkflowView,
  startDate?: string,
): ProjectWorkflow[] {
  const minimumDate = startDate ? new Date(startDate) : null;

  return project.workflows
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

      if (view === "active") {
        return workflow.status === "on-track";
      }

      if (view === "at-risk") {
        return workflow.status === "at-risk" || workflow.status === "blocked";
      }

      if (view === "completed") {
        return workflow.status === "complete";
      }

      return true;
    })
    .map((workflow) => {
      const tasks = minimumDate
        ? workflow.tasks
            .map((task) => ({
              ...task,
              subtasks: task.subtasks?.filter(
                (subtask) => new Date(subtask.dueDate) >= minimumDate,
              ),
            }))
            .filter((task) => new Date(task.dueDate) >= minimumDate)
        : workflow.tasks;

      return {
        ...workflow,
        tasks,
        taskCounts: summarizeWorkflowTasks(tasks),
      };
    })
    .filter((workflow) => workflow.tasks.length > 0 || !minimumDate);
}

function toStartOfDay(value: string | Date) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayDistance(start: string | Date, end: string | Date) {
  const difference =
    toStartOfDay(end).getTime() - toStartOfDay(start).getTime();

  return Math.max(1, Math.ceil(difference / 86_400_000));
}

export function getWorkflowTimingSummary(
  workflows: ProjectWorkflow[],
): ProjectWorkflowTimingSummary[] {
  const today = new Date();

  return workflows.map((workflow) => {
    const plannedDays = getDayDistance(workflow.startedAt, workflow.targetEndDate);
    const elapsedSource = workflow.completedAt ?? today;
    const elapsedDays = getDayDistance(workflow.startedAt, elapsedSource);
    const clampedElapsed = Math.max(1, Math.min(elapsedDays, Math.max(plannedDays, elapsedDays)));
    const varianceDays = workflow.completedAt
      ? elapsedDays - plannedDays
      : getDayDistance(workflow.startedAt, today) - plannedDays;

    let status: ProjectWorkflowTimingSummary["status"] = "on-time";

    if (workflow.completedAt) {
      status = "complete";
    } else if (varianceDays > 1) {
      status = "late";
    } else if (varianceDays < -1) {
      status = "ahead";
    }

    return {
      workflowId: workflow.id,
      label: workflow.name,
      plannedDays,
      elapsedDays: clampedElapsed,
      varianceDays,
      status,
      fill: Math.max(10, Math.min(Math.round((clampedElapsed / plannedDays) * 100), 100)),
    };
  });
}

export function findWorkflowById(
  source: Pick<ProjectOverviewRecord, "workflows"> | ProjectWorkflow[],
  workflowId?: string | null,
) {
  const workflows = Array.isArray(source) ? source : source.workflows;

  if (!workflowId) {
    return null;
  }

  return workflows.find((workflow) => workflow.id === workflowId) ?? null;
}

export function getDefaultSelectedWorkflowId(workflows: ProjectWorkflow[]) {
  return workflows[0]?.id ?? null;
}

function getSortableUpdatedTime(value: string) {
  return parseProjectDateValue(value);
}

export function sortFlattenedTasks(tasks: FlattenedProjectTask[]) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      const dueDifference =
        new Date(left.task.dueDate).getTime() - new Date(right.task.dueDate).getTime();

      if (dueDifference !== 0) {
        return dueDifference;
      }

      const leftUpdated = getSortableUpdatedTime(left.task.updatedAt);
      const rightUpdated = getSortableUpdatedTime(right.task.updatedAt);

      if (leftUpdated !== null && rightUpdated !== null && leftUpdated !== rightUpdated) {
        return rightUpdated - leftUpdated;
      }

      if (left.task.title !== right.task.title) {
        return left.task.title.localeCompare(right.task.title);
      }

      return left.index - right.index;
    })
    .map((entry) => entry.task);
}

export function flattenProjectTasks(
  workflows: ProjectWorkflow[],
  selectedPipeline: ProjectPipelineSummary | null,
  selectedTeam: ProjectTeamSummary | null,
  startDate?: string,
): FlattenedProjectTask[] {
  const minimumDate = startDate ? new Date(startDate) : null;

  const flattenedTasks = workflows.flatMap((workflow) => {
    if (workflow.archived) {
      return [];
    }

    if (selectedPipeline && workflow.pipelineId !== selectedPipeline.id) {
      return [];
    }

    if (selectedTeam && workflow.teamId !== selectedTeam.id) {
      return [];
    }

    return workflow.tasks
      .filter((task) => {
        if (selectedPipeline && task.pipelineId !== selectedPipeline.id) {
          return false;
        }

        if (selectedTeam && task.teamId !== selectedTeam.id) {
          return false;
        }

        if (minimumDate) {
          return new Date(task.dueDate) >= minimumDate;
        }

        return true;
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        teamId: task.teamId,
        pipelineId: task.pipelineId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        startDate: task.startDate || task.dueDate,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        subtaskCount: task.subtasks?.length ?? 0,
        subtaskDoneCount:
          task.subtasks?.filter((subtask) => subtask.status === "done").length ?? 0,
        subtasks: task.subtasks ?? [],
        sectionId: task.sectionId,
        progress: getTaskRowProgress(task),
        executionState: getTaskExecutionState(task),
        isBlocked: task.status === "blocked",
      }));
  });

  return sortFlattenedTasks(flattenedTasks);
}

export function getTaskStatusGroupings(tasks: FlattenedProjectTask[]) {
  return {
    todo: tasks.filter((task) => task.status === "todo"),
    "in-progress": tasks.filter((task) => task.status === "in-progress"),
    review: tasks.filter((task) => task.status === "review"),
    blocked: tasks.filter((task) => task.status === "blocked"),
    done: tasks.filter((task) => task.status === "done"),
  };
}

export function getKanbanLaneTaskCount(
  tasks: FlattenedProjectTask[],
  status: ProjectTaskStatus,
) {
  return tasks.filter((task) => task.status === status).length;
}

export function getFilteredTaskRows(
  tasks: FlattenedProjectTask[],
  filter: ProjectDosStatusFilter,
) {
  if (filter === "open") {
    return tasks.filter((task) =>
      ["todo", "in-progress", "review"].includes(task.status),
    );
  }

  if (filter === "blocked") {
    return tasks.filter((task) => task.status === "blocked");
  }

  if (filter === "completed") {
    return tasks.filter((task) => task.status === "done");
  }

  return tasks;
}

export function getTaskChartSummary(tasks: FlattenedProjectTask[]): TaskChartSummary {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const open = tasks.filter((task) => task.status !== "done").length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const statuses: ProjectTaskStatus[] = [
    "todo",
    "in-progress",
    "review",
    "blocked",
    "done",
  ];

  const statusBreakdown = statuses.map((status) => {
    const count = tasks.filter((task) => task.status === status).length;

    return {
      status,
      label: getTaskStatusLabel(status),
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    };
  });

  const workflowMap = new Map<string, { workflowName: string; total: number; done: number }>();

  tasks.forEach((task) => {
    const current = workflowMap.get(task.workflowId) ?? {
      workflowName: task.workflowName,
      total: 0,
      done: 0,
    };

    current.total += 1;
    if (task.status === "done") {
      current.done += 1;
    }

    workflowMap.set(task.workflowId, current);
  });

  const throughput = Array.from(workflowMap.entries()).map(([workflowId, value]) => ({
    workflowId,
    workflowName: value.workflowName,
    total: value.total,
    done: value.done,
    fill: value.total ? Math.round((value.done / value.total) * 100) : 0,
  }));

  return {
    total,
    completed,
    open,
    blocked,
    completionRate,
    statusBreakdown,
    throughput,
  };
}

export function getCalendarTaskMap(tasks: FlattenedProjectTask[]) {
  return sortFlattenedTasks(tasks).reduce<Record<string, FlattenedProjectTask[]>>(
    (accumulator, task) => {
      const key = task.dueDate;

      if (!accumulator[key]) {
        accumulator[key] = [];
      }

      accumulator[key].push(task);
      return accumulator;
    },
    {},
  );
}

export function getSubtaskProgressLabel(task: Pick<FlattenedProjectTask, "subtaskCount" | "subtaskDoneCount">) {
  if (!task.subtaskCount) {
    return "No subtasks";
  }

  return `${task.subtaskDoneCount}/${task.subtaskCount} subtasks`;
}

export function getDerivedTaskStatusFromSubtasks(
  subtasks: Array<{ status: ProjectTaskStatus }> = [],
): ProjectTaskStatus | null {
  if (!subtasks.length) {
    return null;
  }

  const statuses = subtasks.map((subtask) => subtask.status);

  if (statuses.every((status) => status === "done")) {
    return "done";
  }

  if (statuses.some((status) => status === "in-progress")) {
    return "in-progress";
  }

  if (statuses.some((status) => status === "review")) {
    return "review";
  }

  if (statuses.some((status) => status === "blocked")) {
    return "blocked";
  }

  return "todo";
}

function isValidProjectDate(value?: string) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function getStatusFallbackProgress(status: ProjectTaskStatus) {
  switch (status) {
    case "todo":
      return 0;
    case "in-progress":
      return 48;
    case "review":
      return 78;
    case "done":
      return 100;
    case "blocked":
      return 24;
    default:
      return 0;
  }
}

function getStatusProgressBand(status: ProjectTaskStatus) {
  switch (status) {
    case "done":
      return { min: 100, max: 100 };
    case "review":
      return { min: 70, max: 98 };
    case "in-progress":
      return { min: 25, max: 92 };
    case "blocked":
      return { min: 8, max: 60 };
    case "todo":
    default:
      return { min: 0, max: 45 };
  }
}

function getTimelineProgress(startDate?: string, dueDate?: string) {
  if (!isValidProjectDate(startDate) || !isValidProjectDate(dueDate)) {
    return null;
  }

  const start = new Date(startDate!).getTime();
  const end = new Date(dueDate!).getTime();
  const now = Date.now();

  if (end <= start) {
    return now >= end ? 100 : 0;
  }

  if (now <= start) {
    return 0;
  }

  if (now >= end) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
}

function getTimedProgress({
  startDate,
  dueDate,
  status,
}: {
  startDate?: string;
  dueDate?: string;
  status: ProjectTaskStatus;
}) {
  if (status === "done") {
    return 100;
  }

  const statusProgress = getStatusFallbackProgress(status);
  const elapsedProgress = getTimelineProgress(startDate, dueDate) ?? statusProgress;
  const blended = Math.round(statusProgress * 0.6 + elapsedProgress * 0.4);
  const band = getStatusProgressBand(status);

  return Math.max(band.min, Math.min(band.max, blended));
}

export function getProgressBarTone({
  progress,
  status,
  startDate,
  dueDate,
  executionState,
}: {
  progress: number;
  status?: ProjectTaskStatus | ProjectWorkflowStatus;
  startDate?: string;
  dueDate?: string;
  executionState?: ProjectExecutionState;
}) {
  const normalizedProgress = Math.max(0, Math.min(100, Number(progress) || 0));
  const normalizedStatus = String(status || "").trim();
  const timelineProgress = getTimelineProgress(startDate, dueDate);
  const delta =
    typeof timelineProgress === "number"
      ? timelineProgress - normalizedProgress
      : 0;

  const isComplete =
    normalizedStatus === "done" ||
    normalizedStatus === "complete" ||
    executionState === "complete";
  const isBlocked =
    normalizedStatus === "blocked" ||
    (executionState === "elapsed" && normalizedProgress < 100);

  if (isComplete) {
    return {
      trackClass: "bg-emerald-500/15",
      fillClass: "bg-emerald-500",
      textClass: "text-emerald-600 dark:text-emerald-300",
      tone: "good" as const,
    };
  }

  if (isBlocked || delta >= 25) {
    return {
      trackClass: "bg-destructive/15",
      fillClass: "bg-destructive",
      textClass: "text-destructive",
      tone: "danger" as const,
    };
  }

  if (delta >= 10 || normalizedStatus === "at-risk") {
    return {
      trackClass: "bg-amber-500/15",
      fillClass: "bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-300",
      tone: "warning" as const,
    };
  }

  return {
    trackClass: "bg-primary/15",
    fillClass: "bg-primary",
    textClass: "text-muted-foreground",
    tone: "info" as const,
  };
}

export function getTaskExecutionState(task: {
  status: ProjectTaskStatus;
  startDate?: string;
  dueDate?: string;
  subtasks?: ProjectWorkflowSubtask[];
  executionState?: ProjectExecutionState;
}) {
  if (task.executionState) {
    return task.executionState;
  }

  if (task.status === "done") {
    return "complete";
  }

  if (task.subtasks?.length && task.subtasks.every((subtask) => subtask.status === "done")) {
    return "complete";
  }

  if (!isValidProjectDate(task.startDate) || !isValidProjectDate(task.dueDate)) {
    return task.status === "todo" ? "not-started" : "running";
  }

  const now = Date.now();
  const start = new Date(task.startDate!).getTime();
  const end = new Date(task.dueDate!).getTime();

  if (now < start) {
    return "not-started";
  }

  if (now > end) {
    return "elapsed";
  }

  return "running";
}

export function getExecutionStateLabel(state: ProjectExecutionState) {
  switch (state) {
    case "not-started":
      return "Not started";
    case "running":
      return "Running";
    case "elapsed":
      return "Elapsed";
    case "complete":
      return "Complete";
    default:
      return state;
  }
}

export function getTaskRowProgress(
  task: Pick<ProjectWorkflow["tasks"][number], "status"> & {
    subtasks?: ProjectWorkflowSubtask[];
    startDate?: string;
    dueDate?: string;
    progress?: number;
  },
): number {
  if (typeof task.progress === "number") {
    return Math.max(0, Math.min(100, Math.round(task.progress)));
  }

  if (task.subtasks?.length) {
    return Math.round(
      task.subtasks.reduce((total, subtask) => total + getTaskRowProgress(subtask), 0) /
        task.subtasks.length,
    );
  }

  return getTimedProgress({
    startDate: task.startDate,
    dueDate: task.dueDate,
    status: task.status,
  });
}

export function getWorkflowStatusLabel(status: ProjectWorkflowStatus) {
  switch (status) {
    case "on-track":
      return "On track";
    case "at-risk":
      return "At risk";
    case "blocked":
      return "Blocked";
    case "complete":
      return "Complete";
    default:
      return status;
  }
}

export function getTaskStatusLabel(status: ProjectTaskStatus) {
  switch (status) {
    case "todo":
      return "To do";
    case "in-progress":
      return "In progress";
    case "review":
      return "Review";
    case "done":
      return "Done";
    case "blocked":
      return "Blocked";
    default:
      return status;
  }
}

export function resolveMemberById(members: ProjectMember[], memberId?: string) {
  if (!memberId) {
    return null;
  }

  return members.find((member) => member.id === memberId) ?? null;
}

export function getViewChipClass(isActive: boolean) {
  return cn(
    "h-7 rounded-md px-2.5 text-[12px] font-medium shadow-none transition-all",
    isActive
      ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
      : "text-muted-foreground hover:text-foreground",
  );
}
