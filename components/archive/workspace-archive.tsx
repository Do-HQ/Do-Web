"use client";

import * as React from "react";
import Link from "next/link";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Clock3,
  FolderKanban,
  GitBranch,
  ListFilter,
  Loader2,
  RefreshCw,
  Search,
  Shapes,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import useWorkspaceJam from "@/hooks/use-workspace-jam";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { useDebounce } from "@/hooks/use-debounce";
import { getWorkspaceProjectWorkflows } from "@/lib/services/workspace-project-service";
import { WorkspaceProjectRecord } from "@/types/project";
import { WorkspaceJamRecord } from "@/types/jam";
import { WorkspaceTeam } from "@/types/team";
import { ProjectWorkflow } from "@/components/projects/overview/types";
import { ROUTES } from "@/utils/constants";
import LoaderComponent from "@/components/shared/loader";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ArchiveTab = "projects" | "workflows" | "teams" | "jams";
type ArchiveViewVariant = "page" | "popup";
type PopupArchiveFilter = "all" | ArchiveTab;
type PopupArchiveSort = "recent" | "oldest" | "name";

type ArchivedWorkflowRow = ProjectWorkflow & {
  projectId: string;
  projectName: string;
};

type PopupArchiveRow = {
  id: string;
  type: ArchiveTab;
  title: string;
  subtitle: string;
  timestamp: string;
  timestampValue: number;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClassName: string;
  pending: boolean;
  canRestore: boolean;
  onRestore: () => void;
};

const ARCHIVE_TAB_META: Record<
  ArchiveTab,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClassName: string;
  }
> = {
  projects: {
    label: "Projects",
    icon: FolderKanban,
    accentClassName: "bg-sky-500/75",
  },
  workflows: {
    label: "Workflows",
    icon: GitBranch,
    accentClassName: "bg-violet-500/75",
  },
  teams: {
    label: "Teams",
    icon: Users,
    accentClassName: "bg-emerald-500/75",
  },
  jams: {
    label: "Jams",
    icon: Shapes,
    accentClassName: "bg-amber-500/75",
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getTimestampValue = (value?: string | null) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const WorkspaceArchive = ({
  variant = "page",
  onOpenFullPage,
}: {
  variant?: ArchiveViewVariant;
  onOpenFullPage?: () => void;
}) => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const workspacePermissions = useWorkspacePermissions();

  const [searchValue, setSearchValue] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<ArchiveTab>("projects");
  const [popupFilter, setPopupFilter] =
    React.useState<PopupArchiveFilter>("all");
  const [popupSort, setPopupSort] = React.useState<PopupArchiveSort>("recent");
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  const debouncedSearch = useDebounce(searchValue.trim(), 300);

  const projectHook = useWorkspaceProject();
  const teamHook = useWorkspaceTeam();
  const jamHook = useWorkspaceJam();

  const {
    useWorkspaceProjects,
    useUpdateWorkspaceProject,
    useUnarchiveWorkspaceProjectWorkflow,
  } = projectHook;
  const { useWorkspaceTeams, useUnarchiveWorkspaceTeam } = teamHook;
  const { useWorkspaceJams, useUnarchiveWorkspaceJam } = jamHook;

  const archivedProjectsQuery = useWorkspaceProjects(workspaceId ?? "", {
    page: 1,
    limit: 200,
    search: debouncedSearch,
    archived: true,
  });
  const activeProjectsQuery = useWorkspaceProjects(workspaceId ?? "", {
    page: 1,
    limit: 200,
    search: "",
    archived: false,
  });
  const archivedTeamsQuery = useWorkspaceTeams(workspaceId ?? "", {
    page: 1,
    limit: 200,
    search: debouncedSearch,
    status: "archived",
  });
  const archivedJamsQuery = useWorkspaceJams(
    workspaceId ?? "",
    {
      page: 1,
      limit: 200,
      search: debouncedSearch,
      archived: true,
      scope: "all",
      includeSnapshot: false,
    },
    {
      enabled: Boolean(workspaceId),
    },
  );

  const restoreProjectMutation = useUpdateWorkspaceProject();
  const restoreWorkflowMutation = useUnarchiveWorkspaceProjectWorkflow();
  const restoreTeamMutation = useUnarchiveWorkspaceTeam();
  const restoreJamMutation = useUnarchiveWorkspaceJam();

  const archivedProjects = React.useMemo(
    () =>
      archivedProjectsQuery.data?.data?.projects?.filter(
        (project) => project.archived,
      ) ?? [],
    [archivedProjectsQuery.data?.data?.projects],
  );
  const activeProjects = React.useMemo(
    () => activeProjectsQuery.data?.data?.projects ?? [],
    [activeProjectsQuery.data?.data?.projects],
  );
  const archivedTeams = React.useMemo(
    () => archivedTeamsQuery.data?.data?.teams ?? [],
    [archivedTeamsQuery.data?.data?.teams],
  );
  const archivedJams = React.useMemo(
    () =>
      archivedJamsQuery.data?.data?.jams?.filter((jam) => jam.archived) ?? [],
    [archivedJamsQuery.data?.data?.jams],
  );

  const projectsForWorkflowQueries = React.useMemo(() => {
    const byProjectId = new Map<string, WorkspaceProjectRecord>();
    [...activeProjects, ...archivedProjects].forEach((project) => {
      if (!project?.projectId) {
        return;
      }
      byProjectId.set(project.projectId, project);
    });
    return Array.from(byProjectId.values());
  }, [activeProjects, archivedProjects]);

  const archivedWorkflowQueries = useQueries({
    queries: projectsForWorkflowQueries.map((project) => ({
      queryKey: [
        "workspace-project-workflows",
        workspaceId,
        project.projectId,
        {
          page: 1,
          limit: 200,
          search: debouncedSearch,
          view: "all",
          teamId: "all",
          pipelineId: "",
          startDate: "",
          sort: "updated",
          archived: true,
        },
      ],
      enabled: Boolean(workspaceId && project.projectId),
      queryFn: () =>
        getWorkspaceProjectWorkflows(workspaceId ?? "", project.projectId, {
          page: 1,
          limit: 200,
          search: debouncedSearch,
          view: "all",
          teamId: "all",
          pipelineId: "",
          startDate: "",
          sort: "updated",
          archived: true,
        }),
    })),
  });

  const archivedWorkflows = React.useMemo<ArchivedWorkflowRow[]>(() => {
    return archivedWorkflowQueries.flatMap((query, index) => {
      const project = projectsForWorkflowQueries[index];
      const workflows = query.data?.data?.workflows ?? [];
      return workflows
        .filter((workflow) => workflow.archived)
        .map((workflow) => ({
          ...workflow,
          projectId: project.projectId,
          projectName: project.name,
        }));
    });
  }, [archivedWorkflowQueries, projectsForWorkflowQueries]);

  const isWorkflowLoading =
    projectsForWorkflowQueries.length > 0 &&
    archivedWorkflowQueries.some(
      (query) => query.isLoading || query.isFetching,
    );

  const refreshArchives = React.useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-projects", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-project-workflows", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-teams", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-jams", workspaceId],
      }),
    ]);
  }, [queryClient, workspaceId]);

  const handleRestoreProject = React.useCallback(
    async (project: WorkspaceProjectRecord) => {
      if (!workspaceId) {
        return;
      }

      setPendingKey(`project:${project.projectId}`);
      try {
        await toast.promise(
          restoreProjectMutation.mutateAsync({
            workspaceId,
            projectId: project.projectId,
            updates: { archived: false },
          }),
          {
            loading: "Restoring project...",
            success: "Project restored",
            error: "Unable to restore project",
          },
        );
        await refreshArchives();
      } finally {
        setPendingKey(null);
      }
    },
    [refreshArchives, restoreProjectMutation, workspaceId],
  );

  const handleRestoreWorkflow = React.useCallback(
    async (workflow: ArchivedWorkflowRow) => {
      if (!workspaceId) {
        return;
      }

      setPendingKey(`workflow:${workflow.id}`);
      try {
        await toast.promise(
          restoreWorkflowMutation.mutateAsync({
            workspaceId,
            projectId: workflow.projectId,
            workflowId: workflow.id,
          }),
          {
            loading: "Restoring workflow...",
            success: "Workflow restored",
            error: "Unable to restore workflow",
          },
        );
        await refreshArchives();
      } finally {
        setPendingKey(null);
      }
    },
    [refreshArchives, restoreWorkflowMutation, workspaceId],
  );

  const handleRestoreTeam = React.useCallback(
    async (team: WorkspaceTeam) => {
      if (!workspaceId) {
        return;
      }

      setPendingKey(`team:${team._id}`);
      try {
        await toast.promise(
          restoreTeamMutation.mutateAsync({
            workspaceId,
            teamId: team._id,
          }),
          {
            loading: "Restoring team...",
            success: "Team restored",
            error: "Unable to restore team",
          },
        );
        await refreshArchives();
      } finally {
        setPendingKey(null);
      }
    },
    [refreshArchives, restoreTeamMutation, workspaceId],
  );

  const handleRestoreJam = React.useCallback(
    async (jam: WorkspaceJamRecord) => {
      if (!workspaceId) {
        return;
      }

      setPendingKey(`jam:${jam.id}`);
      try {
        await toast.promise(
          restoreJamMutation.mutateAsync({
            workspaceId,
            jamId: jam.id,
          }),
          {
            loading: "Restoring jam...",
            success: "Jam restored",
            error: "Unable to restore jam",
          },
        );
        await refreshArchives();
      } finally {
        setPendingKey(null);
      }
    },
    [refreshArchives, restoreJamMutation, workspaceId],
  );

  const handleRestoreAllProjects = async () => {
    if (!workspaceId || !archivedProjects.length) {
      return;
    }
    await toast.promise(
      Promise.all(
        archivedProjects.map((project) =>
          restoreProjectMutation.mutateAsync({
            workspaceId,
            projectId: project.projectId,
            updates: { archived: false },
          }),
        ),
      ),
      {
        loading: "Restoring projects...",
        success: `${archivedProjects.length} project${archivedProjects.length === 1 ? "" : "s"} restored`,
        error: "Could not restore all projects",
      },
    );
    await refreshArchives();
  };

  const handleRestoreAllWorkflows = async () => {
    if (!workspaceId || !archivedWorkflows.length) {
      return;
    }
    await toast.promise(
      Promise.all(
        archivedWorkflows.map((workflow) =>
          restoreWorkflowMutation.mutateAsync({
            workspaceId,
            projectId: workflow.projectId,
            workflowId: workflow.id,
          }),
        ),
      ),
      {
        loading: "Restoring workflows...",
        success: `${archivedWorkflows.length} workflow${archivedWorkflows.length === 1 ? "" : "s"} restored`,
        error: "Could not restore all workflows",
      },
    );
    await refreshArchives();
  };

  const handleRestoreAllTeams = async () => {
    if (!workspaceId || !archivedTeams.length) {
      return;
    }
    await toast.promise(
      Promise.all(
        archivedTeams.map((team) =>
          restoreTeamMutation.mutateAsync({
            workspaceId,
            teamId: team._id,
          }),
        ),
      ),
      {
        loading: "Restoring teams...",
        success: `${archivedTeams.length} team${archivedTeams.length === 1 ? "" : "s"} restored`,
        error: "Could not restore all teams",
      },
    );
    await refreshArchives();
  };

  const handleRestoreAllJams = async () => {
    if (!workspaceId || !archivedJams.length) {
      return;
    }

    const manageableJams = archivedJams.filter((jam) => jam.canManage);
    if (!manageableJams.length) {
      toast("You do not have permission to restore these jams.");
      return;
    }

    await toast.promise(
      Promise.all(
        manageableJams.map((jam) =>
          restoreJamMutation.mutateAsync({
            workspaceId,
            jamId: jam.id,
          }),
        ),
      ),
      {
        loading: "Restoring jams...",
        success: `${manageableJams.length} jam${manageableJams.length === 1 ? "" : "s"} restored`,
        error: "Could not restore all jams",
      },
    );
    await refreshArchives();
  };

  const isAnyLoading =
    archivedProjectsQuery.isLoading ||
    archivedTeamsQuery.isLoading ||
    archivedJamsQuery.isLoading ||
    isWorkflowLoading;

  const totalArchivedCount =
    archivedProjects.length +
    archivedWorkflows.length +
    archivedTeams.length +
    archivedJams.length;

  const popupRows = React.useMemo<PopupArchiveRow[]>(() => {
    const projectRows = archivedProjects.map((project) => ({
      id: `project:${project.projectId}`,
      type: "projects" as const,
      title: project.name,
      subtitle: project.record?.summary || "Project",
      timestamp: formatDateTime(project.updatedAt),
      timestampValue: getTimestampValue(project.updatedAt),
      href: `${ROUTES.PROJECTS}/${encodeURIComponent(project.projectId)}`,
      icon: FolderKanban,
      accentClassName: ARCHIVE_TAB_META.projects.accentClassName,
      pending: pendingKey === `project:${project.projectId}`,
      canRestore: workspacePermissions.canArchiveProjects,
      onRestore: () => void handleRestoreProject(project),
    }));

    const workflowRows = archivedWorkflows.map((workflow) => ({
      id: `workflow:${workflow.id}`,
      type: "workflows" as const,
      title: workflow.name,
      subtitle: workflow.projectName,
      timestamp: formatDateTime(workflow.updatedAt),
      timestampValue: getTimestampValue(workflow.updatedAt),
      href: `${ROUTES.PROJECTS}/${encodeURIComponent(workflow.projectId)}?tab=workflows`,
      icon: GitBranch,
      accentClassName: ARCHIVE_TAB_META.workflows.accentClassName,
      pending: pendingKey === `workflow:${workflow.id}`,
      canRestore: workspacePermissions.canArchiveProjects,
      onRestore: () => void handleRestoreWorkflow(workflow),
    }));

    const teamRows = archivedTeams.map((team) => ({
      id: `team:${team._id}`,
      type: "teams" as const,
      title: team.name,
      subtitle: `${team.memberCount} members`,
      timestamp: formatDateTime(team.updatedAt),
      timestampValue: getTimestampValue(team.updatedAt),
      icon: Users,
      accentClassName: ARCHIVE_TAB_META.teams.accentClassName,
      pending: pendingKey === `team:${team._id}`,
      canRestore: workspacePermissions.isAdminLike,
      onRestore: () => void handleRestoreTeam(team),
    }));

    const jamRows = archivedJams.map((jam) => ({
      id: `jam:${jam.id}`,
      type: "jams" as const,
      title: jam.title,
      subtitle: jam.visibility,
      timestamp: formatDateTime(jam.updatedAt),
      timestampValue: getTimestampValue(jam.updatedAt),
      href: `${ROUTES.JAMS}/${encodeURIComponent(jam.id)}`,
      icon: Shapes,
      accentClassName: ARCHIVE_TAB_META.jams.accentClassName,
      pending: pendingKey === `jam:${jam.id}`,
      canRestore: jam.canManage,
      onRestore: () => void handleRestoreJam(jam),
    }));

    return [...projectRows, ...workflowRows, ...teamRows, ...jamRows];
  }, [
    archivedJams,
    archivedProjects,
    archivedTeams,
    archivedWorkflows,
    handleRestoreJam,
    handleRestoreProject,
    handleRestoreTeam,
    handleRestoreWorkflow,
    pendingKey,
    workspacePermissions.canArchiveProjects,
    workspacePermissions.isAdminLike,
  ]);

  const popupRowsFiltered = React.useMemo(() => {
    const rowsByType =
      popupFilter === "all"
        ? popupRows
        : popupRows.filter((row) => row.type === popupFilter);

    return [...rowsByType].sort((left, right) => {
      if (popupSort === "name") {
        return left.title.localeCompare(right.title, undefined, {
          sensitivity: "base",
        });
      }

      if (popupSort === "oldest") {
        return left.timestampValue - right.timestampValue;
      }

      return right.timestampValue - left.timestampValue;
    });
  }, [popupFilter, popupRows, popupSort]);

  if (!workspaceId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <Empty className="max-w-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArchiveRestore className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Select a workspace</EmptyTitle>
            <EmptyDescription>
              Open a workspace to view and restore archived content.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (variant === "popup") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="border-b border-border/50 p-3 pb-2.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <Archive className="size-4" />
              Archive
            </p>
          </div>
          <div className="relative mt-2.5">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search archived items"
              className="h-8 rounded-md border-border/60 pl-8 text-[12px]"
            />
          </div>
          <div className="mt-2.5 flex items-center gap-2 justify-end">
            <div className="flex min-w-0 items-center gap-2 w-1/2">
              <Select
                value={popupFilter}
                onValueChange={(value) =>
                  setPopupFilter(value as PopupArchiveFilter)
                }
              >
                <SelectTrigger className=" flex-1">
                  <ListFilter className="size-3.5" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="workflows">Workflows</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                  <SelectItem value="jams">Jams</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={popupSort}
                onValueChange={(value) =>
                  setPopupSort(value as PopupArchiveSort)
                }
              >
                <SelectTrigger className="flex-1">
                  <SlidersHorizontal className="size-3.5" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="name">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void refreshArchives()}
              aria-label="Refresh archive"
              title="Refresh archive"
            >
              <RefreshCw
                className={cn("size-3.5", isAnyLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
          {isAnyLoading ? (
            <div className="py-8">
              <LoaderComponent />
            </div>
          ) : popupRowsFiltered.length ? (
            <div className="space-y-2">
              {popupRowsFiltered.map((row) => (
                <CompactArchiveRow key={row.id} row={row} />
              ))}
            </div>
          ) : (
            <Empty className="min-h-[14rem] border-border/45 bg-muted/15">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArchiveRestore className="size-5" />
                </EmptyMedia>
                <EmptyTitle className="text-[14px]">
                  No archived items
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Try another filter or search term.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        {onOpenFullPage ? (
          <div className="border-t border-border/50 p-2.5 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-between rounded-md"
              onClick={onOpenFullPage}
            >
              Open full archive
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-tour="archive-shell"
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 p-4 md:p-6"
    >
      <div
        data-tour="archive-controls"
        className="bg-muted/15 ring-border/35 relative overflow-hidden rounded-2xl p-3 ring-1 md:p-4"
      >
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 text-[15px] font-semibold md:text-base">
              <span className="bg-background/85 inline-flex size-6 items-center justify-center rounded-md ring-1 ring-border/45">
                <Archive className="size-3.5" />
              </span>
              Archive
            </p>
            <p className="text-muted-foreground mt-1 text-[12px]">
              Restore archived projects, workflows, teams, and jams from one
              place.
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search archived items"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => void refreshArchives()}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="bg-background/65 ring-border/35 rounded-lg px-2.5 py-2 ring-1 md:col-span-1">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
              Total archived
            </p>
            <p className="text-[16px] font-semibold">{totalArchivedCount}</p>
          </div>
          {(Object.keys(ARCHIVE_TAB_META) as ArchiveTab[]).map((tabKey) => {
            const meta = ARCHIVE_TAB_META[tabKey];
            const count =
              tabKey === "projects"
                ? archivedProjects.length
                : tabKey === "workflows"
                  ? archivedWorkflows.length
                  : tabKey === "teams"
                    ? archivedTeams.length
                    : archivedJams.length;
            const Icon = meta.icon;
            return (
              <button
                key={`summary-${tabKey}`}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={cn(
                  "bg-background/65 ring-border/35 hover:bg-accent/45 flex items-center gap-2 rounded-lg px-2.5 py-2 text-left ring-1 transition-colors",
                  activeTab === tabKey && "bg-accent/55",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-md",
                    "bg-background/80 ring-1 ring-border/45",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </span>
                  <span className="block text-[13px] font-semibold">
                    {count}
                  </span>
                </span>
                <span
                  className={cn("size-1.5 rounded-full", meta.accentClassName)}
                />
              </button>
            );
          })}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ArchiveTab)}
        data-tour="archive-content"
        className="min-h-0 flex-1 gap-3"
      >
        <TabsList
          data-tour="archive-tabs"
          className="bg-muted/25 ring-border/35 h-10 w-full justify-start overflow-x-auto rounded-xl p-1 ring-1"
        >
          {(Object.keys(ARCHIVE_TAB_META) as ArchiveTab[]).map((tabKey) => {
            const meta = ARCHIVE_TAB_META[tabKey];
            const Icon = meta.icon;
            const count =
              tabKey === "projects"
                ? archivedProjects.length
                : tabKey === "workflows"
                  ? archivedWorkflows.length
                  : tabKey === "teams"
                    ? archivedTeams.length
                    : archivedJams.length;

            return (
              <TabsTrigger
                key={`tab-${tabKey}`}
                value={tabKey}
                className={cn(
                  "h-8 gap-1.5 rounded-lg px-3 text-[11px]",
                  "data-[state=active]:bg-background data-[state=active]:shadow-none",
                )}
              >
                <Icon className="size-3.5" />
                {meta.label}
                <Badge variant="outline" className="h-4.5 px-1 text-[9px]">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="projects" className="min-h-0 flex-1">
          <ArchiveSection
            icon={FolderKanban}
            accentClassName={ARCHIVE_TAB_META.projects.accentClassName}
            title="Archived projects"
            description="Restore archived projects to make them active again."
            loading={archivedProjectsQuery.isLoading}
            emptyMessage="No archived projects found."
            actionLabel="Restore all visible"
            actionDisabled={
              !archivedProjects.length ||
              !workspacePermissions.canArchiveProjects
            }
            onAction={handleRestoreAllProjects}
          >
            <div className="space-y-2">
              {archivedProjects.map((project) => (
                <ArchiveRow
                  key={project.projectId}
                  icon={FolderKanban}
                  accentClassName={ARCHIVE_TAB_META.projects.accentClassName}
                  title={project.name}
                  subtitle={`${project.status} • ${project.record?.summary || "No summary"}`}
                  timestamp={formatDateTime(project.updatedAt)}
                  href={`${ROUTES.PROJECTS}/${encodeURIComponent(project.projectId)}`}
                  pending={pendingKey === `project:${project.projectId}`}
                  disabled={!workspacePermissions.canArchiveProjects}
                  onRestore={() => void handleRestoreProject(project)}
                />
              ))}
            </div>
          </ArchiveSection>
        </TabsContent>

        <TabsContent value="workflows" className="min-h-0 flex-1">
          <ArchiveSection
            icon={GitBranch}
            accentClassName={ARCHIVE_TAB_META.workflows.accentClassName}
            title="Archived workflows"
            description="Restore archived workflows inside their projects."
            loading={isWorkflowLoading}
            emptyMessage="No archived workflows found."
            actionLabel="Restore all visible"
            actionDisabled={
              !archivedWorkflows.length ||
              !workspacePermissions.canArchiveProjects
            }
            onAction={handleRestoreAllWorkflows}
          >
            <div className="space-y-2">
              {archivedWorkflows.map((workflow) => (
                <ArchiveRow
                  key={`${workflow.projectId}-${workflow.id}`}
                  icon={GitBranch}
                  accentClassName={ARCHIVE_TAB_META.workflows.accentClassName}
                  title={workflow.name}
                  subtitle={`${workflow.projectName} • ${workflow.taskCounts.total} tasks`}
                  timestamp={formatDateTime(workflow.updatedAt)}
                  href={`${ROUTES.PROJECTS}/${encodeURIComponent(workflow.projectId)}?tab=workflows`}
                  pending={pendingKey === `workflow:${workflow.id}`}
                  disabled={!workspacePermissions.canArchiveProjects}
                  onRestore={() => void handleRestoreWorkflow(workflow)}
                />
              ))}
            </div>
          </ArchiveSection>
        </TabsContent>

        <TabsContent value="teams" className="min-h-0 flex-1">
          <ArchiveSection
            icon={Users}
            accentClassName={ARCHIVE_TAB_META.teams.accentClassName}
            title="Archived teams"
            description="Restore teams to return them to active workspace usage."
            loading={archivedTeamsQuery.isLoading}
            emptyMessage="No archived teams found."
            actionLabel="Restore all visible"
            actionDisabled={
              !archivedTeams.length || !workspacePermissions.isAdminLike
            }
            onAction={handleRestoreAllTeams}
          >
            <div className="space-y-2">
              {archivedTeams.map((team) => (
                <ArchiveRow
                  key={team._id}
                  icon={Users}
                  accentClassName={ARCHIVE_TAB_META.teams.accentClassName}
                  title={team.name}
                  subtitle={`${team.key} • ${team.memberCount} members`}
                  timestamp={formatDateTime(team.updatedAt)}
                  pending={pendingKey === `team:${team._id}`}
                  disabled={!workspacePermissions.isAdminLike}
                  onRestore={() => void handleRestoreTeam(team)}
                />
              ))}
            </div>
          </ArchiveSection>
        </TabsContent>

        <TabsContent value="jams" className="min-h-0 flex-1">
          <ArchiveSection
            icon={Shapes}
            accentClassName={ARCHIVE_TAB_META.jams.accentClassName}
            title="Archived jams"
            description="Restore jams to continue collaborating on them."
            loading={archivedJamsQuery.isLoading}
            emptyMessage="No archived jams found."
            actionLabel="Restore all visible"
            actionDisabled={
              !archivedJams.some((jam) => jam.canManage) ||
              restoreJamMutation.isPending
            }
            onAction={handleRestoreAllJams}
          >
            <div className="space-y-2">
              {archivedJams.map((jam) => (
                <ArchiveRow
                  key={jam.id}
                  icon={Shapes}
                  accentClassName={ARCHIVE_TAB_META.jams.accentClassName}
                  title={jam.title}
                  subtitle={`${jam.visibility} • ${jam.commentCount} comments`}
                  timestamp={formatDateTime(jam.updatedAt)}
                  href={`${ROUTES.JAMS}/${encodeURIComponent(jam.id)}`}
                  pending={pendingKey === `jam:${jam.id}`}
                  disabled={!jam.canManage}
                  onRestore={() => void handleRestoreJam(jam)}
                />
              ))}
            </div>
          </ArchiveSection>
        </TabsContent>
      </Tabs>

      {isAnyLoading ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="bg-background/85 ring-border/35 inline-flex items-center rounded-full px-2 py-1 ring-1 backdrop-blur">
            <LoaderComponent className="w-auto py-0" size={14} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

function ArchiveSection({
  icon: Icon,
  accentClassName,
  title,
  description,
  loading,
  emptyMessage,
  actionLabel,
  actionDisabled,
  onAction,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accentClassName: string;
  title: string;
  description: string;
  loading: boolean;
  emptyMessage: string;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <div className="bg-muted/15 ring-border/35 relative min-h-0 overflow-hidden rounded-xl p-3 ring-1 md:p-4">
      <span
        className={cn(
          "absolute top-0 left-0 h-full w-1 opacity-65",
          accentClassName,
        )}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 text-[14px] font-semibold">
            <span className="bg-background/85 inline-flex size-6 items-center justify-center rounded-md ring-1 ring-border/45">
              <Icon className="size-3.5" />
            </span>
            {title}
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {description}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-[11px]"
          onClick={onAction}
          disabled={actionDisabled}
        >
          <ArchiveRestore className="size-3.5" />
          {actionLabel}
        </Button>
      </div>

      {loading ? (
        <div className="px-1 py-2">
          <LoaderComponent />
        </div>
      ) : hasRows ? (
        children
      ) : (
        <Empty className="bg-background/50 min-h-[9rem] border-border/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArchiveRestore className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="text-[15px]">Nothing here</EmptyTitle>
            <EmptyDescription className="text-[12px]">
              {emptyMessage}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function ArchiveRow({
  icon: Icon,
  accentClassName,
  title,
  subtitle,
  timestamp,
  href,
  pending,
  disabled,
  onRestore,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accentClassName: string;
  title: string;
  subtitle: string;
  timestamp: string;
  href?: string;
  pending?: boolean;
  disabled?: boolean;
  onRestore: () => void;
}) {
  return (
    <div className="bg-background/65 ring-border/35 hover:bg-accent/35 hover:ring-border/55 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 ring-1 transition-colors">
      <span className={cn("h-10 w-1 shrink-0 rounded-full", accentClassName)} />
      <span className="bg-background/85 ring-border/45 inline-flex size-8 shrink-0 items-center justify-center rounded-md ring-1">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">{title}</p>
        <p className="text-muted-foreground line-clamp-1 text-[11px]">
          {subtitle}
        </p>
      </div>
      <div className="text-muted-foreground inline-flex items-center gap-1 rounded-md px-1.5 text-[10px]">
        <Clock3 className="size-3.5" />
        {timestamp}
      </div>
      {href ? (
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-7 text-[11px]",
          )}
        >
          Open
        </Link>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="h-7 text-[11px]"
        variant="outline"
        onClick={onRestore}
        disabled={disabled || pending}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Restore
      </Button>
    </div>
  );
}

function CompactArchiveRow({ row }: { row: PopupArchiveRow }) {
  const Icon = row.icon;

  return (
    <div className="bg-muted/12 ring-border/35 hover:bg-accent/28 flex items-center gap-2 rounded-md px-2 py-2 ring-1 transition-colors">
      <span className={cn("h-7 w-1 rounded-full", row.accentClassName)} />
      <span className="bg-background/85 ring-border/40 inline-flex size-6.5 shrink-0 items-center justify-center rounded-md ring-1">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium">{row.title}</p>
        <p className="text-muted-foreground line-clamp-1 text-[10.5px]">
          {row.subtitle}
        </p>
      </div>
      <div className="shrink-0 space-y-1.5 text-right">
        <p className="text-muted-foreground text-[10px]">{row.timestamp}</p>
        <div className="flex items-center justify-end gap-1">
          {row.href ? (
            <Link
              href={row.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-6 rounded-md",
              )}
              aria-label={`Open ${row.title}`}
              title={`Open ${row.title}`}
            >
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 rounded-md px-2 text-[10.5px]"
            onClick={row.onRestore}
            disabled={!row.canRestore || row.pending}
          >
            {row.pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Restore
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceArchive;
