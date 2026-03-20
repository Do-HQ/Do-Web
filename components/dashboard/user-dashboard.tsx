"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlarmClockCheck,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleDotDashed,
  Clock3,
  FilePenLine,
  FolderKanban,
  GitBranch,
  Layers3,
  MessageCircleMore,
  Sparkles,
  StickyNote,
  TriangleAlert,
} from "lucide-react";

import useWorkspaceJam from "@/hooks/use-workspace-jam";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceSpace from "@/hooks/use-workspace-space";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import {
  getRecentVisits,
  subscribeRecentVisits,
  type RecentVisitEntry,
} from "@/lib/helpers/recent-visits";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import type { WorkspaceJamRecord } from "@/types/jam";
import type { WorkspaceProjectRecord } from "@/types/project";
import type {
  WorkspaceSpaceKeepUpItem,
  WorkspaceSpaceRoomRecord,
} from "@/types/space";
import { ROUTES, getProjectRoute } from "@/utils/constants";
import {
  getTaskStatusLabel,
  getWorkflowStatusLabel,
} from "@/components/projects/overview/utils";
import type {
  ProjectMilestone,
  ProjectOverviewRecord,
  ProjectWorkflowTask,
} from "@/components/projects/overview/types";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type DashboardVisitItem = {
  key: string;
  kind: "project" | "space" | "jam";
  title: string;
  subtitle: string;
  href: string;
  updatedAt: string;
};

type DashboardTaskItem = {
  key: string;
  projectId: string;
  projectName: string;
  workflowId: string;
  workflowName: string;
  taskId: string;
  title: string;
  status: ProjectWorkflowTask["status"];
  dueDate: string;
  startDate?: string;
  priority: ProjectWorkflowTask["priority"];
  assigneeId?: string;
  progress: number;
};

type DashboardUpcomingItem = {
  key: string;
  type: "task" | "milestone" | "workflow";
  title: string;
  projectId: string;
  projectName: string;
  date: string;
  href: string;
  context: string;
};

const formatDate = (
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
) => {
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
    ...(options || {}),
  }).format(date);
};

const formatDateTime = (value?: string | null) =>
  formatDate(value, { hour: "numeric", minute: "2-digit" });

const getRelativeLabel = (value?: string | null) => {
  if (!value) {
    return "Updated recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes >= 0
      ? `in ${Math.abs(diffMinutes)}m`
      : `${Math.abs(diffMinutes)}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) {
    return diffHours >= 0
      ? `in ${Math.abs(diffHours)}h`
      : `${Math.abs(diffHours)}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return diffDays >= 0
    ? `in ${Math.abs(diffDays)}d`
    : `${Math.abs(diffDays)}d ago`;
};

const toDateValue = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getGreeting = (name?: string) => {
  const hour = new Date().getHours();
  const firstName = String(name || "").trim() || "there";

  if (hour < 12) {
    return `Good morning, ${firstName}`;
  }
  if (hour < 18) {
    return `Good afternoon, ${firstName}`;
  }
  return `Good evening, ${firstName}`;
};

const isTaskOpen = (status: ProjectWorkflowTask["status"]) => status !== "done";

const getTaskProgress = (task: ProjectWorkflowTask) => {
  if (typeof task.progress === "number") {
    return Math.max(0, Math.min(100, Math.round(task.progress)));
  }

  if (task.subtasks?.length) {
    const doneCount = task.subtasks.filter(
      (item) => item.status === "done",
    ).length;
    return Math.round((doneCount / Math.max(task.subtasks.length, 1)) * 100);
  }

  if (task.status === "done") {
    return 100;
  }
  if (task.status === "review") {
    return 82;
  }
  if (task.status === "in-progress") {
    return 54;
  }
  if (task.status === "blocked") {
    return 18;
  }
  return 0;
};

const getDashboardVisitIcon = (kind: DashboardVisitItem["kind"]) => {
  if (kind === "project") {
    return <FolderKanban className="size-3.5" />;
  }
  if (kind === "space") {
    return <MessageCircleMore className="size-3.5" />;
  }
  if (kind === "jam") {
    return <StickyNote className="size-3.5" />;
  }
  return <Sparkles className="size-3.5" />;
};

const getUpcomingTypeMeta = (type: DashboardUpcomingItem["type"]) => {
  if (type === "task") {
    return {
      label: "Task",
      chipClassName:
        "border border-sky-500/35 bg-sky-500/14 text-sky-700 dark:text-sky-300",
      rowClassName:
        "border-l-2 border-l-sky-500/55 bg-sky-500/[0.04] hover:bg-sky-500/[0.08]",
      dotClassName: "bg-sky-500",
    };
  }

  if (type === "milestone") {
    return {
      label: "Milestone",
      chipClassName:
        "border border-amber-500/35 bg-amber-500/14 text-amber-700 dark:text-amber-300",
      rowClassName:
        "border-l-2 border-l-amber-500/55 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]",
      dotClassName: "bg-amber-500",
    };
  }

  return {
    label: "Workflow",
    chipClassName:
      "border border-violet-500/35 bg-violet-500/14 text-violet-700 dark:text-violet-300",
    rowClassName:
      "border-l-2 border-l-violet-500/55 bg-violet-500/[0.04] hover:bg-violet-500/[0.08]",
    dotClassName: "bg-violet-500",
  };
};

const DashboardSection = ({
  title,
  description,
  action,
  children,
  className,
  tourId,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tourId?: string;
}) => (
  <section
    data-tour={tourId}
    className={cn(
      "bg-card/75 border-border/55 rounded-xl border p-3 backdrop-blur-sm",
      className,
    )}
  >
    <header className="mb-3 flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-[11.5px]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
    {children}
  </section>
);

const UserDashboard = () => {
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const setProjectCreateOpen = useProjectStore(
    (state) => state.setProjectCreateOpen,
  );
  const permissions = useWorkspacePermissions();
  const [recentVisitHistory, setRecentVisitHistory] = React.useState<
    RecentVisitEntry[]
  >([]);

  const projectHook = useWorkspaceProject();
  const spaceHook = useWorkspaceSpace();
  const jamHook = useWorkspaceJam();

  const resolvedWorkspaceId = React.useMemo(
    () => String(workspaceId || user?.currentWorkspaceId?._id || "").trim(),
    [workspaceId, user?.currentWorkspaceId?._id],
  );

  const projectQuery = projectHook.useWorkspaceProjects(
    resolvedWorkspaceId,
    React.useMemo(
      () => ({ page: 1, limit: 40, search: "", archived: false }),
      [],
    ),
  );

  const spacesQuery = spaceHook.useWorkspaceSpaceRooms(
    resolvedWorkspaceId,
    React.useMemo(() => ({ page: 1, limit: 30, kind: "all" }), []),
  );

  const keepUpQuery = spaceHook.useWorkspaceSpaceKeepUp(
    resolvedWorkspaceId,
    React.useMemo(() => ({ page: 1, limit: 8 }), []),
  );

  const jamsQuery = jamHook.useWorkspaceJams(
    resolvedWorkspaceId,
    React.useMemo(
      () => ({ page: 1, limit: 16, archived: false, includeSnapshot: false }),
      [],
    ),
  );

  const projects = React.useMemo<WorkspaceProjectRecord[]>(
    () => projectQuery.data?.data?.projects ?? [],
    [projectQuery.data?.data?.projects],
  );

  const projectRecords = React.useMemo<ProjectOverviewRecord[]>(
    () =>
      projects
        .map((project) => project.record)
        .filter((record): record is ProjectOverviewRecord => Boolean(record)),
    [projects],
  );

  const rooms = React.useMemo<WorkspaceSpaceRoomRecord[]>(
    () => spacesQuery.data?.data?.rooms ?? [],
    [spacesQuery.data?.data?.rooms],
  );

  const keepUpItems = React.useMemo<WorkspaceSpaceKeepUpItem[]>(
    () => keepUpQuery.data?.data?.items ?? [],
    [keepUpQuery.data?.data?.items],
  );

  const jams = React.useMemo<WorkspaceJamRecord[]>(
    () => jamsQuery.data?.data?.jams ?? [],
    [jamsQuery.data?.data?.jams],
  );

  React.useEffect(() => {
    if (!resolvedWorkspaceId) {
      setRecentVisitHistory([]);
      return;
    }

    const syncRecentVisits = () => {
      setRecentVisitHistory(getRecentVisits(resolvedWorkspaceId, 20));
    };

    syncRecentVisits();

    return subscribeRecentVisits(syncRecentVisits);
  }, [resolvedWorkspaceId]);

  const taskItems = React.useMemo<DashboardTaskItem[]>(() => {
    const items: DashboardTaskItem[] = [];

    projectRecords.forEach((record) => {
      record.workflows.forEach((workflow) => {
        if (workflow.archived) {
          return;
        }

        workflow.tasks.forEach((task) => {
          items.push({
            key: `${record.id}:${workflow.id}:${task.id}`,
            projectId: record.id,
            projectName: record.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
            taskId: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate,
            startDate: task.startDate,
            priority: task.priority,
            assigneeId: task.assigneeId,
            progress: getTaskProgress(task),
          });
        });
      });
    });

    return items.sort((left, right) => {
      const leftDate =
        toDateValue(left.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDate =
        toDateValue(right.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }
      return left.title.localeCompare(right.title);
    });
  }, [projectRecords]);

  const myOpenTasks = React.useMemo(
    () =>
      taskItems.filter(
        (task) =>
          String(task.assigneeId || "") === String(user?._id || "") &&
          isTaskOpen(task.status),
      ),
    [taskItems, user?._id],
  );

  const dueTodayCount = React.useMemo(() => {
    const today = new Date();
    return myOpenTasks.filter((task) => {
      const due = toDateValue(task.dueDate);
      if (!due) {
        return false;
      }
      return (
        due.getFullYear() === today.getFullYear() &&
        due.getMonth() === today.getMonth() &&
        due.getDate() === today.getDate()
      );
    }).length;
  }, [myOpenTasks]);

  const overdueCount = React.useMemo(() => {
    const now = Date.now();
    return myOpenTasks.filter((task) => {
      const due = toDateValue(task.dueDate);
      return Boolean(due && due.getTime() < now);
    }).length;
  }, [myOpenTasks]);

  const activeWorkflowCount = React.useMemo(
    () =>
      projectRecords.reduce((total, record) => {
        const active = record.workflows.filter(
          (workflow) => !workflow.archived && workflow.status !== "complete",
        ).length;
        return total + active;
      }, 0),
    [projectRecords],
  );

  const unreadSpacesCount = React.useMemo(
    () => rooms.reduce((total, room) => total + Number(room.unread || 0), 0),
    [rooms],
  );

  const upcomingItems = React.useMemo<DashboardUpcomingItem[]>(() => {
    const now = Date.now();
    const nextWindow = now + 1000 * 60 * 60 * 24 * 10;
    const rows: DashboardUpcomingItem[] = [];

    projectRecords.forEach((record) => {
      record.milestones.forEach((milestone: ProjectMilestone) => {
        const due = toDateValue(milestone.dueDate);
        if (!due) {
          return;
        }
        const timestamp = due.getTime();
        if (timestamp < now || timestamp > nextWindow) {
          return;
        }
        rows.push({
          key: `milestone:${record.id}:${milestone.id}`,
          type: "milestone",
          title: milestone.title,
          projectId: record.id,
          projectName: record.name,
          date: milestone.dueDate,
          href: `${getProjectRoute(record.id)}?tab=overview`,
          context: `Milestone · ${milestone.owner}`,
        });
      });

      record.workflows.forEach((workflow) => {
        const workflowDue = toDateValue(workflow.targetEndDate);
        if (workflowDue) {
          const timestamp = workflowDue.getTime();
          if (
            timestamp >= now &&
            timestamp <= nextWindow &&
            workflow.status !== "complete"
          ) {
            rows.push({
              key: `workflow:${record.id}:${workflow.id}`,
              type: "workflow",
              title: workflow.name,
              projectId: record.id,
              projectName: record.name,
              date: workflow.targetEndDate,
              href: `${getProjectRoute(record.id)}?tab=workflows&workflow=${workflow.id}`,
              context: `Workflow · ${getWorkflowStatusLabel(workflow.status)}`,
            });
          }
        }

        workflow.tasks.forEach((task) => {
          if (!isTaskOpen(task.status)) {
            return;
          }

          const due = toDateValue(task.dueDate);
          if (!due) {
            return;
          }

          const timestamp = due.getTime();
          if (timestamp < now || timestamp > nextWindow) {
            return;
          }

          rows.push({
            key: `task:${record.id}:${workflow.id}:${task.id}`,
            type: "task",
            title: task.title,
            projectId: record.id,
            projectName: record.name,
            date: task.dueDate,
            href: `${getProjectRoute(record.id)}?tab=dos&workflow=${workflow.id}&task=${task.id}`,
            context: `${workflow.name} · ${getTaskStatusLabel(task.status)}`,
          });
        });
      });
    });

    return rows
      .sort((left, right) => {
        const leftDate =
          toDateValue(left.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDate =
          toDateValue(right.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }
        return left.title.localeCompare(right.title);
      })
      .slice(0, 12);
  }, [projectRecords]);

  const atRiskProjects = React.useMemo(
    () =>
      projectRecords
        .filter((project) => project.status === "at-risk")
        .map((project) => ({
          id: project.id,
          name: project.name,
          summary: project.riskHint || project.summary,
          progress: project.progress,
        })),
    [projectRecords],
  );

  const healthyMomentumProjects = React.useMemo(
    () =>
      projectRecords
        .filter((project) => project.status !== "at-risk")
        .map((project) => ({
          id: project.id,
          name: project.name,
          progress: Math.max(0, Math.min(100, Number(project.progress || 0))),
          dueWindow: project.dueWindow || "No due window",
          doneCount: Number(project.taskCounts?.done || 0),
        }))
        .sort((left, right) => {
          if (left.progress !== right.progress) {
            return right.progress - left.progress;
          }
          return right.doneCount - left.doneCount;
        })
        .slice(0, 3),
    [projectRecords],
  );

  const dueSoonCount = React.useMemo(() => {
    const now = Date.now();
    const cutoff = now + 1000 * 60 * 60 * 72;

    return taskItems.filter((task) => {
      if (!isTaskOpen(task.status)) {
        return false;
      }

      const due = toDateValue(task.dueDate)?.getTime();
      if (!due) {
        return false;
      }

      return due >= now && due <= cutoff;
    }).length;
  }, [taskItems]);

  const blockedTaskCount = React.useMemo(
    () => taskItems.filter((task) => task.status === "blocked").length,
    [taskItems],
  );

  const openIssueCount = React.useMemo(
    () =>
      projectRecords.reduce((total, project) => {
        const openIssues = project.risks.filter((risk) => {
          if (risk.kind !== "issue") {
            return false;
          }

          if (risk.state) {
            return risk.state === "open";
          }

          return !/resolved|closed/i.test(String(risk.status || ""));
        }).length;

        return total + openIssues;
      }, 0),
    [projectRecords],
  );

  const recentVisitItems = React.useMemo<DashboardVisitItem[]>(() => {
    const projectsById = new Map(
      projects.map((project) => [String(project.projectId), project]),
    );
    const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
    const jamsById = new Map(jams.map((jam) => [String(jam.id), jam]));

    const entries = recentVisitHistory
      .map((entry) => {
        const entryId = String(entry.key.split(":").slice(1).join(":")).trim();

        if (entry.kind === "project") {
          const project = projectsById.get(entryId);
          if (!project) {
            return null;
          }

          return {
            key: entry.key,
            kind: "project" as const,
            title: project.name,
            subtitle: project.record?.summary || "Project workspace",
            href: getProjectRoute(project.projectId),
            updatedAt: entry.visitedAt,
          };
        }

        if (entry.kind === "space") {
          const room = roomsById.get(entryId);
          if (!room) {
            return null;
          }

          return {
            key: entry.key,
            kind: "space" as const,
            title: room.name,
            subtitle: room.topic || `${room.kind} room`,
            href: `${ROUTES.SPACES}?room=${room.id}`,
            updatedAt: entry.visitedAt,
          };
        }

        const jam = jamsById.get(entryId);
        if (!jam) {
          return null;
        }

        return {
          key: entry.key,
          kind: "jam" as const,
          title: jam.title,
          subtitle: jam.description || "Collaborative canvas",
          href: `${ROUTES.JAMS}/${jam.id}`,
          updatedAt: entry.visitedAt,
        };
      })
      .filter((entry): entry is DashboardVisitItem => Boolean(entry));

    return entries.slice(0, 10);
  }, [jams, projects, recentVisitHistory, rooms]);

  const isInitialLoading =
    projectQuery.isLoading || spacesQuery.isLoading || jamsQuery.isLoading;
  const recentVisitedCarouselRef = React.useRef<HTMLDivElement | null>(null);

  const getRecentVisitedGridMetrics = React.useCallback(
    (container: HTMLDivElement) => {
      const firstCard =
        container.querySelector<HTMLElement>("[data-recent-card]");
      if (!firstCard) {
        return null;
      }

      const cardWidth = firstCard.getBoundingClientRect().width;
      const style = window.getComputedStyle(container);
      const gap = Number.parseFloat(style.columnGap || style.gap || "0") || 0;
      const span = cardWidth + gap;
      if (span <= 0) {
        return null;
      }

      const maxIndex = Math.max(
        0,
        Math.ceil((container.scrollWidth - container.clientWidth) / span),
      );

      return { span, maxIndex };
    },
    [],
  );

  const scrollRecentVisited = React.useCallback(
    (direction: "left" | "right") => {
      const container = recentVisitedCarouselRef.current;
      if (!container) {
        return;
      }

      const metrics = getRecentVisitedGridMetrics(container);
      if (!metrics) {
        const amount = Math.max(220, Math.round(container.clientWidth * 0.72));
        const nextLeft =
          direction === "left"
            ? container.scrollLeft - amount
            : container.scrollLeft + amount;

        container.scrollTo({
          left: nextLeft,
          behavior: "smooth",
        });
        return;
      }

      const { span, maxIndex } = metrics;
      const currentIndex = Math.round(container.scrollLeft / span);
      const visibleCount = Math.max(
        1,
        Math.floor(container.clientWidth / span),
      );
      const rawNextIndex =
        direction === "left"
          ? currentIndex - visibleCount
          : currentIndex + visibleCount;
      const nextIndex = Math.min(maxIndex, Math.max(0, rawNextIndex));

      container.scrollTo({
        left: nextIndex * span,
        behavior: "smooth",
      });
    },
    [getRecentVisitedGridMetrics],
  );

  if (!resolvedWorkspaceId) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Empty className="border-border/50 bg-card/70 min-h-[26rem] rounded-2xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers3 />
            </EmptyMedia>
            <EmptyTitle>Select a workspace to continue</EmptyTitle>
            <EmptyDescription>
              Switch to a workspace to load your projects, spaces, and execution
              queue.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href={ROUTES.SWITCH_WORKSPACE}
            className={buttonVariants({ size: "sm" })}
          >
            Switch workspace
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div
      data-tour="dashboard-shell"
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-2"
    >
      <section
        data-tour="dashboard-hero"
        className="bg-card/70 border-border/55 rounded-xl border p-4"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11.5px] text-muted-foreground">
                {formatDateTime(new Date().toISOString())}
              </p>
              <h1 className="text-xl leading-tight font-semibold tracking-tight">
                {getGreeting(user?.firstName)}
              </h1>
              <p className="text-muted-foreground text-[12px]">
                Here is your live workspace pulse across projects, chats, and
                delivery.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={!permissions.canCreateProjects}
                onClick={() => setProjectCreateOpen(true)}
              >
                <FilePenLine className="size-4" />
                New project
              </Button>
              <Link
                href={ROUTES.SPACES}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <MessageCircleMore className="size-4" />
                Open spaces
              </Link>
              <Link
                href={ROUTES.CALENDAR}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <CalendarDays className="size-4" />
                Calendar
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="bg-background/70 border-border/40 rounded-lg border px-2.5 py-2">
              <p className="text-muted-foreground text-[10px] uppercase">
                Projects
              </p>
              <p className="mt-1 text-[14px] font-semibold">
                {projects.length}
              </p>
            </div>
            <div className="bg-background/70 border-border/40 rounded-lg border px-2.5 py-2">
              <p className="text-muted-foreground text-[10px] uppercase">
                My open tasks
              </p>
              <p className="mt-1 text-[14px] font-semibold">
                {myOpenTasks.length}
              </p>
            </div>
            <div className="bg-background/70 border-border/40 rounded-lg border px-2.5 py-2">
              <p className="text-muted-foreground text-[10px] uppercase">
                Workflows active
              </p>
              <p className="mt-1 text-[14px] font-semibold">
                {activeWorkflowCount}
              </p>
            </div>
            <div className="bg-background/70 border-border/40 rounded-lg border px-2.5 py-2">
              <p className="text-muted-foreground text-[10px] uppercase">
                Unread spaces
              </p>
              <p className="mt-1 text-[14px] font-semibold">
                {unreadSpacesCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <DashboardSection
        tourId="dashboard-recents"
        title="Recently visited"
        description="Projects, spaces, and jams you opened most recently."
        action={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-7"
              aria-label="Scroll recently visited left"
              onClick={() => scrollRecentVisited("left")}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-7"
              aria-label="Scroll recently visited right"
              onClick={() => scrollRecentVisited("right")}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        }
      >
        {isInitialLoading ? (
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`recent-skeleton-${index}`}
                className="bg-muted/40 h-24 w-[15.75rem] shrink-0 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : recentVisitItems.length ? (
          <div
            ref={recentVisitedCarouselRef}
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {recentVisitItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                data-recent-card
                className="bg-card border-border/45 hover:border-border group w-[15.75rem] shrink-0 snap-start snap-always rounded-lg border px-3 py-2.5 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[10.5px] uppercase">
                    {getDashboardVisitIcon(item.kind)}
                    {item.kind}
                  </div>
                  <div className="line-clamp-1 text-[13px] font-semibold">
                    {item.title}
                  </div>
                  <div className="text-muted-foreground line-clamp-1 text-[11.5px]">
                    {item.subtitle}
                  </div>
                  <div className="text-muted-foreground inline-flex items-center gap-1 text-[10.5px]">
                    <Clock3 className="size-3" />
                    {getRelativeLabel(item.updatedAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty className="border-border/45 bg-background/35 rounded-lg border px-4 py-8">
            <EmptyHeader>
              <EmptyTitle className="text-[14px]">
                No recent activity yet
              </EmptyTitle>
              <EmptyDescription className="text-[12px]">
                Create a project or open a space to populate your home
                dashboard.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </DashboardSection>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_18.75rem]">
        <div className="space-y-4">
          <DashboardSection
            tourId="dashboard-focus"
            title="My focus queue"
            description="Open tasks assigned to you, sorted by due date."
            action={
              <Link
                href={ROUTES.PROJECTS}
                className={buttonVariants({ size: "sm", variant: "ghost" })}
              >
                View projects
                <ArrowRight className="size-4" />
              </Link>
            }
          >
            {myOpenTasks.length ? (
              <div className="space-y-2">
                {myOpenTasks.slice(0, 8).map((task) => (
                  <Link
                    key={task.key}
                    href={`${getProjectRoute(task.projectId)}?tab=dos&workflow=${task.workflowId}&task=${task.taskId}`}
                    className="bg-background/45 border-border/45 hover:bg-background/65 flex items-start justify-between gap-3 rounded-lg border px-2.5 py-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-1 text-[12.5px] font-medium">
                        {task.title}
                      </p>
                      <p className="text-muted-foreground line-clamp-1 text-[11px]">
                        {task.projectName} · {task.workflowName}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10.5px]"
                        >
                          {getTaskStatusLabel(task.status)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10.5px]"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-20 shrink-0 space-y-1 text-right">
                      <div className="text-[11px] font-medium">
                        {formatDate(task.dueDate)}
                      </div>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {task.progress}%
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty className="border-border/45 bg-background/35 rounded-lg border px-4 py-8">
                <EmptyHeader>
                  <EmptyTitle className="text-[14px]">
                    No assigned open tasks
                  </EmptyTitle>
                  <EmptyDescription className="text-[12px]">
                    Once tasks are assigned to you, they will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </DashboardSection>

          <DashboardSection
            tourId="dashboard-upcoming"
            title="Upcoming schedule"
            description="Task deadlines, milestones, and workflow targets over the next 10 days."
          >
            {upcomingItems.length ? (
              <div className="space-y-1.5">
                {upcomingItems.map((item) => {
                  const typeMeta = getUpcomingTypeMeta(item.type);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn(
                        "grid grid-cols-[6.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                        typeMeta.rowClassName,
                      )}
                    >
                      <p className="text-muted-foreground text-[11px]">
                        {formatDate(item.date, {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </p>
                      <div className="min-w-0">
                        <p className="line-clamp-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium">
                          <span
                            className={cn(
                              "inline-block size-1.5 rounded-full",
                              typeMeta.dotClassName,
                            )}
                          />
                          {item.title}
                        </p>
                        <p className="text-muted-foreground line-clamp-1 text-[10.5px]">
                          {item.projectName} · {item.context}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px]",
                          typeMeta.chipClassName,
                        )}
                      >
                        {typeMeta.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Empty className="border-border/45 bg-background/35 rounded-lg border px-4 py-8">
                <EmptyHeader>
                  <EmptyTitle className="text-[14px]">
                    No upcoming items
                  </EmptyTitle>
                  <EmptyDescription className="text-[12px]">
                    Upcoming deadlines and milestones will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </DashboardSection>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <DashboardSection
              tourId="dashboard-keepup"
              title="Keep up"
              description="Unread thread highlights and mentions."
              action={
                <Link
                  href={ROUTES.SPACES}
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  Open
                </Link>
              }
            >
              {keepUpItems.length ? (
                <div className="space-y-1.5">
                  {keepUpItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={
                        item.route || `${ROUTES.SPACES}?room=${item.roomId}`
                      }
                      className="hover:bg-background/60 block rounded-md px-2 py-1.5"
                    >
                      <p className="line-clamp-1 text-[12px] font-medium">
                        {item.roomName}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 text-[10.5px]">
                        {item.content}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {formatDateTime(item.sentAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty className="border-border/45 bg-background/35 rounded-lg border px-3 py-5">
                  <EmptyHeader>
                    <EmptyTitle className="text-[13px]">
                      No new keep-up items
                    </EmptyTitle>
                    <EmptyDescription className="text-[11px]">
                      Mentions and unread thread highlights will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </DashboardSection>

            <DashboardSection
              tourId="dashboard-risks"
              title="Projects at risk"
              description="High-attention projects right now."
            >
              {atRiskProjects.length ? (
                <div className="space-y-2">
                  {atRiskProjects.slice(0, 5).map((project) => (
                    <Link
                      key={project.id}
                      href={getProjectRoute(project.id)}
                      className="bg-background/45 border-border/45 hover:bg-background/65 block rounded-lg border px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-[12.5px] font-medium">
                          {project.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-300"
                        >
                          At risk
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-[10.5px]">
                        {project.summary}
                      </p>
                      <Separator className="my-1.5" />
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, project.progress))}%`,
                          }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-500/8 border-emerald-500/25 rounded-md border px-2.5 py-2">
                    <p className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
                      Healthy momentum
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[10.5px]">
                      No active risk flags right now.
                    </p>
                  </div>

                  {healthyMomentumProjects.length ? (
                    <div className="space-y-1.5">
                      {healthyMomentumProjects.map((project) => (
                        <Link
                          key={`healthy-${project.id}`}
                          href={getProjectRoute(project.id)}
                          className="hover:bg-background/65 block rounded-md px-2 py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="line-clamp-1 text-[12px] font-medium">
                              {project.name}
                            </p>
                            <span className="text-muted-foreground text-[10.5px]">
                              {project.progress}%
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
                            {project.dueWindow}
                          </p>
                          <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Empty className="border-border/45 bg-background/35 rounded-lg border px-3 py-5">
                      <EmptyHeader>
                        <EmptyTitle className="text-[13px]">
                          No active projects yet
                        </EmptyTitle>
                        <EmptyDescription className="text-[11px]">
                          Create your first project to track risk and momentum.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}

                  <Separator />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background/45 border-border/45 rounded-md border px-2 py-1.5">
                      <p className="text-muted-foreground text-[9.5px] uppercase">
                        Due 72h
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-semibold">
                        {dueSoonCount}
                      </p>
                    </div>
                    <div className="bg-background/45 border-border/45 rounded-md border px-2 py-1.5">
                      <p className="text-muted-foreground text-[9.5px] uppercase">
                        Blocked
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-semibold">
                        {blockedTaskCount}
                      </p>
                    </div>
                    <div className="bg-background/45 border-border/45 rounded-md border px-2 py-1.5">
                      <p className="text-muted-foreground text-[9.5px] uppercase">
                        Issues
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-semibold">
                        {openIssueCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 [&>a]:flex-1">
                    {projectRecords[0] ? (
                      <>
                        <Link
                          href={`${getProjectRoute(projectRecords[0].id)}?tab=risks-issues`}
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                            className:
                              "h-7 w-full justify-center px-2 text-[10.5px]",
                          })}
                        >
                          <TriangleAlert className="size-3.5" />
                          Review issues
                        </Link>
                        <Link
                          href={`${getProjectRoute(projectRecords[0].id)}?tab=workflows`}
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                            className:
                              "h-7 w-full justify-center px-2 text-[10.5px]",
                          })}
                        >
                          <GitBranch className="size-3.5" />
                          Open workflows
                        </Link>
                      </>
                    ) : null}
                    <Link
                      href={ROUTES.CALENDAR}
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                        className:
                          "h-7 w-full justify-center px-2 text-[10.5px]",
                      })}
                    >
                      <CalendarDays className="size-3.5" />
                      View calendar
                    </Link>
                  </div>
                </div>
              )}
            </DashboardSection>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[4.25rem] xl:self-start">
          <DashboardSection
            title="Today"
            description="Fast glance on what needs attention."
          >
            <div className="space-y-2.5">
              <div className="bg-background/55 border-border/40 flex items-center justify-between rounded-lg border px-2.5 py-2">
                <div className="inline-flex items-center gap-1.5 text-[11.5px]">
                  <AlarmClockCheck className="text-primary size-3.5" />
                  Due today
                </div>
                <span className="text-[13px] font-semibold">
                  {dueTodayCount}
                </span>
              </div>
              <div className="bg-background/55 border-border/40 flex items-center justify-between rounded-lg border px-2.5 py-2">
                <div className="inline-flex items-center gap-1.5 text-[11.5px]">
                  <TriangleAlert className="size-3.5 text-amber-500" />
                  Overdue
                </div>
                <span className="text-[13px] font-semibold">
                  {overdueCount}
                </span>
              </div>
              <div className="bg-background/55 border-border/40 flex items-center justify-between rounded-lg border px-2.5 py-2">
                <div className="inline-flex items-center gap-1.5 text-[11.5px]">
                  <CircleDotDashed className="size-3.5 text-sky-500" />
                  Keep-up items
                </div>
                <span className="text-[13px] font-semibold">
                  {keepUpItems.length}
                </span>
              </div>
              <div className="bg-background/55 border-border/40 flex items-center justify-between rounded-lg border px-2.5 py-2">
                <div className="inline-flex items-center gap-1.5 text-[11.5px]">
                  <CircleDot className="size-3.5 text-violet-500" />
                  At-risk projects
                </div>
                <span className="text-[13px] font-semibold">
                  {atRiskProjects.length}
                </span>
              </div>
            </div>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
