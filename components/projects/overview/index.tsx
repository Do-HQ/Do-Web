"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { WorkspaceProjectTaskRecord } from "@/types/project";
import { useQueryClient } from "@tanstack/react-query";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";

import {
  ProjectOverviewProps,
  ProjectKanbanSectionTone,
  ProjectRiskKind,
  ProjectTabKey,
  ProjectTaskCounts,
  ProjectTaskEditorValues,
  ProjectTaskStatus,
  ProjectWorkflow,
  ProjectWorkflowEditorValues,
  ProjectWorkflowView,
} from "./types";
import {
  formatShortDate,
  getNearestMilestone,
  getProjectWorkflowRows,
  getScopedDueWindow,
  getScopedHeatmap,
  getScopedProgress,
  getScopedTaskCounts,
  getTaskCompletionSummary,
  getTaskRowProgress,
  getWorkflowLoadSummary,
  matchesScope,
  resolveSelectedPipeline,
  resolveSelectedTeam,
} from "./utils";
import { ProjectOverviewActivity } from "./components/project-overview-activity";
import { ProjectOverviewHeader } from "./components/project-overview-header";
import { ProjectOverviewPlaceholder } from "./components/project-overview-placeholder";
import { ProjectOverviewRisks } from "./components/project-overview-risks";
import { ProjectOverviewStatCards } from "./components/project-overview-stat-cards";
import { ProjectOverviewTabs } from "./components/project-overview-tabs";
import { ProjectOverviewWorkflowTable } from "./components/project-overview-workflow-table";
import { ProjectDosTab } from "./components/project-dos-tab";
import { ProjectTaskSheet } from "./components/project-task-sheet";
import { ProjectWorkflowSheet } from "./components/project-workflow-sheet";
import { ProjectWorkflowsTab } from "./components/project-workflows-tab";
import { ProjectFilesAssetsTab } from "./components/project-files-assets-tab";
import { ProjectRisksIssuesTab } from "./components/project-risks-issues-tab";
import { ProjectSecretsTab } from "./components/project-secrets-tab";
import { ProjectAgentsAutomationTab } from "./components/project-agents-automation-tab";

type WorkflowSheetState = {
  mode: "create" | "edit";
  workflowId?: string;
  defaults?: Partial<ProjectWorkflowEditorValues>;
} | null;

type TaskSheetState = {
  mode: "create" | "edit";
  workflowId: string;
  taskId?: string;
  expandSubtasks?: boolean;
  seedBlankSubtask?: boolean;
  defaults?: Partial<ProjectTaskEditorValues>;
} | null;

function buildDueWindow(startDate: string, targetEndDate: string) {
  if (!startDate || !targetEndDate) {
    return "No date range";
  }

  return `${formatShortDate(startDate)} - ${formatShortDate(targetEndDate)}`;
}

function summarizeProjectTaskCounts(
  workflows: ProjectWorkflow[],
): ProjectTaskCounts {
  return workflows
    .filter((workflow) => !workflow.archived)
    .reduce(
      (totals, workflow) => ({
        total: totals.total + workflow.taskCounts.total,
        done: totals.done + workflow.taskCounts.done,
        inProgress: totals.inProgress + workflow.taskCounts.inProgress,
        blocked: totals.blocked + workflow.taskCounts.blocked,
      }),
      { total: 0, done: 0, inProgress: 0, blocked: 0 },
    );
}

function syncWorkflowDerivedFields(workflow: ProjectWorkflow): ProjectWorkflow {
  const nextTaskCounts = getTaskCompletionSummary(workflow.tasks);
  const progressFromTasks = workflow.tasks.length
    ? Math.round(
        workflow.tasks.reduce(
          (total, task) => total + getTaskRowProgress(task),
          0,
        ) / workflow.tasks.length,
      )
    : Math.max(0, Math.min(100, workflow.progress));
  const taskStartDates = workflow.tasks
    .map((task) => task.startDate || task.dueDate)
    .filter((value) => value && !Number.isNaN(new Date(value).getTime()))
    .sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    );
  const taskDueDates = workflow.tasks
    .map((task) => task.dueDate)
    .filter((value) => value && !Number.isNaN(new Date(value).getTime()))
    .sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    );
  const derivedStartedAt = taskStartDates[0] ?? "";
  const derivedTargetEndDate = taskDueDates[taskDueDates.length - 1] ?? "";

  return {
    ...workflow,
    startedAt: derivedStartedAt,
    targetEndDate: derivedTargetEndDate,
    dueWindow: buildDueWindow(derivedStartedAt, derivedTargetEndDate),
    progress: progressFromTasks,
    taskCounts: nextTaskCounts,
  };
}

function syncProjectRecord<
  T extends {
    workflows: ProjectWorkflow[];
    progress: number;
    taskCounts: ProjectTaskCounts;
  },
>(project: T, workflows: ProjectWorkflow[]): T {
  const activeWorkflows = workflows.filter((workflow) => !workflow.archived);
  const nextProgress = activeWorkflows.length
    ? Math.round(
        activeWorkflows.reduce(
          (total, workflow) => total + workflow.progress,
          0,
        ) / activeWorkflows.length,
      )
    : 0;

  return {
    ...project,
    workflows,
    progress: nextProgress,
    taskCounts: summarizeProjectTaskCounts(workflows),
  };
}

export default function ProjectOverview({
  projectId,
  pipelineId,
  initialTab,
}: ProjectOverviewProps) {
  const { workspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const {
    useWorkspaceProjectDetail,
    useWorkspaceProjectWorkflows,
    useUpdateWorkspaceProject,
    useCreateWorkspaceProjectWorkflow,
    useUpdateWorkspaceProjectWorkflow,
    useArchiveWorkspaceProjectWorkflow,
    useUnarchiveWorkspaceProjectWorkflow,
    useDeleteWorkspaceProjectWorkflow,
    useCreateWorkspaceProjectTask,
    useUpdateWorkspaceProjectTask,
    useDeleteWorkspaceProjectTask,
    useDeleteWorkspaceProjectSubtask,
    useResolveWorkspaceProjectRisk,
    useCloseWorkspaceProjectRisk,
    useDeleteWorkspaceProjectRisk,
  } = useWorkspaceProject();
  const { user } = useAuthStore();
  const project = useProjectStore(
    (state) => state.projectRecords[projectId] ?? null,
  );
  const pendingWorkflowCreateProjectId = useProjectStore(
    (state) => state.pendingWorkflowCreateProjectId,
  );
  const updateProject = useProjectStore((state) => state.updateProject);
  const upsertProjectRecord = useProjectStore(
    (state) => state.upsertProjectRecord,
  );
  const projectsLoaded = useProjectStore((state) => state.projectsLoaded);
  const consumeWorkflowCreateRequest = useProjectStore(
    (state) => state.consumeWorkflowCreateRequest,
  );
  const projectDetailQuery = useWorkspaceProjectDetail(
    workspaceId ?? "",
    projectId,
    {
      enabled: Boolean(workspaceId) && !project,
    },
  );
  const updateWorkspaceProjectMutation = useUpdateWorkspaceProject({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const createWorkspaceProjectWorkflowMutation =
    useCreateWorkspaceProjectWorkflow({
      onSuccess: (response) => {
        const nextRecord = response.data.project?.record;

        if (nextRecord) {
          upsertProjectRecord(nextRecord);
        }
      },
    });
  const updateWorkspaceProjectWorkflowMutation =
    useUpdateWorkspaceProjectWorkflow({
      onSuccess: (response) => {
        const nextRecord = response.data.project?.record;

        if (nextRecord) {
          upsertProjectRecord(nextRecord);
        }
      },
    });
  const archiveWorkspaceProjectWorkflowMutation =
    useArchiveWorkspaceProjectWorkflow({
      onSuccess: (response) => {
        const nextRecord = response.data.project?.record;

        if (nextRecord) {
          upsertProjectRecord(nextRecord);
        }
      },
    });
  const unarchiveWorkspaceProjectWorkflowMutation =
    useUnarchiveWorkspaceProjectWorkflow({
      onSuccess: (response) => {
        const nextRecord = response.data.project?.record;

        if (nextRecord) {
          upsertProjectRecord(nextRecord);
        }
      },
    });
  const deleteWorkspaceProjectWorkflowMutation =
    useDeleteWorkspaceProjectWorkflow({
      onSuccess: (response) => {
        const nextRecord = response.data.project?.record;

        if (nextRecord) {
          upsertProjectRecord(nextRecord);
        }
      },
    });
  const createWorkspaceProjectTaskMutation = useCreateWorkspaceProjectTask({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const updateWorkspaceProjectTaskMutation = useUpdateWorkspaceProjectTask({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const deleteWorkspaceProjectTaskMutation = useDeleteWorkspaceProjectTask({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const deleteWorkspaceProjectSubtaskMutation =
    useDeleteWorkspaceProjectSubtask({
      onSuccess: (response) => {
        const nextRecord = response.data.project?.record;

        if (nextRecord) {
          upsertProjectRecord(nextRecord);
        }
      },
    });
  const resolveWorkspaceProjectRiskMutation = useResolveWorkspaceProjectRisk({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const closeWorkspaceProjectRiskMutation = useCloseWorkspaceProjectRisk({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const deleteWorkspaceProjectRiskMutation = useDeleteWorkspaceProjectRisk({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });

  const [activeTab, setActiveTab] = useState<ProjectTabKey>(
    initialTab ?? "overview",
  );
  const [teamFilter, setTeamFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [riskView, setRiskView] = useState<ProjectRiskKind>("risk");
  const [workflowView, setWorkflowView] = useState<ProjectWorkflowView>("all");
  const [workflowSortMode, setWorkflowSortMode] = useState<"updated" | "progress" | "name">("updated");
  const [workflowPage, setWorkflowPage] = useState(1);
  const [workflowsTabSortMode, setWorkflowsTabSortMode] = useState<"updated" | "progress" | "name">("updated");
  const [workflowsTabPage, setWorkflowsTabPage] = useState(1);
  const [expandedWorkflowIds, setExpandedWorkflowIds] = useState<string[]>([]);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [workflowSheetState, setWorkflowSheetState] =
    useState<WorkflowSheetState>(null);
  const [taskSheetState, setTaskSheetState] = useState<TaskSheetState>(null);

  const workflowListQuery = useWorkspaceProjectWorkflows(
    workspaceId ?? "",
    projectId,
    {
      page: workflowPage,
      limit: 6,
      view: workflowView,
      teamId: teamFilter,
      pipelineId: pipelineId ?? "",
      startDate,
      sort: workflowSortMode,
      archived: false,
    },
    {
      enabled: Boolean(workspaceId) && Boolean(projectId),
    },
  );
  const workflowsTabListQuery = useWorkspaceProjectWorkflows(
    workspaceId ?? "",
    projectId,
    {
      page: workflowsTabPage,
      limit: 12,
      view: workflowView,
      teamId: teamFilter,
      pipelineId: pipelineId ?? "",
      startDate,
      sort: workflowsTabSortMode,
      archived: false,
    },
    {
      enabled: Boolean(workspaceId) && Boolean(projectId) && activeTab === "workflows",
    },
  );
  const archivedWorkflowListQuery = useWorkspaceProjectWorkflows(
    workspaceId ?? "",
    projectId,
    {
      page: 1,
      limit: 50,
      view: "all",
      teamId: teamFilter,
      pipelineId: pipelineId ?? "",
      startDate,
      sort: "updated",
      archived: true,
    },
    {
      enabled: Boolean(workspaceId) && Boolean(projectId) && activeTab === "workflows",
    },
  );

  const workflowRefreshKey = project
    ? project.workflows
        .map((workflow) => `${workflow.id}:${workflow.updatedAt}:${workflow.archived ? "1" : "0"}:${workflow.tasks.length}`)
        .join("|")
    : "";
  const refetchWorkflowList = workflowListQuery.refetch;
  const refetchWorkflowsTabList = workflowsTabListQuery.refetch;
  const refetchArchivedWorkflowList = archivedWorkflowListQuery.refetch;

  const selectedPipeline = project
    ? resolveSelectedPipeline(project, pipelineId)
    : null;
  const selectedTeam = project
    ? resolveSelectedTeam(project, teamFilter)
    : null;
  const currentUserId = String(user?._id || "").trim();

  useEffect(() => {
    if (!project) {
      return;
    }

    if (pendingWorkflowCreateProjectId !== projectId) {
      return;
    }

    consumeWorkflowCreateRequest(projectId);
    const animationFrame = window.requestAnimationFrame(() => {
      setActiveTab("workflows");
      setWorkflowSheetState({
        mode: "create",
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    consumeWorkflowCreateRequest,
    pendingWorkflowCreateProjectId,
    project,
    projectId,
    selectedPipeline,
    selectedTeam,
  ]);

  useEffect(() => {
    setWorkflowPage(1);
  }, [workflowView, workflowSortMode, teamFilter, startDate, pipelineId]);

  useEffect(() => {
    setWorkflowsTabPage(1);
  }, [workflowView, workflowsTabSortMode, teamFilter, startDate, pipelineId]);

  useEffect(() => {
    if (!workspaceId || !project) {
      return;
    }

    void refetchWorkflowList();

    if (activeTab === "workflows") {
      void refetchWorkflowsTabList();
      void refetchArchivedWorkflowList();
    }
  }, [
    workspaceId,
    projectId,
    workflowRefreshKey,
    workflowView,
    workflowSortMode,
    workflowPage,
    workflowsTabSortMode,
    workflowsTabPage,
    teamFilter,
    startDate,
    pipelineId,
    activeTab,
    project,
    refetchWorkflowList,
    refetchWorkflowsTabList,
    refetchArchivedWorkflowList,
  ]);

  useEffect(() => {
    const fetchedRecord = projectDetailQuery.data?.data?.project?.record;

    if (fetchedRecord?.id) {
      upsertProjectRecord(fetchedRecord);
    }
  }, [projectDetailQuery.data, upsertProjectRecord]);

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">
        <ProjectOverviewPlaceholder
          kind={
            projectDetailQuery.isLoading ||
            projectDetailQuery.isFetching ||
            !projectsLoaded
              ? "loading"
              : "missing"
          }
        />
      </div>
    );
  }

  const scopedTaskCounts = getScopedTaskCounts(
    project,
    selectedPipeline,
    selectedTeam,
  );
  const scopedProgress = getScopedProgress(
    project,
    selectedPipeline,
    selectedTeam,
  );
  const scopedDueWindow = getScopedDueWindow(
    project,
    selectedPipeline,
    selectedTeam,
  );
  const scopedRiskHint = selectedPipeline?.riskHint ?? project.riskHint;

  const scopedTeams = project.teams.filter((team) => {
    const teamMatches = teamFilter === "all" || team.id === teamFilter;
    const pipelineMatches =
      !selectedPipeline || team.pipelineIds.includes(selectedPipeline.id);

    return teamMatches && pipelineMatches;
  });

  const visibleMembers = project.members.filter((member) =>
    member.teamIds.some((teamId) =>
      scopedTeams.some((team) => team.id === teamId),
    ),
  );

  const minimumDate = startDate ? new Date(startDate) : null;

  const visibleMilestones = project.milestones
    .filter((milestone) =>
      matchesScope(
        milestone,
        selectedPipeline?.id,
        teamFilter === "all" ? undefined : teamFilter,
      ),
    )
    .filter((milestone) => {
      if (!minimumDate) {
        return true;
      }

      return new Date(milestone.dueDate) >= minimumDate;
    })
    .sort(
      (left, right) =>
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
    );

  const visibleActivities = project.activities
    .filter((activity) =>
      matchesScope(
        activity,
        selectedPipeline?.id,
        teamFilter === "all" ? undefined : teamFilter,
      ),
    )
    .slice(0, 4);

  const visibleRiskItems = project.risks.filter((item) => {
    if (item.kind !== riskView) {
      return false;
    }

    return matchesScope(
      item,
      selectedPipeline?.id,
      teamFilter === "all" ? undefined : teamFilter,
    );
  });

  const visibleWorkflows = getProjectWorkflowRows(
    project,
    selectedPipeline,
    selectedTeam,
    workflowView,
    startDate,
  );

  const archivedWorkflows = project.workflows.filter((workflow) => {
    if (!workflow.archived) {
      return false;
    }

    return matchesScope(
      workflow,
      selectedPipeline?.id,
      teamFilter === "all" ? undefined : teamFilter,
    );
  });

  const visibleWorkflowTaskCounts = getTaskCompletionSummary(
    visibleWorkflows.flatMap((workflow) => workflow.tasks),
  );

  const overviewWorkflows =
    workflowListQuery.data?.data?.workflows ?? visibleWorkflows;
  const overviewWorkflowPagination = workflowListQuery.data?.data?.pagination ?? null;
  const workflowsTabWorkflows =
    workflowsTabListQuery.data?.data?.workflows ?? visibleWorkflows;
  const workflowsTabArchivedWorkflows =
    archivedWorkflowListQuery.data?.data?.workflows ?? archivedWorkflows;

  const nearestMilestone = getNearestMilestone(visibleMilestones);
  const workloadSummary = getWorkflowLoadSummary(
    getScopedHeatmap(project, selectedPipeline),
  );

  const workflowForSheet = workflowSheetState?.workflowId
    ? (project.workflows.find(
        (workflow) => workflow.id === workflowSheetState.workflowId,
      ) ?? null)
    : null;

  const taskSheetWorkflow = taskSheetState
    ? (project.workflows.find(
        (workflow) => workflow.id === taskSheetState.workflowId,
      ) ?? null)
    : null;

  const taskForSheet = taskSheetState?.taskId
    ? (taskSheetWorkflow?.tasks.find(
        (task) => task.id === taskSheetState.taskId,
      ) ?? null)
    : null;

  const handlePlaceholderAction = (label: string, name?: string) =>
    toast(
      name
        ? `${label}: ${name} will be wired to the backend flow next.`
        : `${label} will be wired to the backend flow next.`,
    );

  const persistProjectRecord = (
    nextRecord: typeof project,
    options?: {
      loading?: string;
      success?: string;
      error?: string;
    },
  ) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to save changes.");
      return Promise.reject(new Error("Missing workspace"));
    }

    return toast.promise(
      updateWorkspaceProjectMutation.mutateAsync({
        workspaceId,
        projectId,
        updates: {
          record: nextRecord,
        },
      }),
      {
        loading: options?.loading ?? "Saving project changes...",
        success: options?.success ?? "Project updated.",
        error: options?.error ?? "We could not save that project change.",
      },
    );
  };

  const handleArchiveProject = async () => {
    if (!workspaceId) {
      toast("Open this project from a workspace to archive it.");
      return;
    }

    const nextRecord = {
      ...project,
      status: "paused" as const,
      activities: [
        {
          id: `archive-${Date.now()}`,
          actor: "System",
          actorInitials: "SY",
          summary: "archived this project from the project header.",
          createdAt: "Just now",
        },
        ...project.activities,
      ].slice(0, 8),
    };

    await toast.promise(
      updateWorkspaceProjectMutation.mutateAsync({
        workspaceId,
        projectId,
        updates: {
          archived: true,
          status: "paused",
          record: nextRecord,
        },
      }),
      {
        loading: "Archiving project...",
        success: "Project archived.",
        error: "We could not archive this project.",
      },
    );
  };

  const handleCreateCustomSection = async (
    label: string,
    tone: ProjectKanbanSectionTone,
  ) => {
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      toast("Section name is required.");
      return;
    }

    const previousProject = project;
    const nextSection = {
      id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: trimmedLabel,
      tone,
    };
    const nextRecord = {
      ...project,
      customSections: [...(project.customSections ?? []), nextSection],
    };

    upsertProjectRecord(nextRecord);

    try {
      await persistProjectRecord(nextRecord, {
        loading: "Creating section...",
        success: "Section created.",
        error: "We could not create that section.",
      });
    } catch {
      upsertProjectRecord(previousProject);
    }
  };

  const handleDeleteCustomSection = async (sectionId: string) => {
    const previousProject = project;
    const nextWorkflows = project.workflows.map((workflow) =>
      syncWorkflowDerivedFields({
        ...workflow,
        tasks: workflow.tasks.map((task) =>
          task.sectionId === sectionId
            ? {
                ...task,
                sectionId: undefined,
              }
            : task,
        ),
      }),
    );
    const nextRecord = syncProjectRecord(
      {
        ...project,
        customSections: (project.customSections ?? []).filter(
          (section) => section.id !== sectionId,
        ),
      },
      nextWorkflows,
    );

    upsertProjectRecord(nextRecord);
    patchTaskQueryCaches((tasks) =>
      tasks.map((task) =>
        task.sectionId === sectionId
          ? {
              ...task,
              sectionId: undefined,
            }
          : task,
      ),
    );

    try {
      await persistProjectRecord(nextRecord, {
        loading: "Removing section...",
        success: "Section removed.",
        error: "We could not remove that section.",
      });
    } catch {
      upsertProjectRecord(previousProject);
      queryClient.invalidateQueries({
        queryKey: ["workspace-project-tasks", workspaceId, projectId],
      });
    }
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setExpandedWorkflowIds((current) =>
      current.includes(workflowId)
        ? current.filter((item) => item !== workflowId)
        : [...current, workflowId],
    );
  };

  const openCreateWorkflow = () => {
    setWorkflowSheetState({
      mode: "create",
    });
  };

  const openEditWorkflow = (workflowId: string) => {
    setWorkflowSheetState({ mode: "edit", workflowId });
  };

  const openCreateTask = (
    workflowId: string,
    defaults?: Partial<ProjectTaskEditorValues>,
  ) => {
    setTaskSheetState({ mode: "create", workflowId, defaults });
  };

  const openEditTask = (workflowId: string, taskId: string) => {
    setTaskSheetState({ mode: "edit", workflowId, taskId });
  };

  const openCreateSubtask = (workflowId: string, taskId: string) => {
    setTaskSheetState({
      mode: "edit",
      workflowId,
      taskId,
      expandSubtasks: true,
      seedBlankSubtask: true,
    });
  };

  const openEditSubtask = (
    workflowId: string,
    taskId: string,
    subtaskId?: string,
  ) => {
    void subtaskId;
    setTaskSheetState({
      mode: "edit",
      workflowId,
      taskId,
      expandSubtasks: true,
    });
  };

  const taskMatchesQueryScope = (
    task: {
      workflowId: string;
      teamId: string;
      pipelineId: string;
      dueDate: string;
      status: ProjectTaskStatus;
    },
    params?: {
      workflowId?: string;
      teamId?: string;
      pipelineId?: string;
      startDate?: string;
      statusFilter?: string;
    },
  ) => {
    if (!params) {
      return true;
    }

    if (params.workflowId && task.workflowId !== params.workflowId) {
      return false;
    }

    if (params.teamId && params.teamId !== "all" && task.teamId !== params.teamId) {
      return false;
    }

    if (params.pipelineId && task.pipelineId !== params.pipelineId) {
      return false;
    }

    if (params.startDate) {
      const minimumDate = new Date(params.startDate);
      const dueDate = new Date(task.dueDate);

      if (
        Number.isNaN(minimumDate.getTime()) ||
        Number.isNaN(dueDate.getTime()) ||
        dueDate < minimumDate
      ) {
        return false;
      }
    }

    if (params.statusFilter === "blocked") {
      return task.status === "blocked";
    }

    if (params.statusFilter === "completed") {
      return task.status === "done";
    }

    if (params.statusFilter === "open") {
      return task.status !== "done";
    }

    return true;
  };

  const patchTaskQueryCaches = (
    updater: (tasks: WorkspaceProjectTaskRecord[]) => WorkspaceProjectTaskRecord[],
  ) => {
    if (!workspaceId) {
      return;
    }

    const queryEntries = queryClient.getQueriesData({
      queryKey: ["workspace-project-tasks", workspaceId, projectId],
    });

    queryEntries.forEach(([queryKey, response]) => {
      const typedResponse = response as
        | {
            data?: {
              message?: string;
              tasks?: WorkspaceProjectTaskRecord[];
            };
          }
        | undefined;

      const currentTasks = typedResponse?.data?.tasks;

      if (!Array.isArray(currentTasks)) {
        return;
      }

      const params = (Array.isArray(queryKey) ? queryKey[3] : undefined) as
        | {
            workflowId?: string;
            teamId?: string;
            pipelineId?: string;
            startDate?: string;
            statusFilter?: string;
          }
        | undefined;

      const nextTasks = updater(currentTasks).filter((task) =>
        taskMatchesQueryScope(
          task as {
            workflowId: string;
            teamId: string;
            pipelineId: string;
            dueDate: string;
            status: ProjectTaskStatus;
          },
          params,
        ),
      );

      queryClient.setQueryData(queryKey, {
        ...typedResponse,
        data: {
          ...typedResponse?.data,
          tasks: nextTasks,
        },
      });
    });
  };

  const moveTaskToStatus = (
    workflowId: string,
    taskId: string,
    nextStatus: ProjectTaskStatus,
    sectionId?: string,
  ) => {
    const previousProject = project;

    updateProject(projectId, (currentProject) => {
      const nextWorkflows = currentProject.workflows.map((workflow) => {
        if (workflow.id !== workflowId) {
          return workflow;
        }

        const nextTasks = workflow.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: nextStatus,
                sectionId,
                updatedAt: "Just now",
              }
            : task,
        );

        return syncWorkflowDerivedFields({
          ...workflow,
          updatedAt: "Just now",
          tasks: nextTasks,
        });
      });

      return syncProjectRecord(currentProject, nextWorkflows);
    });

    patchTaskQueryCaches((tasks) =>
      tasks.map((task) =>
        String(task.id) === taskId
          ? {
              ...task,
              status: nextStatus,
              sectionId,
              updatedAt: "Just now",
            }
          : task,
      ),
    );

    if (!workspaceId) {
      return;
    }

    updateWorkspaceProjectTaskMutation.mutate(
      {
        workspaceId,
        projectId,
        workflowId,
        taskId,
        updates: {
          status: nextStatus,
          sectionId: sectionId ?? "",
        },
      },
      {
        onError: () => {
          if (previousProject) {
            upsertProjectRecord(previousProject);
          }

          queryClient.invalidateQueries({
            queryKey: ["workspace-project-tasks", workspaceId, projectId],
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["workspace-project-tasks", workspaceId, projectId],
          });
        },
      },
    );
  };

  const handleWorkflowSubmit = (values: ProjectWorkflowEditorValues) => {
    const payload = {
      name: values.name.trim(),
    };

    if (!payload.name) {
      toast("Workflow name is required.");
      return;
    }

    if (!workspaceId) {
      toast("Open this project from a workspace to manage workflows.");
      return;
    }

    if (workflowSheetState?.mode === "edit" && workflowSheetState.workflowId) {
      updateWorkspaceProjectWorkflowMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId: workflowSheetState.workflowId,
          updates: payload,
        },
        {
          onSuccess: () => {
            toast("Workflow updated.");
            setWorkflowSheetState(null);
          },
        },
      );
      return;
    }

    createWorkspaceProjectWorkflowMutation.mutate(
      {
        workspaceId,
        projectId,
        payload,
      },
      {
        onSuccess: () => {
          toast("Workflow created.");
          setWorkflowSheetState(null);
        },
      },
    );
  };

  const handleTaskSubmit = (values: ProjectTaskEditorValues) => {
    if (!taskSheetState) {
      return;
    }

    if (!workspaceId) {
      toast("Open this project from a workspace to manage tasks.");
      return;
    }

    const payload = {
      title: values.title.trim(),
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId || undefined,
      teamId: values.teamId,
      pipelineId: values.pipelineId,
      startDate: values.startDate,
      dueDate: values.dueDate,
      sectionId: values.sectionId || undefined,
      subtasks: values.subtasks ?? [],
    };

    if (!payload.title) {
      toast("Task title is required.");
      return;
    }

    if (taskSheetState.mode === "edit" && taskSheetState.taskId) {
      updateWorkspaceProjectTaskMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId: taskSheetState.workflowId,
          taskId: taskSheetState.taskId,
          updates: payload,
        },
        {
          onSuccess: () => {
            toast("Task updated.");
            setTaskSheetState(null);
          },
        },
      );
      return;
    }

    createWorkspaceProjectTaskMutation.mutate(
      {
        workspaceId,
        projectId,
        workflowId: taskSheetState.workflowId,
        payload,
      },
      {
        onSuccess: () => {
          toast("Task created.");
          setTaskSheetState(null);
        },
      },
    );
  };

  const handleWorkflowAction = (
    label: string,
    workflowId: string,
    workflowName?: string,
  ) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage workflows.");
      return;
    }

    if (label === "Archive workflow") {
      if (!window.confirm(`Archive ${workflowName ?? "this workflow"}?`)) {
        return;
      }

      archiveWorkspaceProjectWorkflowMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId,
        },
        {
          onSuccess: () => {
            toast(`Workflow archived: ${workflowName ?? "Workflow"}`);
          },
        },
      );
      return;
    }

    if (label === "Restore workflow") {
      unarchiveWorkspaceProjectWorkflowMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId,
        },
        {
          onSuccess: () => {
            toast(`Workflow restored: ${workflowName ?? "Workflow"}`);
          },
        },
      );
      return;
    }

    if (label === "Delete workflow") {
      if (
        !window.confirm(
          `Delete ${workflowName ?? "this workflow"}? This cannot be undone.`,
        )
      ) {
        return;
      }

      deleteWorkspaceProjectWorkflowMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId,
        },
        {
          onSuccess: () => {
            toast(`Workflow deleted: ${workflowName ?? "Workflow"}`);
          },
        },
      );
      return;
    }

    handlePlaceholderAction(label, workflowName);
  };

  const handleTaskAction = (
    label: string,
    workflowId: string,
    taskId: string,
    taskName?: string,
  ) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage tasks.");
      return;
    }

    if (label === "Delete task") {
      if (
        !window.confirm(
          `Delete ${taskName ?? "this task"}? This cannot be undone.`,
        )
      ) {
        return;
      }

      deleteWorkspaceProjectTaskMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId,
          taskId,
        },
        {
          onSuccess: () => {
            toast(`Task deleted: ${taskName ?? "Task"}`);
          },
        },
      );
      return;
    }

    handlePlaceholderAction(label, taskName);
  };

  const handleSubtaskAction = (
    label: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
    subtaskName?: string,
  ) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage subtasks.");
      return;
    }

    if (label === "Delete subtask") {
      if (
        !window.confirm(
          `Delete ${subtaskName ?? "this subtask"}? This cannot be undone.`,
        )
      ) {
        return;
      }

      deleteWorkspaceProjectSubtaskMutation.mutate(
        {
          workspaceId,
          projectId,
          workflowId,
          taskId,
          subtaskId,
        },
        {
          onSuccess: () => {
            toast(`Subtask deleted: ${subtaskName ?? "Subtask"}`);
          },
        },
      );
      return;
    }

    handlePlaceholderAction(label, subtaskName);
  };

  const handleRiskRecordSynced = (
    nextRecord: (typeof project) | null | undefined,
  ) => {
    if (!nextRecord) {
      return;
    }

    upsertProjectRecord(nextRecord);
  };

  const invalidateRiskQueries = () => {
    if (!workspaceId) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["workspace-project-risks", workspaceId, projectId],
    });
    queryClient.invalidateQueries({
      queryKey: ["workspace-project-risk-detail", workspaceId, projectId],
    });
  };

  const handleOverviewRiskAction = (
    action: "open-details" | "resolve" | "close" | "delete",
    risk: (typeof visibleRiskItems)[number],
  ) => {
    if (action === "open-details") {
      setRiskView(risk.kind);
      setActiveTab("risks-issues");
      return;
    }

    if (!workspaceId) {
      toast("Open this project from a workspace to manage risks.");
      return;
    }

    if (action === "resolve") {
      void toast.promise(
        resolveWorkspaceProjectRiskMutation.mutateAsync({
          workspaceId,
          projectId,
          riskId: risk.id,
        }),
        {
          loading: "Resolving...",
          success: () => {
            invalidateRiskQueries();
            return "Marked as resolved.";
          },
          error: "Could not resolve this record.",
        },
      );
      return;
    }

    if (action === "close") {
      void toast.promise(
        closeWorkspaceProjectRiskMutation.mutateAsync({
          workspaceId,
          projectId,
          riskId: risk.id,
        }),
        {
          loading: "Closing...",
          success: () => {
            invalidateRiskQueries();
            return "Closed.";
          },
          error: "Could not close this record.",
        },
      );
      return;
    }

    if (
      !window.confirm(
        `Delete "${risk.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    void toast.promise(
      deleteWorkspaceProjectRiskMutation.mutateAsync({
        workspaceId,
        projectId,
        riskId: risk.id,
      }),
      {
        loading: "Deleting...",
        success: () => {
          invalidateRiskQueries();
          return "Deleted.";
        },
        error: "Could not delete this record.",
      },
    );
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 pb-6 md:gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground text-[12px] font-medium uppercase tracking-[0.08em]">
            Project summary
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSummaryExpanded((current) => !current)}
          >
            {summaryExpanded ? "Hide summary" : "Show summary"}
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                !summaryExpanded && "rotate-180",
              )}
            />
          </Button>
        </div>

        {summaryExpanded ? (
          <>
            <ProjectOverviewHeader
              project={project}
              selectedPipeline={selectedPipeline}
              visibleMembers={visibleMembers}
              scopedTeamCount={scopedTeams.length}
              taskTotal={
                visibleWorkflowTaskCounts.total
                  ? visibleWorkflowTaskCounts.total
                  : scopedTaskCounts.total
              }
              dueWindow={scopedDueWindow}
              onArchiveProject={handleArchiveProject}
              archivePending={updateWorkspaceProjectMutation.isPending}
            />

            <ProjectOverviewStatCards
              project={project}
              selectedPipeline={selectedPipeline}
              scopedTeamCount={scopedTeams.length}
              taskCounts={
                visibleWorkflowTaskCounts.total
                  ? visibleWorkflowTaskCounts
                  : scopedTaskCounts
              }
              members={visibleMembers}
              progress={scopedProgress}
              riskHint={scopedRiskHint}
              nearestMilestone={nearestMilestone}
              workflowCount={visibleWorkflows.length}
              workloadSummary={workloadSummary}
            />
          </>
        ) : null}

        <div className="sticky top-0 z-20 -mx-1 border-b border-border/20 bg-background/85 px-1 py-2 backdrop-blur-sm">
          <ProjectOverviewTabs value={activeTab} onValueChange={setActiveTab} />
        </div>

        {activeTab === "overview" ? (
          <>
            <ProjectOverviewWorkflowTable
              workflows={overviewWorkflows}
              members={project.members}
              teams={project.teams}
              selectedPipeline={selectedPipeline}
              selectedTeamId={teamFilter}
              onTeamChange={setTeamFilter}
              startDate={startDate}
              onStartDateChange={setStartDate}
              view={workflowView}
              onViewChange={setWorkflowView}
              sortMode={workflowSortMode}
              onSortModeChange={setWorkflowSortMode}
              pagination={overviewWorkflowPagination}
              loading={workflowListQuery.isLoading || workflowListQuery.isFetching}
              onPreviousPage={() => setWorkflowPage((current) => Math.max(1, current - 1))}
              onNextPage={() =>
                setWorkflowPage((current) =>
                  overviewWorkflowPagination?.hasNextPage ? current + 1 : current,
                )
              }
              expandedWorkflowIds={expandedWorkflowIds}
              onToggleWorkflow={handleToggleWorkflow}
              onCreateWorkflow={openCreateWorkflow}
              onEditWorkflow={openEditWorkflow}
              onCreateTask={openCreateTask}
              onEditTask={openEditTask}
              onCreateSubtask={openCreateSubtask}
              onWorkflowAction={handleWorkflowAction}
              onTaskAction={handleTaskAction}
            />

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <ProjectOverviewRisks
                view={riskView}
                onViewChange={setRiskView}
                items={visibleRiskItems}
                currentUserId={currentUserId}
                onAction={handleOverviewRiskAction}
              />
              <ProjectOverviewActivity
                projectId={projectId}
                selectedPipelineId={selectedPipeline?.id}
                selectedTeamId={teamFilter}
                fallbackActivities={visibleActivities}
              />
            </div>
          </>
        ) : activeTab === "workflows" ? (
          <ProjectWorkflowsTab
            workflows={workflowsTabWorkflows}
            loading={workflowsTabListQuery.isLoading || workflowsTabListQuery.isFetching}
            archivedWorkflows={workflowsTabArchivedWorkflows}
            sortMode={workflowsTabSortMode}
            onSortModeChange={setWorkflowsTabSortMode}
            pagination={workflowsTabListQuery.data?.data?.pagination ?? null}
            onPreviousPage={() => setWorkflowsTabPage((current) => Math.max(1, current - 1))}
            onNextPage={() =>
              setWorkflowsTabPage((current) =>
                workflowsTabListQuery.data?.data?.pagination?.hasNextPage ? current + 1 : current,
              )
            }
            members={project.members}
            teams={project.teams}
            selectedPipeline={selectedPipeline}
            selectedTeamId={teamFilter}
            onTeamChange={setTeamFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            view={workflowView}
            onViewChange={setWorkflowView}
            onCreateWorkflow={openCreateWorkflow}
            onEditWorkflow={openEditWorkflow}
            onCreateTask={openCreateTask}
            onEditTask={openEditTask}
            onCreateSubtask={openCreateSubtask}
            onEditSubtask={openEditSubtask}
            onWorkflowAction={handleWorkflowAction}
            onTaskAction={handleTaskAction}
            onSubtaskAction={handleSubtaskAction}
          />
        ) : activeTab === "dos" ? (
          <ProjectDosTab
            projectId={projectId}
            project={project}
            members={project.members}
            teams={project.teams}
            selectedPipeline={selectedPipeline}
            selectedTeamId={teamFilter}
            onTeamChange={setTeamFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            onCreateTask={openCreateTask}
            onEditTask={openEditTask}
            onCreateSubtask={openCreateSubtask}
            onEditSubtask={openEditSubtask}
            onMoveTask={moveTaskToStatus}
            onTaskAction={handleTaskAction}
            onSubtaskAction={handleSubtaskAction}
            onCreateCustomSection={handleCreateCustomSection}
            onDeleteCustomSection={handleDeleteCustomSection}
          />
        ) : activeTab === "files-assets" ? (
          <ProjectFilesAssetsTab project={project} members={project.members} />
        ) : activeTab === "risks-issues" ? (
          <ProjectRisksIssuesTab
            workspaceId={workspaceId}
            projectId={projectId}
            view={riskView}
            onViewChange={setRiskView}
            selectedPipeline={selectedPipeline}
            selectedTeamId={teamFilter}
            onTeamChange={setTeamFilter}
            teams={project.teams}
            members={project.members}
            onProjectRecordSynced={handleRiskRecordSynced}
          />
        ) : activeTab === "secrets" ? (
          <ProjectSecretsTab
            workspaceId={workspaceId}
            projectId={projectId}
            members={project.members}
            teams={project.teams}
          />
        ) : activeTab === "agents-automation" ? (
          <ProjectAgentsAutomationTab project={project} />
        ) : (
          <ProjectOverviewPlaceholder kind="coming-soon" label="coming soon" />
        )}
      </div>

      {workflowSheetState ? (
        <ProjectWorkflowSheet
          key={`workflow-${workflowSheetState.mode}-${workflowSheetState.workflowId ?? "new"}`}
          open
          mode={workflowSheetState.mode}
          initialValues={
            workflowSheetState.mode === "edit" && workflowForSheet
              ? {
                  name: workflowForSheet.name,
                }
              : workflowSheetState.defaults
          }
          onOpenChange={(open) => {
            if (!open) {
              setWorkflowSheetState(null);
            }
          }}
          onSubmit={handleWorkflowSubmit}
        />
      ) : null}

      {taskSheetState && taskSheetWorkflow ? (
        <ProjectTaskSheet
          key={`task-${taskSheetState.mode}-${taskSheetState.taskId ?? "new"}-${taskSheetState.seedBlankSubtask ? "seed" : "plain"}`}
          open
          mode={taskSheetState.mode}
          workflowName={taskSheetWorkflow.name}
          members={project.members}
          teams={project.teams}
          pipelines={project.pipelines}
          sections={project.customSections ?? []}
          initialValues={
            taskSheetState.mode === "edit" && taskForSheet
              ? {
                  title: taskForSheet.title,
                  status: taskForSheet.status,
                  priority: taskForSheet.priority,
                  assigneeId: taskForSheet.assigneeId,
                  teamId: taskForSheet.teamId,
                  pipelineId: taskForSheet.pipelineId,
                  startDate: taskForSheet.startDate ?? taskForSheet.dueDate,
                  dueDate: taskForSheet.dueDate,
                  sectionId: taskForSheet.sectionId,
                  subtasks: (taskForSheet.subtasks ?? []).map((subtask) => ({
                    title: subtask.title,
                    status: subtask.status,
                    assigneeId: subtask.assigneeId,
                    startDate: subtask.startDate ?? subtask.dueDate,
                    dueDate: subtask.dueDate,
                  })),
                }
              : {
                  assigneeId: taskSheetWorkflow.ownerId,
                  teamId: taskSheetWorkflow.teamId,
                  pipelineId: taskSheetWorkflow.pipelineId,
                  startDate: taskSheetWorkflow.startedAt,
                  dueDate: taskSheetWorkflow.targetEndDate,
                  ...(taskSheetState.defaults ?? {}),
                }
          }
          initiallyExpandSubtasks={taskSheetState.expandSubtasks}
          seedBlankSubtask={taskSheetState.seedBlankSubtask}
          onOpenChange={(open) => {
            if (!open) {
              setTaskSheetState(null);
            }
          }}
          onSubmit={handleTaskSubmit}
          loading={
            createWorkspaceProjectTaskMutation?.isPending ||
            updateWorkspaceProjectTaskMutation?.isPending
          }
        />
      ) : null}
    </>
  );
}
