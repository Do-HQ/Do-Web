"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkspaceProjectTaskRecord } from "@/types/project";
import { useQueryClient } from "@tanstack/react-query";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspacePortfolio from "@/hooks/use-workspace-portfolio";
import useWorkspace from "@/hooks/use-workspace";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
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
  ProjectWorkflowSubtask,
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

type WorkflowArchiveDialogState = {
  workflowId: string;
  workflowName?: string;
} | null;

function buildDueWindow(startDate: string, targetEndDate: string) {
  if (!startDate || !targetEndDate) {
    return "No date range";
  }

  return `${formatShortDate(startDate)} - ${formatShortDate(targetEndDate)}`;
}

function normalizeMemberName(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getInitialsFromName(value?: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "U";
  }

  return (
    normalized
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token[0]?.toUpperCase() || "")
      .join("") || "U"
  );
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

function deriveStatusFromSubtasks(subtasks: Array<{ status: ProjectTaskStatus }>) {
  if (!subtasks.length) {
    return null;
  }

  if (subtasks.every((subtask) => subtask.status === "done")) {
    return "done";
  }

  if (subtasks.some((subtask) => subtask.status === "in-progress")) {
    return "in-progress";
  }

  if (subtasks.some((subtask) => subtask.status === "review")) {
    return "review";
  }

  if (subtasks.some((subtask) => subtask.status === "blocked")) {
    return "blocked";
  }

  return "todo";
}

function alignTaskSubtasksForLaneMove(
  task: ProjectWorkflow["tasks"][number] | undefined,
  nextStatus: ProjectTaskStatus,
): ProjectWorkflowSubtask[] {
  const subtasks: ProjectWorkflowSubtask[] = Array.isArray(task?.subtasks)
    ? (task.subtasks as ProjectWorkflowSubtask[])
    : [];

  if (!subtasks.length) {
    return subtasks;
  }

  const nextSubtasks: ProjectWorkflowSubtask[] = subtasks.map((subtask) => ({
    ...subtask,
    status: (subtask.status as ProjectTaskStatus) ?? "todo",
    updatedAt: "Just now",
  }));

  const currentDerivedStatus = deriveStatusFromSubtasks(nextSubtasks);

  if (currentDerivedStatus === nextStatus) {
    return nextSubtasks;
  }

  if (nextStatus === "done") {
    return nextSubtasks.map((subtask) => ({
      ...subtask,
      status: "done" as const,
      updatedAt: "Just now",
    }));
  }

  if (nextStatus === "blocked") {
    const hasOpenSubtask = nextSubtasks.some((subtask) => subtask.status !== "done");

    if (!hasOpenSubtask) {
      nextSubtasks[0] = {
        ...nextSubtasks[0],
        status: "blocked",
        updatedAt: "Just now",
      };
      return nextSubtasks;
    }

    return nextSubtasks.map((subtask) =>
      subtask.status === "done"
        ? subtask
        : {
            ...subtask,
            status: "blocked" as ProjectTaskStatus,
            updatedAt: "Just now",
          },
    );
  }

  if (nextStatus === "in-progress" || nextStatus === "review") {
    const activeStatus: ProjectTaskStatus = nextStatus === "review" ? "review" : "in-progress";
    const hasOpenSubtask = nextSubtasks.some((subtask) => subtask.status !== "done");

    if (!hasOpenSubtask) {
      nextSubtasks[0] = {
        ...nextSubtasks[0],
        status: activeStatus,
        updatedAt: "Just now",
      };
      return nextSubtasks;
    }

    return nextSubtasks.map((subtask) =>
      subtask.status === "done"
        ? subtask
        : {
            ...subtask,
            status: activeStatus as ProjectTaskStatus,
            updatedAt: "Just now",
          },
    );
  }

  if (nextStatus === "todo") {
    if (nextSubtasks.every((subtask) => subtask.status === "done")) {
      nextSubtasks[0] = {
        ...nextSubtasks[0],
        status: "todo",
        updatedAt: "Just now",
      };
      return nextSubtasks;
    }

    return nextSubtasks.map((subtask) =>
      subtask.status === "done"
        ? subtask
        : {
            ...subtask,
            status: "todo" as ProjectTaskStatus,
            updatedAt: "Just now",
          },
    );
  }

  return nextSubtasks;
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
  initialWorkflowId,
  initialTaskId,
  initialRiskId,
}: ProjectOverviewProps) {
  const { workspaceId } = useWorkspaceStore();
  const workspacePermissions = useWorkspacePermissions();
  const queryClient = useQueryClient();
  const workspaceHook = useWorkspace();
  const workspacePortfolioHook = useWorkspacePortfolio();
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
  const pendingTaskCreateProjectId = useProjectStore(
    (state) => state.pendingTaskCreateProjectId,
  );
  const updateProject = useProjectStore((state) => state.updateProject);
  const upsertProjectRecord = useProjectStore(
    (state) => state.upsertProjectRecord,
  );
  const projectsLoaded = useProjectStore((state) => state.projectsLoaded);
  const consumeWorkflowCreateRequest = useProjectStore(
    (state) => state.consumeWorkflowCreateRequest,
  );
  const consumeTaskCreateRequest = useProjectStore(
    (state) => state.consumeTaskCreateRequest,
  );
  const projectDetailQuery = useWorkspaceProjectDetail(
    workspaceId ?? "",
    projectId,
    {
      enabled: Boolean(workspaceId),
    },
  );
  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(
    workspaceId ?? "",
    {
      page: 1,
      limit: 500,
      search: "",
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
  const { useCreateWorkspaceTaskDependency } = workspacePortfolioHook;
  const createWorkspaceTaskDependencyMutation = useCreateWorkspaceTaskDependency();

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
  const [workflowArchiveDialogState, setWorkflowArchiveDialogState] =
    useState<WorkflowArchiveDialogState>(null);
  const canManageProjectInvites = workspacePermissions.canManageProjectInvites;
  const canArchiveProjects = workspacePermissions.canArchiveProjects;
  const canCreateWorkflows = workspacePermissions.canCreateWorkflows;

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
    if (!project) {
      return;
    }

    if (pendingTaskCreateProjectId !== projectId) {
      return;
    }

    const pendingTask = consumeTaskCreateRequest(projectId);
    if (!pendingTask) {
      return;
    }

    const nextWorkflow =
      project.workflows.find(
        (workflow) =>
          !workflow.archived &&
          pendingTask.workflowId &&
          workflow.id === pendingTask.workflowId,
      ) ??
      project.workflows.find((workflow) => !workflow.archived) ??
      null;

    if (!nextWorkflow) {
      toast("Create a workflow first, then add tasks.");
      setActiveTab("workflows");
      setWorkflowSheetState({ mode: "create" });
      return;
    }

    setActiveTab("dos");
    setTaskSheetState({
      mode: "create",
      workflowId: nextWorkflow.id,
    });
  }, [
    consumeTaskCreateRequest,
    pendingTaskCreateProjectId,
    project,
    projectId,
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

  const currentUserAvatarUrl =
    String(user?.profilePhoto?.url || "").trim() || undefined;

  const memberProfileIndexes = useMemo(() => {
    const entries = workspacePeopleQuery.data?.data?.members ?? [];
    const byAnyId = new Map<
      string,
      {
        userId: string;
        workspaceMemberId: string;
        name: string;
        normalizedName: string;
        email: string;
        initials: string;
        avatarUrl?: string;
      }
    >();
    const byName = new Map<
      string,
      {
        userId: string;
        workspaceMemberId: string;
        name: string;
        normalizedName: string;
        email: string;
        initials: string;
        avatarUrl?: string;
      }
    >();

    for (const entry of entries) {
      const userRecord = entry?.userId;
      const workspaceMemberId = String(entry?._id || "").trim();
      const userId = String(userRecord?._id || "").trim();

      if (!userId && !workspaceMemberId) {
        continue;
      }

      const firstName = String(userRecord?.firstName || "").trim();
      const lastName = String(userRecord?.lastName || "").trim();
      const email = String(userRecord?.email || "").trim();
      const displayName =
        `${firstName} ${lastName}`.trim() || email || "Project member";
      const normalizedName = normalizeMemberName(displayName);
      const profile = {
        userId,
        workspaceMemberId,
        name: displayName,
        normalizedName,
        email: email.toLowerCase(),
        initials: getInitialsFromName(displayName),
        avatarUrl: String(userRecord?.profilePhoto?.url || "").trim() || undefined,
      };

      if (userId) {
        byAnyId.set(userId, profile);
      }

      if (workspaceMemberId) {
        byAnyId.set(workspaceMemberId, profile);
      }

      if (normalizedName && !byName.has(normalizedName)) {
        byName.set(normalizedName, profile);
      }
    }

    return {
      byAnyId,
      byName,
    };
  }, [workspacePeopleQuery.data]);

  const resolvedMembers = useMemo(
    () => {
      const baseMembers = Array.isArray(project?.members) ? project.members : [];
      const memberIdSet = new Set<string>();

      for (const member of baseMembers) {
        const memberId = String(member.id || "").trim();

        if (memberId) {
          memberIdSet.add(memberId);
        }
      }

      for (const team of project?.teams ?? []) {
        for (const memberId of team.memberIds ?? []) {
          const normalizedId = String(memberId || "").trim();

          if (normalizedId) {
            memberIdSet.add(normalizedId);
          }
        }
      }

      for (const workflow of project?.workflows ?? []) {
        const ownerId = String(workflow.ownerId || "").trim();

        if (ownerId) {
          memberIdSet.add(ownerId);
        }

        for (const task of workflow.tasks ?? []) {
          const assigneeId = String(task.assigneeId || "").trim();

          if (assigneeId) {
            memberIdSet.add(assigneeId);
          }

          for (const subtask of task.subtasks ?? []) {
            const subtaskAssigneeId = String(subtask.assigneeId || "").trim();

            if (subtaskAssigneeId) {
              memberIdSet.add(subtaskAssigneeId);
            }
          }
        }
      }

      for (const risk of project?.risks ?? []) {
        const ownerUserId = String(risk.ownerUserId || "").trim();
        const createdByUserId = String(risk.createdByUserId || "").trim();
        const resolvedByUserId = String(risk.resolvedByUserId || "").trim();
        const closedByUserId = String(risk.closedByUserId || "").trim();

        if (ownerUserId) {
          memberIdSet.add(ownerUserId);
        }
        if (createdByUserId) {
          memberIdSet.add(createdByUserId);
        }
        if (resolvedByUserId) {
          memberIdSet.add(resolvedByUserId);
        }
        if (closedByUserId) {
          memberIdSet.add(closedByUserId);
        }

        for (const comment of risk.comments ?? []) {
          const authorUserId = String(comment.authorUserId || "").trim();

          if (authorUserId) {
            memberIdSet.add(authorUserId);
          }
        }
      }

      const resolved = baseMembers.map((member) => {
        const memberId = String(member.id || "").trim();
        const memberName = String(member.name || "").trim();
        const normalizedMemberName = normalizeMemberName(memberName);
        const memberAvatar = String(member.avatarUrl || "").trim();
        const memberInitials = String(member.initials || "").trim();
        let profile = memberId
          ? memberProfileIndexes.byAnyId.get(memberId)
          : undefined;

        if (
          profile &&
          normalizedMemberName &&
          profile.normalizedName &&
          profile.normalizedName !== normalizedMemberName &&
          !profile.normalizedName.includes(normalizedMemberName) &&
          !normalizedMemberName.includes(profile.normalizedName)
        ) {
          profile = undefined;
        }

        if (!profile && normalizedMemberName) {
          profile = memberProfileIndexes.byName.get(normalizedMemberName);
        }

        const shouldUseProfileAvatar =
          Boolean(profile?.avatarUrl) &&
          (!memberAvatar ||
            (Boolean(currentUserAvatarUrl) &&
              memberAvatar === currentUserAvatarUrl &&
              Boolean(memberId) &&
              memberId !== currentUserId));

        return {
          ...member,
          id: memberId || profile?.userId || profile?.workspaceMemberId || member.id,
          name: memberName || profile?.name || "Project member",
          initials:
            memberInitials ||
            profile?.initials ||
            getInitialsFromName(memberName || profile?.name),
          avatarUrl: shouldUseProfileAvatar
            ? profile?.avatarUrl
            : member.avatarUrl || profile?.avatarUrl,
        };
      });

      const existingIds = new Set(
        resolved.map((member) => String(member.id || "").trim()).filter(Boolean),
      );

      for (const memberId of memberIdSet) {
        if (existingIds.has(memberId)) {
          continue;
        }

        const profile = memberProfileIndexes.byAnyId.get(memberId);

        if (!profile) {
          continue;
        }

        const canonicalId = profile.userId || profile.workspaceMemberId || memberId;

        if (existingIds.has(canonicalId)) {
          continue;
        }

        existingIds.add(canonicalId);
        resolved.push({
          id: canonicalId,
          name: profile.name || "Project member",
          initials: profile.initials || getInitialsFromName(profile.name),
          role: "Project member",
          avatarUrl: profile.avatarUrl,
          active: true,
          teamIds:
            (project?.teams ?? [])
              .filter((team) =>
                (team.memberIds ?? []).some(
                  (teamMemberId) =>
                    String(teamMemberId || "").trim() === memberId ||
                    String(teamMemberId || "").trim() === profile.userId ||
                    String(teamMemberId || "").trim() === profile.workspaceMemberId,
                ),
              )
              .map((team) => team.id) ?? [],
        });
      }

      return resolved;
    },
    [
      currentUserAvatarUrl,
      currentUserId,
      memberProfileIndexes.byAnyId,
      memberProfileIndexes.byName,
      project?.members,
      project?.risks,
      project?.teams,
      project?.workflows,
    ],
  );

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

  const visibleMembers = resolvedMembers.filter((member) =>
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

  const getDefaultKanbanLaneOrder = (record: typeof project) => [
    "status:todo",
    "status:in-progress",
    "status:review",
    "status:blocked",
    "status:done",
    ...((record.customSections ?? []).map((section) => `custom:${section.id}`)),
  ];

  const resolveKanbanLaneOrder = (record: typeof project) => {
    const defaultOrder = getDefaultKanbanLaneOrder(record);
    const available = new Set(defaultOrder);
    const storedOrder = (record.kanbanLaneOrder ?? [])
      .map((item) => String(item || "").trim())
      .filter((item) => available.has(item));

    return [
      ...storedOrder,
      ...defaultOrder.filter((item) => !storedOrder.includes(item)),
    ];
  };

  const handleArchiveProject = async () => {
    if (!canArchiveProjects) {
      toast("Only workspace owners/admins can archive projects.");
      return;
    }

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
    const nextLaneOrder = [
      ...resolveKanbanLaneOrder(project),
      `custom:${nextSection.id}`,
    ];
    const nextRecord = {
      ...project,
      customSections: [...(project.customSections ?? []), nextSection],
      kanbanLaneOrder: nextLaneOrder,
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
        kanbanLaneOrder: resolveKanbanLaneOrder(project).filter(
          (laneId) => laneId !== `custom:${sectionId}`,
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

  const handleReorderKanbanLanes = async (laneOrder: string[]) => {
    const available = new Set(getDefaultKanbanLaneOrder(project));
    const normalized = [...new Set(laneOrder.map((item) => String(item || "").trim()))].filter(
      (item) => Boolean(item) && available.has(item),
    );

    if (!normalized.length) {
      return;
    }

    const previousProject = project;
    const nextRecord = {
      ...project,
      kanbanLaneOrder: normalized,
    };

    upsertProjectRecord(nextRecord);

    if (!workspaceId) {
      return;
    }

    try {
      await updateWorkspaceProjectMutation.mutateAsync({
        workspaceId,
        projectId,
        updates: {
          record: nextRecord,
        },
      });
    } catch {
      upsertProjectRecord(previousProject);
      toast("We could not save board order.");
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
    if (!canCreateWorkflows) {
      toast("You do not have permission to create workflows in this workspace.");
      return;
    }

    setWorkflowSheetState({
      mode: "create",
    });
  };

  const openEditWorkflow = (workflowId: string) => {
    if (!canCreateWorkflows) {
      toast("You do not have permission to edit workflows in this workspace.");
      return;
    }

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

  const dependencyTaskOptions = project.workflows
    .filter((workflow) => !workflow.archived)
    .flatMap((workflow) =>
      workflow.tasks.map((task) => ({
        id: String(task.id || "").trim(),
        title: String(task.title || "").trim() || "Untitled task",
        workflowId: String(workflow.id || "").trim(),
        workflowName: String(workflow.name || "").trim() || "Workflow",
      })),
    )
    .filter((option) => option.id);

  const moveTaskToStatus = (
    workflowId: string,
    taskId: string,
    nextStatus: ProjectTaskStatus,
    sectionId?: string,
  ) => {
    const previousProject = project;
    const existingWorkflow = project?.workflows?.find(
      (workflow) => workflow.id === workflowId,
    );
    const existingTask = existingWorkflow?.tasks?.find((task) => task.id === taskId);
    const nextSubtasks = alignTaskSubtasksForLaneMove(existingTask, nextStatus);

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
                subtasks: nextSubtasks,
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
              subtasks: nextSubtasks,
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
          subtasks: nextSubtasks.map((subtask) => ({
            title: subtask.title,
            status: subtask.status,
            assigneeId: subtask.assigneeId,
            startDate: subtask.startDate || "",
            dueDate: subtask.dueDate,
          })),
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
    if (!canCreateWorkflows) {
      toast("You do not have permission to manage workflows in this workspace.");
      return;
    }

    const payload = {
      name: values.name.trim(),
      teamId: values.teamId,
      pipelineId: selectedPipeline?.id,
    };

    if (!payload.name) {
      toast("Workflow name is required.");
      return;
    }

    if (!payload.teamId) {
      toast("Workflow team is required.");
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

  const handleTaskSubmit = async (values: ProjectTaskEditorValues) => {
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

    try {
      const createResponse = await createWorkspaceProjectTaskMutation.mutateAsync({
        workspaceId,
        projectId,
        workflowId: taskSheetState.workflowId,
        payload,
      });

      const createdTaskId = String(createResponse.data?.task?.id || "").trim();
      const nextDependencyTaskIds = [
        ...new Set(
          (values.dependencyTaskIds ?? [])
            .map((taskId) => String(taskId || "").trim())
            .filter(Boolean),
        ),
      ].filter((taskId) => taskId !== createdTaskId);

      if (createdTaskId && nextDependencyTaskIds.length) {
        const dependencyResults = await Promise.allSettled(
          nextDependencyTaskIds.map((sourceTaskId) =>
            createWorkspaceTaskDependencyMutation.mutateAsync({
              workspaceId,
              payload: {
                projectId,
                sourceTaskId,
                targetTaskId: createdTaskId,
              },
            }),
          ),
        );
        const failedCount = dependencyResults.filter(
          (result) => result.status === "rejected",
        ).length;

        if (failedCount) {
          toast(
            `Task created. ${nextDependencyTaskIds.length - failedCount}/${nextDependencyTaskIds.length} dependencies linked.`,
          );
        } else {
          toast(
            `Task created with ${nextDependencyTaskIds.length} dependency${nextDependencyTaskIds.length > 1 ? "ies" : ""}.`,
          );
        }
      } else {
        toast("Task created.");
      }

      setTaskSheetState(null);
      queryClient.invalidateQueries({
        queryKey: ["workspace-portfolio-dependencies", workspaceId],
      });
    } catch {
      // Global error handling is already managed in the mutation hooks.
    }
  };

  const handleWorkflowAction = (
    label: string,
    workflowId: string,
    workflowName?: string,
  ) => {
    if (!canCreateWorkflows) {
      toast("You do not have permission to manage workflows in this workspace.");
      return;
    }

    if (!workspaceId) {
      toast("Open this project from a workspace to manage workflows.");
      return;
    }

    if (label === "Archive workflow") {
      setWorkflowArchiveDialogState({
        workflowId,
        workflowName,
      });
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

  const handleConfirmArchiveWorkflow = () => {
    if (!workspaceId || !workflowArchiveDialogState?.workflowId) {
      setWorkflowArchiveDialogState(null);
      return;
    }

    const workflowName = workflowArchiveDialogState.workflowName;

    archiveWorkspaceProjectWorkflowMutation.mutate(
      {
        workspaceId,
        projectId,
        workflowId: workflowArchiveDialogState.workflowId,
      },
      {
        onSuccess: () => {
          toast(`Workflow archived: ${workflowName ?? "Workflow"}`);
          setWorkflowArchiveDialogState(null);
        },
      },
    );
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
      <div
        data-tour="project-shell"
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 pb-6 md:gap-4"
      >
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
          <div data-tour="project-summary" className="space-y-3">
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
              canInviteCollaborators={canManageProjectInvites}
              canArchiveProject={canArchiveProjects}
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
          </div>
        ) : null}

        <div
          data-tour="project-tabs"
          className="sticky top-0 z-20 -mx-1 border-b border-border/20 bg-background/85 px-1 py-2 backdrop-blur-sm"
        >
          <ProjectOverviewTabs value={activeTab} onValueChange={setActiveTab} />
        </div>

        {activeTab === "overview" ? (
          <>
            <div data-tour="project-overview-workflows">
              <ProjectOverviewWorkflowTable
                projectId={projectId}
                workflows={overviewWorkflows}
                members={resolvedMembers}
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
                onPreviousPage={() =>
                  setWorkflowPage((current) => Math.max(1, current - 1))
                }
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
                canManageWorkflowActions={canCreateWorkflows}
              />
            </div>

            <div
              data-tour="project-overview-risks"
              className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
            >
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
                members={resolvedMembers}
              />
            </div>
          </>
        ) : activeTab === "workflows" ? (
          <div data-tour="project-tab-workflows">
            <ProjectWorkflowsTab
              projectId={projectId}
              initialWorkflowId={initialWorkflowId}
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
              members={resolvedMembers}
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
              canManageWorkflowActions={canCreateWorkflows}
            />
          </div>
        ) : activeTab === "dos" ? (
          <div data-tour="project-tab-dos">
            <ProjectDosTab
              projectId={projectId}
              project={project}
              initialTaskId={initialTaskId}
              members={resolvedMembers}
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
              onReorderKanbanLanes={handleReorderKanbanLanes}
            />
          </div>
        ) : activeTab === "files-assets" ? (
          <div data-tour="project-tab-files-assets">
            <ProjectFilesAssetsTab project={project} members={resolvedMembers} />
          </div>
        ) : activeTab === "risks-issues" ? (
          <div data-tour="project-tab-risks-issues">
            <ProjectRisksIssuesTab
              workspaceId={workspaceId}
              projectId={projectId}
              initialRiskId={initialRiskId}
              view={riskView}
              onViewChange={setRiskView}
              selectedPipeline={selectedPipeline}
              selectedTeamId={teamFilter}
              onTeamChange={setTeamFilter}
              teams={project.teams}
              members={resolvedMembers}
              onProjectRecordSynced={handleRiskRecordSynced}
            />
          </div>
        ) : activeTab === "secrets" ? (
          <div data-tour="project-tab-secrets">
            <ProjectSecretsTab
              workspaceId={workspaceId}
              projectId={projectId}
              members={resolvedMembers}
              teams={project.teams}
            />
          </div>
        ) : activeTab === "agents-automation" ? (
          <div data-tour="project-tab-agents-automation">
            <ProjectAgentsAutomationTab project={project} members={resolvedMembers} />
          </div>
        ) : (
          <ProjectOverviewPlaceholder kind="coming-soon" label="coming soon" />
        )}
      </div>

      {workflowSheetState ? (
        <ProjectWorkflowSheet
          key={`workflow-${workflowSheetState.mode}-${workflowSheetState.workflowId ?? "new"}`}
          open
          mode={workflowSheetState.mode}
          teams={project.teams}
          initialValues={
            workflowSheetState.mode === "edit" && workflowForSheet
              ? {
                  name: workflowForSheet.name,
                  teamId: workflowForSheet.teamId,
                }
              : {
                  teamId:
                    workflowSheetState.defaults?.teamId ??
                    selectedTeam?.id ??
                    project.teams[0]?.id ??
                    "",
                  ...workflowSheetState.defaults,
                }
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
          workflowId={taskSheetWorkflow.id}
          workflowName={taskSheetWorkflow.name}
          members={resolvedMembers}
          teams={project.teams}
          pipelines={project.pipelines}
          sections={project.customSections ?? []}
          dependencyOptions={dependencyTaskOptions}
          currentTaskId={taskForSheet?.id}
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

      <Dialog
        open={Boolean(workflowArchiveDialogState)}
        onOpenChange={(open) => {
          if (!open) {
            setWorkflowArchiveDialogState(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive workflow</DialogTitle>
            <DialogDescription>
              Archive{" "}
              <span className="font-medium text-foreground">
                {workflowArchiveDialogState?.workflowName ?? "this workflow"}
              </span>
              ? You can restore it later from archived workflows.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setWorkflowArchiveDialogState(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={archiveWorkspaceProjectWorkflowMutation.isPending}
              onClick={handleConfirmArchiveWorkflow}
            >
              Archive workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
