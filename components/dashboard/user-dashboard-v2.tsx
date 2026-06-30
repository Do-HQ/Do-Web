"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlarmClockCheck,
  ArrowRight,
  CalendarDays,
  CircleDot,
  CircleDotDashed,
  ClipboardCheck,
  FilePenLine,
  FolderKanban,
  Gem,
  GitBranch,
  Layers3,
  MessageCircleMore,
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
import { Button, buttonVariants } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardVisitItem = {
  key: string;
  kind:
    | "project"
    | "space"
    | "jam"
    | "doc"
    | "report"
    | "schedule"
    | "scribe"
    | "standup"
    | "standup-session";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(options || {}),
  }).format(date);
};

const formatDateTime = (value?: string | null) =>
  formatDate(value, { weekday: "long", month: "long", day: "numeric" });

const toDateValue = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getGreeting = (name?: string) => {
  const hour = new Date().getHours();
  const firstName = String(name || "").trim() || "there";
  if (hour < 12) return `Good morning, ${firstName}.`;
  if (hour < 18) return `Good afternoon, ${firstName}.`;
  return `Good evening, ${firstName}.`;
};

const isTaskOpen = (status: ProjectWorkflowTask["status"]) => status !== "done";

const getTaskProgress = (task: ProjectWorkflowTask) => {
  if (typeof task.progress === "number")
    return Math.max(0, Math.min(100, Math.round(task.progress)));
  if (task.subtasks?.length) {
    const done = task.subtasks.filter((s) => s.status === "done").length;
    return Math.round((done / Math.max(task.subtasks.length, 1)) * 100);
  }
  if (task.status === "done") return 100;
  if (task.status === "review") return 82;
  if (task.status === "in-progress") return 54;
  if (task.status === "blocked") return 18;
  return 0;
};

// Builds a natural-language sentence summarising urgency for the headline.
const buildBriefingLine = ({
  overdueCount,
  dueTodayCount,
  atRiskProjects,
  myOpenTasks,
}: {
  overdueCount: number;
  dueTodayCount: number;
  atRiskProjects: { name: string }[];
  myOpenTasks: DashboardTaskItem[];
}): string => {
  const parts: string[] = [];

  if (overdueCount > 0)
    parts.push(`${overdueCount} task${overdueCount > 1 ? "s" : ""} overdue`);

  if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);

  if (atRiskProjects.length > 0) {
    const names = atRiskProjects
      .slice(0, 2)
      .map((p) => p.name)
      .join(" and ");
    parts.push(
      `${names} ${atRiskProjects.length > 1 ? "need" : "needs"} attention`,
    );
  }

  if (parts.length === 0) {
    if (myOpenTasks.length === 0)
      return "Your queue is clear — nothing pending.";
    return `${myOpenTasks.length} open task${myOpenTasks.length > 1 ? "s" : ""} in your queue, nothing urgent.`;
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (parts.length === 1) return `${cap(parts[0])}.`;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  return `${rest.map((s, i) => (i === 0 ? cap(s) : s)).join(", ")}, and ${last}.`;
};

// ─── Static lookup maps ───────────────────────────────────────────────────────

const KIND_DOT: Record<DashboardVisitItem["kind"], string> = {
  project: "bg-sky-500",
  space: "bg-violet-500",
  jam: "bg-amber-500",
  doc: "bg-emerald-500",
  report: "bg-blue-500",
  schedule: "bg-slate-400",
  scribe: "bg-purple-500",
  standup: "bg-teal-500",
  "standup-session": "bg-teal-500",
};

const KIND_ICON: Record<DashboardVisitItem["kind"], React.ReactNode> = {
  project: <FolderKanban className="size-3 shrink-0" />,
  space: <MessageCircleMore className="size-3 shrink-0" />,
  jam: <StickyNote className="size-3 shrink-0" />,
  doc: <FilePenLine className="size-3 shrink-0" />,
  report: <CircleDotDashed className="size-3 shrink-0" />,
  schedule: <AlarmClockCheck className="size-3 shrink-0" />,
  scribe: <Gem className="size-3 shrink-0" />,
  standup: <ClipboardCheck className="size-3 shrink-0" />,
  "standup-session": <ClipboardCheck className="size-3 shrink-0" />,
};

const TASK_STATUS_COLOR: Record<string, string> = {
  todo: "bg-muted-foreground/40",
  "in-progress": "bg-sky-500",
  review: "bg-violet-500",
  blocked: "bg-destructive",
  done: "bg-emerald-500",
};

const UPCOMING_BAR: Record<string, string> = {
  task: "bg-sky-500/50",
  milestone: "bg-amber-500/50",
  workflow: "bg-violet-500/50",
};

const UPCOMING_CHIP: Record<string, string> = {
  task: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/25",
  milestone:
    "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25",
  workflow:
    "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/25",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Thin-rule section divider — the key visual primitive of this design.
const Rule = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55">
      {label}
    </span>
    <div className="h-px flex-1 bg-border/45" />
  </div>
);

const EmptyNote = ({ children }: { children: React.ReactNode }) => (
  <p className="py-5 text-center text-[12.5px] text-muted-foreground/65">
    {children}
  </p>
);

// ─── Main component ───────────────────────────────────────────────────────────

const UserDashboardV2 = () => {
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const setProjectCreateOpen = useProjectStore((s) => s.setProjectCreateOpen);
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
        .map((p) => p.record)
        .filter((r): r is ProjectOverviewRecord => Boolean(r)),
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
    const sync = () =>
      setRecentVisitHistory(getRecentVisits(resolvedWorkspaceId, 16));
    sync();
    return subscribeRecentVisits(sync);
  }, [resolvedWorkspaceId]);

  const now = React.useMemo(() => Date.now(), []);

  const taskItems = React.useMemo<DashboardTaskItem[]>(() => {
    const items: DashboardTaskItem[] = [];
    projectRecords.forEach((record) => {
      record.workflows.forEach((workflow) => {
        if (workflow.archived) return;
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
            priority: task.priority,
            assigneeId: task.assigneeId,
            progress: getTaskProgress(task),
          });
        });
      });
    });
    return items.sort((a, b) => {
      const at = toDateValue(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = toDateValue(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return at !== bt ? at - bt : a.title.localeCompare(b.title);
    });
  }, [projectRecords]);

  const myOpenTasks = React.useMemo(
    () =>
      taskItems.filter(
        (t) =>
          String(t.assigneeId || "") === String(user?._id || "") &&
          isTaskOpen(t.status),
      ),
    [taskItems, user?._id],
  );

  const dueTodayCount = React.useMemo(() => {
    const today = new Date();
    return myOpenTasks.filter((t) => {
      const d = toDateValue(t.dueDate);
      return (
        d &&
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    }).length;
  }, [myOpenTasks]);

  const overdueCount = React.useMemo(
    () =>
      myOpenTasks.filter((t) => {
        const d = toDateValue(t.dueDate);
        return Boolean(d && d.getTime() < now);
      }).length,
    [myOpenTasks, now],
  );

  const activeWorkflowCount = React.useMemo(
    () =>
      projectRecords.reduce(
        (total, r) =>
          total +
          r.workflows.filter((w) => !w.archived && w.status !== "complete")
            .length,
        0,
      ),
    [projectRecords],
  );

  const unreadSpacesCount = React.useMemo(
    () => rooms.reduce((t, r) => t + Number(r.unread || 0), 0),
    [rooms],
  );

  const upcomingItems = React.useMemo<DashboardUpcomingItem[]>(() => {
    const nextWindow = now + 1000 * 60 * 60 * 24 * 10;
    const rows: DashboardUpcomingItem[] = [];
    projectRecords.forEach((record) => {
      record.milestones.forEach((milestone: ProjectMilestone) => {
        const due = toDateValue(milestone.dueDate);
        if (!due) return;
        const ts = due.getTime();
        if (ts < now || ts > nextWindow) return;
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
        const wDue = toDateValue(workflow.targetEndDate);
        if (
          wDue &&
          wDue.getTime() >= now &&
          wDue.getTime() <= nextWindow &&
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
        workflow.tasks.forEach((task) => {
          if (!isTaskOpen(task.status)) return;
          const due = toDateValue(task.dueDate);
          if (!due) return;
          const ts = due.getTime();
          if (ts < now || ts > nextWindow) return;
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
      .sort((a, b) => {
        const at = toDateValue(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bt = toDateValue(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return at !== bt ? at - bt : a.title.localeCompare(b.title);
      })
      .slice(0, 12);
  }, [projectRecords, now]);

  const atRiskProjects = React.useMemo(
    () =>
      projectRecords
        .filter((p) => p.status === "at-risk")
        .map((p) => ({
          id: p.id,
          name: p.name,
          summary: p.riskHint || p.summary,
          progress: p.progress,
        })),
    [projectRecords],
  );

  const healthyProjects = React.useMemo(
    () =>
      projectRecords
        .filter((p) => p.status !== "at-risk")
        .map((p) => ({
          id: p.id,
          name: p.name,
          progress: Math.max(0, Math.min(100, Number(p.progress || 0))),
          dueWindow: p.dueWindow || "No due window",
          doneCount: Number(p.taskCounts?.done || 0),
        }))
        .sort((a, b) => b.progress - a.progress || b.doneCount - a.doneCount)
        .slice(0, 4),
    [projectRecords],
  );

  const dueSoonCount = React.useMemo(() => {
    const cutoff = now + 1000 * 60 * 60 * 72;
    return taskItems.filter((t) => {
      if (!isTaskOpen(t.status)) return false;
      const d = toDateValue(t.dueDate)?.getTime();
      return d !== undefined && d !== null && d >= now && d <= cutoff;
    }).length;
  }, [taskItems, now]);

  const blockedTaskCount = React.useMemo(
    () => taskItems.filter((t) => t.status === "blocked").length,
    [taskItems],
  );

  const openIssueCount = React.useMemo(
    () =>
      projectRecords.reduce((total, p) => {
        return (
          total +
          p.risks.filter((risk) => {
            if (risk.kind !== "issue") return false;
            if (risk.state) return risk.state === "open";
            return !/resolved|closed/i.test(String(risk.status || ""));
          }).length
        );
      }, 0),
    [projectRecords],
  );

  const recentVisitItems = React.useMemo<DashboardVisitItem[]>(() => {
    const byProject = new Map(projects.map((p) => [String(p.projectId), p]));
    const byRoom = new Map(rooms.map((r) => [String(r.id), r]));
    const byJam = new Map(jams.map((j) => [String(j.id), j]));

    return recentVisitHistory
      .map((entry) => {
        const id = String(entry.key.split(":").slice(1).join(":")).trim();
        if (entry.kind === "project") {
          const p = byProject.get(id);
          if (!p) return null;
          return {
            key: entry.key,
            kind: "project" as const,
            title: p.name,
            subtitle: "",
            href: getProjectRoute(p.projectId),
            updatedAt: entry.visitedAt,
          };
        }
        if (entry.kind === "space") {
          const r = byRoom.get(id);
          if (!r) return null;
          return {
            key: entry.key,
            kind: "space" as const,
            title: r.name,
            subtitle: "",
            href: `${ROUTES.SPACES}?room=${r.id}`,
            updatedAt: entry.visitedAt,
          };
        }
        if (entry.kind === "jam") {
          const j = byJam.get(id);
          if (!j) return null;
          return {
            key: entry.key,
            kind: "jam" as const,
            title: j.title,
            subtitle: "",
            href: `${ROUTES.JAMS}/${j.id}`,
            updatedAt: entry.visitedAt,
          };
        }
        if (entry.kind === "doc")
          return {
            key: entry.key,
            kind: "doc" as const,
            title: "Document",
            subtitle: "",
            href: entry.href,
            updatedAt: entry.visitedAt,
          };
        if (entry.kind === "report")
          return {
            key: entry.key,
            kind: "report" as const,
            title: entry.key === "report:index" ? "Reports" : "Report",
            subtitle: "",
            href: entry.href,
            updatedAt: entry.visitedAt,
          };
        if (entry.kind === "schedule")
          return {
            key: entry.key,
            kind: "schedule" as const,
            title: "Schedules",
            subtitle: "",
            href: entry.href,
            updatedAt: entry.visitedAt,
          };
        if (entry.kind === "scribe")
          return {
            key: entry.key,
            kind: "scribe" as const,
            title: "Squircle Intelligence",
            subtitle: "",
            href: ROUTES.ASK_SQUIRCLE,
            updatedAt: entry.visitedAt,
          };
        if (entry.kind === "standup" || entry.kind === "standup-session")
          return {
            key: entry.key,
            kind: entry.kind,
            title: entry.kind === "standup" ? "Standup" : "Session",
            subtitle: "",
            href: entry.href,
            updatedAt: entry.visitedAt,
          };
        return null;
      })
      .filter((e): e is DashboardVisitItem => Boolean(e))
      .slice(0, 14);
  }, [jams, projects, recentVisitHistory, rooms]);

  const isLoading =
    projectQuery.isLoading || spacesQuery.isLoading || jamsQuery.isLoading;

  const briefingLine = React.useMemo(
    () =>
      buildBriefingLine({
        overdueCount,
        dueTodayCount,
        atRiskProjects,
        myOpenTasks,
      }),
    [overdueCount, dueTodayCount, atRiskProjects, myOpenTasks],
  );

  const hasUrgency = overdueCount > 0 || atRiskProjects.length > 0;

  // ─── No workspace ────────────────────────────────────────────────────────────

  if (!resolvedWorkspaceId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border/50 bg-muted/50">
          <Layers3 className="size-5 text-muted-foreground" />
        </div>
        <h2 className="text-[1.125rem] font-semibold">No workspace selected</h2>
        <p className="mt-1.5 max-w-xs text-[13px] text-muted-foreground">
          Switch to a workspace to load your projects and execution queue.
        </p>
        <Link
          href={ROUTES.SWITCH_WORKSPACE}
          className={cn(buttonVariants({ size: "sm" }), "mt-5")}
        >
          Switch workspace
        </Link>
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 pb-8">
      {/* ── Masthead ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-start justify-between gap-5 pt-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground/60 tracking-wide">
            {formatDateTime(new Date().toISOString())}
          </p>
          <h1 className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight">
            {getGreeting(user?.firstName)}
          </h1>
          {/* Briefing — computed natural-language summary */}
          <p
            className={cn(
              "mt-3 max-w-xl text-[14px] leading-relaxed",
              hasUrgency ? "text-foreground/80" : "text-muted-foreground",
            )}
          >
            {briefingLine}
          </p>
          {/* Inline stats — not boxes */}
          {!isLoading && (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
              {[
                { value: projects.length, label: "projects" },
                { value: myOpenTasks.length, label: "open tasks" },
                { value: activeWorkflowCount, label: "workflows active" },
                { value: unreadSpacesCount, label: "unread spaces" },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && (
                    <span className="text-border/80 select-none">·</span>
                  )}
                  <span className="inline-flex items-baseline gap-1">
                    <span className="text-[16px] font-bold tabular-nums">
                      {stat.value}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {stat.label}
                    </span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            disabled={!permissions.canCreateProjects}
            onClick={() => setProjectCreateOpen(true)}
          >
            <FilePenLine className="size-3.5" />
            New project
          </Button>
          <Link
            href={ROUTES.SPACES}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <MessageCircleMore className="size-3.5" />
            Spaces
          </Link>
          <Link
            href={ROUTES.CALENDAR}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <CalendarDays className="size-3.5" />
            Calendar
          </Link>
        </div>
      </section>

      {/* ── Alert strip — only rendered when something is actually urgent ─────── */}
      {hasUrgency && (
        <div className="flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <Link
              href={ROUTES.PROJECTS}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/8 px-4 py-2 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/14"
            >
              <TriangleAlert className="size-3.5 shrink-0" />
              {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
              <ArrowRight className="size-3 ml-0.5" />
            </Link>
          )}
          {atRiskProjects.map((p) => (
            <Link
              key={p.id}
              href={getProjectRoute(p.id)}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/8 px-4 py-2 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/14 dark:text-amber-400"
            >
              <CircleDot className="size-3.5 shrink-0" />
              {p.name} · at risk
              <ArrowRight className="size-3 ml-0.5" />
            </Link>
          ))}
        </div>
      )}

      {/* ── Two-column layout divided by a vertical rule ─────────────────────── */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:divide-x xl:divide-border/40">
        {/* Left column — primary content */}
        <div className="space-y-8 xl:pr-8">
          {/* ── My focus queue ──────────────────────────────────────────────── */}
          <section>
            <Rule label="Today's focus" />
            <div className="mt-4 flex items-center justify-between">
              <Link
                href={ROUTES.PROJECTS}
                className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                All projects <ArrowRight className="size-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="mt-3 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-md bg-muted/40"
                  />
                ))}
              </div>
            ) : myOpenTasks.length ? (
              <div className="mt-2">
                {myOpenTasks.slice(0, 8).map((task) => {
                  const dueDate = toDateValue(task.dueDate);
                  const isOverdue = Boolean(dueDate && dueDate.getTime() < now);
                  const isToday =
                    !isOverdue &&
                    (() => {
                      if (!dueDate) return false;
                      const today = new Date();
                      return (
                        dueDate.getFullYear() === today.getFullYear() &&
                        dueDate.getMonth() === today.getMonth() &&
                        dueDate.getDate() === today.getDate()
                      );
                    })();

                  return (
                    <Link
                      key={task.key}
                      href={`${getProjectRoute(task.projectId)}?tab=dos&workflow=${task.workflowId}&task=${task.taskId}`}
                      className="-mx-2 flex items-center gap-3.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
                    >
                      {/* Status indicator */}
                      <div
                        className={cn(
                          "size-2 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
                          TASK_STATUS_COLOR[task.status] ??
                            "bg-muted-foreground/40",
                          task.status === "in-progress" && "ring-sky-500/30",
                          task.status === "review" && "ring-violet-500/30",
                          task.status === "blocked" && "ring-destructive/30",
                          (task.status === "todo" || !task.status) &&
                            "ring-border/50",
                        )}
                      />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[13px] font-medium">
                          {task.title}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground/70">
                          {task.projectName}
                          {task.workflowName ? ` · ${task.workflowName}` : ""}
                        </p>
                      </div>

                      {/* Progress + due date */}
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden w-16 sm:block">
                          <div className="h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                isOverdue
                                  ? "bg-destructive/60"
                                  : "bg-foreground/70",
                              )}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={cn(
                            "w-14 text-right text-[11px] font-semibold tabular-nums",
                            isOverdue
                              ? "text-destructive"
                              : isToday
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground/70",
                          )}
                        >
                          {task.dueDate ? formatDate(task.dueDate) : "—"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyNote>No assigned open tasks.</EmptyNote>
            )}
          </section>

          {/* ── Upcoming schedule ────────────────────────────────────────────── */}
          <section>
            <Rule label="Upcoming — next 10 days" />

            {upcomingItems.length ? (
              <div className="mt-2">
                {upcomingItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                  >
                    {/* Date */}
                    <div className="w-14 shrink-0 text-right">
                      <p className="text-[12px] font-semibold tabular-nums text-foreground/75">
                        {formatDate(item.date, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground/55">
                        {formatDate(item.date, { weekday: "short" })}
                      </p>
                    </div>

                    {/* Vertical type bar */}
                    <div
                      className={cn(
                        "w-0.5 self-stretch shrink-0 rounded-full",
                        UPCOMING_BAR[item.type] ?? "bg-border/50",
                      )}
                    />

                    {/* Title */}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[12.5px] font-medium">
                        {item.title}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground/65">
                        {item.projectName} · {item.context}
                      </p>
                    </div>

                    {/* Type chip */}
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold",
                        UPCOMING_CHIP[item.type] ?? "",
                      )}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyNote>No upcoming deadlines in the next 10 days.</EmptyNote>
            )}
          </section>

          {/* ── Project health ───────────────────────────────────────────────── */}
          <section>
            <Rule
              label={
                atRiskProjects.length > 0
                  ? "Projects at risk"
                  : "Project health"
              }
            />

            <div className="mt-3 space-y-1">
              {atRiskProjects.length > 0 ? (
                atRiskProjects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    href={getProjectRoute(project.id)}
                    className="-mx-2 block rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-[12.5px] font-medium">
                        {project.name}
                      </p>
                      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        At risk
                      </span>
                    </div>
                    {project.summary ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/70">
                        {project.summary}
                      </p>
                    ) : null}
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500/65"
                        style={{
                          width: `${Math.max(0, Math.min(100, project.progress))}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))
              ) : healthyProjects.length ? (
                healthyProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={getProjectRoute(project.id)}
                    className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="line-clamp-1 text-[12.5px] font-medium">
                          {project.name}
                        </p>
                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground/70">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyNote>No projects yet.</EmptyNote>
              )}
            </div>
          </section>
        </div>

        {/* Right column — feeds and metrics */}
        <div
          className={cn(
            "mt-8 space-y-8 xl:mt-0 xl:pl-8",
            "xl:sticky xl:top-[4.25rem] xl:self-start",
            "xl:max-h-[calc(100dvh-5.5rem)] xl:overflow-y-auto",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {/* ── Now — terminal-style metrics ──────────────────────────────── */}
          <section>
            <Rule label="Now" />
            <div className="mt-4 space-y-px">
              {[
                {
                  icon: <AlarmClockCheck className="size-3.5 shrink-0" />,
                  label: "Due today",
                  value: dueTodayCount,
                  urgent: false,
                },
                {
                  icon: <TriangleAlert className="size-3.5 shrink-0" />,
                  label: "Overdue",
                  value: overdueCount,
                  urgent: overdueCount > 0,
                },
                {
                  icon: <CircleDotDashed className="size-3.5 shrink-0" />,
                  label: "Keep-up items",
                  value: keepUpItems.length,
                  urgent: false,
                },
                {
                  icon: <CircleDot className="size-3.5 shrink-0" />,
                  label: "At-risk projects",
                  value: atRiskProjects.length,
                  urgent: atRiskProjects.length > 0,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-md px-2 py-2.5",
                    metric.urgent && "bg-amber-500/6",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 text-[12px]",
                      metric.urgent
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {metric.icon}
                    {metric.label}
                  </div>
                  <span
                    className={cn(
                      "font-bold leading-none tabular-nums",
                      metric.urgent
                        ? "text-[1.5rem] text-amber-600 dark:text-amber-400"
                        : "text-[1.25rem] text-foreground",
                    )}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Mini signal row */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-border/35 pt-3">
              {[
                { label: "Due 72h", value: dueSoonCount },
                { label: "Blocked", value: blockedTaskCount },
                { label: "Issues", value: openIssueCount },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-md border border-border/35 bg-background/50 py-2 text-center"
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/55">
                    {s.label}
                  </p>
                  <p className="mt-1 text-[1.125rem] font-bold leading-none">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Recent — compact pills, not a carousel ────────────────────── */}
          <section>
            <Rule label="Recently opened" />
            {isLoading ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-24 animate-pulse rounded-md bg-muted/40"
                  />
                ))}
              </div>
            ) : recentVisitItems.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {recentVisitItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/45 bg-background/60 px-2.5 py-1.5 text-[11.5px] font-medium transition-colors hover:bg-accent/60"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        KIND_DOT[item.kind] ?? "bg-border",
                      )}
                    />
                    {KIND_ICON[item.kind]}
                    <span className="max-w-[7rem] truncate">{item.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyNote>Nothing opened yet.</EmptyNote>
            )}
          </section>

          {/* ── Keep up ────────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <Rule label="Activity" />
              <Link
                href={ROUTES.SPACES}
                className="mb-1.5 shrink-0 text-[11px] text-muted-foreground/65 transition-colors hover:text-foreground"
              >
                Open spaces →
              </Link>
            </div>

            {keepUpItems.length ? (
              <div className="mt-2 space-y-1">
                {keepUpItems.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    href={item.route || `${ROUTES.SPACES}?room=${item.roomId}`}
                    className="-mx-2 block rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                  >
                    <p className="line-clamp-1 text-[12px] font-semibold">
                      {item.roomName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground/70">
                      {item.content}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyNote>All caught up.</EmptyNote>
            )}
          </section>

          {/* ── Quick actions ─────────────────────────────────────────────── */}
          {projectRecords[0] ? (
            <section>
              <Rule label="Shortcuts" />
              <div className="mt-3 space-y-1.5">
                <Link
                  href={`${getProjectRoute(projectRecords[0].id)}?tab=risks-issues`}
                  className={buttonVariants({
                    size: "sm",
                    variant: "outline",
                    className: "h-8 w-full justify-start text-[11.5px]",
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
                    className: "h-8 w-full justify-start text-[11.5px]",
                  })}
                >
                  <GitBranch className="size-3.5" />
                  Open workflows
                </Link>
                <Link
                  href={ROUTES.CALENDAR}
                  className={buttonVariants({
                    size: "sm",
                    variant: "outline",
                    className: "h-8 w-full justify-start text-[11.5px]",
                  })}
                >
                  <CalendarDays className="size-3.5" />
                  View calendar
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default UserDashboardV2;
