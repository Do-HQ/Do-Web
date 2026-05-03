"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import { PiGraphDuotone, PiRowsDuotone } from "react-icons/pi";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ProjectMember,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectTeamSummary,
  ProjectWorkflow,
} from "@/components/projects/overview/types";

import { PipelineView } from "./PipelineView";
import { TableView } from "./TableView";
import { TaskDetailsDrawer } from "./TaskDetailsDrawer";
import { WorkflowStateTrend } from "./WorkflowStateTrend";

export type WorkflowPerformanceStatus = "quick" | "average" | "delayed" | "late";
export type WorkflowTaskStatus = "todo" | "in-progress" | "done";

export type WorkflowTaskVisual = {
  id: string;
  title: string;
  status: WorkflowTaskStatus;
  team: string;
  assignee?: string;
  priority: ProjectTaskPriority;
  startDate?: string;
  dueDate?: string;
};

export type WorkflowVisual = {
  id: string;
  name: string;
  status: WorkflowPerformanceStatus;
  progress: number;
  startDate: string;
  endDate: string;
  teams: string[];
  tasks: WorkflowTaskVisual[];
};

export const WORKFLOW_STATUS_META: Record<
  WorkflowPerformanceStatus,
  {
    label: string;
    dotClass: string;
    badgeClass: string;
    progressClass: string;
    surfaceClass: string;
  }
> = {
  quick: {
    label: "Quick",
    dotClass: "bg-emerald-500",
    badgeClass:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    progressClass: "bg-emerald-500",
    surfaceClass: "bg-card/95",
  },
  average: {
    label: "Average",
    dotClass: "bg-sky-500",
    badgeClass: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    progressClass: "bg-sky-500",
    surfaceClass: "bg-card/95",
  },
  delayed: {
    label: "Delayed",
    dotClass: "bg-amber-500",
    badgeClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    progressClass: "bg-amber-500",
    surfaceClass: "bg-card/95",
  },
  late: {
    label: "Late",
    dotClass: "bg-destructive",
    badgeClass:
      "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-300",
    progressClass: "bg-destructive",
    surfaceClass: "bg-card/95",
  },
};

type WorkflowTabsProps = {
  workflows: ProjectWorkflow[];
  teams: ProjectTeamSummary[];
  members: ProjectMember[];
  onOpenWorkflowDetails: (workflowId: string) => void;
  onCreateTask?: (workflowId: string) => void;
  tableContent: React.ReactNode;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateMilliseconds(value?: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeTaskStatus(status: ProjectTaskStatus): WorkflowTaskStatus {
  if (status === "done") {
    return "done";
  }

  if (status === "in-progress" || status === "review") {
    return "in-progress";
  }

  return "todo";
}

function resolveWorkflowPerformanceStatus(
  workflow: ProjectWorkflow,
): WorkflowPerformanceStatus {
  const progress = Math.max(0, Math.min(100, Number(workflow.progress) || 0));
  const startedAt = parseDateMilliseconds(workflow.startedAt);
  const targetEndDate = parseDateMilliseconds(workflow.targetEndDate);
  const updatedAt = parseDateMilliseconds(workflow.updatedAt) ?? Date.now();
  const now = Date.now();

  if (workflow.status === "blocked") {
    return "late";
  }

  if (workflow.status === "complete" || progress >= 100) {
    if (targetEndDate !== null && updatedAt <= targetEndDate - DAY_MS) {
      return "quick";
    }

    if (targetEndDate !== null && updatedAt <= targetEndDate + DAY_MS) {
      return "average";
    }

    return "delayed";
  }

  if (startedAt === null || targetEndDate === null || targetEndDate <= startedAt) {
    if (workflow.status === "at-risk") {
      return "delayed";
    }

    return workflow.status === "on-track" ? "average" : "late";
  }

  const elapsedRatio = Math.max(
    0,
    Math.min(1, (Math.min(now, targetEndDate) - startedAt) / (targetEndDate - startedAt)),
  );
  const expectedProgress = Math.round(elapsedRatio * 100);
  const variance = progress - expectedProgress;

  if (workflow.status === "at-risk") {
    return variance <= -18 ? "late" : "delayed";
  }

  if (now > targetEndDate) {
    return progress >= 90 ? "delayed" : "late";
  }

  if (variance >= 12) {
    return "quick";
  }

  if (variance >= -10) {
    return "average";
  }

  if (variance >= -20) {
    return "delayed";
  }

  return "late";
}

export function WorkflowTabs({
  workflows,
  teams,
  members,
  onOpenWorkflowDetails,
  onCreateTask,
  tableContent,
}: WorkflowTabsProps) {
  const [activeView, setActiveView] = useState<"pipeline" | "trend" | "table">("pipeline");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    workflows[0]?.id ?? null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<{
    workflowId: string;
    taskId: string;
  } | null>(null);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const team of teams) {
      map.set(team.id, team.name);
    }

    return map;
  }, [teams]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const member of members) {
      map.set(member.id, member.name);
    }

    return map;
  }, [members]);

  const visualWorkflows = useMemo<WorkflowVisual[]>(() => {
    return workflows.map((workflow) => {
      const primaryTeam = teamNameById.get(workflow.teamId) ?? "Unassigned team";
      const collaboratorTeams = (workflow.collaboratorTeamIds || [])
        .map((teamId) => teamNameById.get(teamId))
        .filter((value): value is string => Boolean(value));
      const dedupedTeams = Array.from(new Set([primaryTeam, ...collaboratorTeams]));

      const tasks: WorkflowTaskVisual[] = workflow.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: normalizeTaskStatus(task.status),
        team: teamNameById.get(task.teamId) ?? primaryTeam,
        assignee: memberNameById.get(task.assigneeId || ""),
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
      }));

      return {
        id: workflow.id,
        name: workflow.name,
        status: resolveWorkflowPerformanceStatus(workflow),
        progress: Math.max(0, Math.min(100, Number(workflow.progress) || 0)),
        startDate: workflow.startedAt,
        endDate: workflow.targetEndDate,
        teams: dedupedTeams,
        tasks,
      };
    });
  }, [memberNameById, teamNameById, workflows]);

  const selectedWorkflow = useMemo(
    () =>
      visualWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ||
      visualWorkflows[0] ||
      null,
    [selectedWorkflowId, visualWorkflows],
  );
  const activeWorkflowId = useMemo(() => {
    if (!visualWorkflows.length) {
      return null;
    }

    const activeWorkflow = visualWorkflows.find((workflow) => {
      const lastTask = workflow.tasks[workflow.tasks.length - 1];

      if (!lastTask) {
        return true;
      }

      return lastTask.status !== "done";
    });

    if (activeWorkflow) {
      return activeWorkflow.id;
    }

    return visualWorkflows[visualWorkflows.length - 1]?.id ?? null;
  }, [visualWorkflows]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    const workflow = visualWorkflows.find(
      (item) => item.id === selectedTaskId.workflowId,
    );
    const task = workflow?.tasks.find((item) => item.id === selectedTaskId.taskId);

    if (!workflow || !task) {
      return null;
    }

    return { workflow, task };
  }, [selectedTaskId, visualWorkflows]);

  useEffect(() => {
    if (!visualWorkflows.length) {
      setSelectedWorkflowId(null);
      setSelectedTaskId(null);
      return;
    }

    if (
      selectedWorkflowId &&
      visualWorkflows.some((workflow) => workflow.id === selectedWorkflowId)
    ) {
      return;
    }

    setSelectedWorkflowId(activeWorkflowId ?? visualWorkflows[0].id);
  }, [activeWorkflowId, selectedWorkflowId, visualWorkflows]);

  return (
    <>
      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "pipeline" | "trend" | "table")}
        className="space-y-3"
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
          <TabsTrigger
            value="pipeline"
            className={cn(
              "h-8 flex-none gap-1.5 rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-[13px]",
            )}
          >
            <PiGraphDuotone className="size-4" />
            Pipeline View
          </TabsTrigger>
          <TabsTrigger
            value="trend"
            className={cn(
              "h-8 flex-none gap-1.5 rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-[13px]",
            )}
          >
            <LineChart className="size-4" />
            Trend Graph
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className={cn(
              "h-8 flex-none gap-1.5 rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-[13px]",
            )}
          >
            <PiRowsDuotone className="size-4" />
            Table View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-0">
          <PipelineView
            workflows={visualWorkflows}
            selectedWorkflowId={selectedWorkflow?.id ?? null}
            activeWorkflowId={activeWorkflowId}
            selectedTaskId={selectedTaskId}
            onSelectWorkflow={setSelectedWorkflowId}
            onOpenWorkflowDetails={onOpenWorkflowDetails}
            onCreateTask={onCreateTask}
            onSelectTask={(workflowId, taskId) => {
              setSelectedTaskId({ workflowId, taskId });
            }}
          />
        </TabsContent>

        <TabsContent value="trend" className="mt-0">
          <section className="space-y-3">
            <WorkflowStateTrend
              workflows={visualWorkflows}
              activeWorkflowId={activeWorkflowId}
            />
          </section>
        </TabsContent>

        <TabsContent value="table" className="mt-0">
          <TableView>{tableContent}</TableView>
        </TabsContent>
      </Tabs>

      <TaskDetailsDrawer
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
        workflow={selectedTask?.workflow ?? null}
        task={selectedTask?.task ?? null}
        onOpenWorkflowDetails={onOpenWorkflowDetails}
      />
    </>
  );
}
