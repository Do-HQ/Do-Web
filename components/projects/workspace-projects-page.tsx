"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FolderKanban,
  GitBranch,
  ListTodo,
  Search,
} from "lucide-react";

import LoaderComponent from "@/components/shared/loader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceProjectRecord } from "@/types/project";
import { getProjectRoute } from "@/utils/constants";

const formatDate = (value?: string) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const getProjectStats = (project: WorkspaceProjectRecord) => {
  const workflows = Array.isArray(project.record?.workflows)
    ? project.record.workflows
    : [];
  const tasks = workflows.flatMap((workflow) =>
    Array.isArray(workflow?.tasks) ? workflow.tasks : [],
  );
  const completedTasks = tasks.filter((task) =>
    ["done", "complete", "completed"].includes(
      String(task?.status || "").toLowerCase(),
    ),
  ).length;

  return {
    workflows: workflows.length,
    tasks: tasks.length,
    completedTasks,
    progress:
      tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
  };
};

const statusClassName = (status?: string) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("risk")) {
    return "border-amber-500/35 text-amber-600 dark:text-amber-300";
  }

  if (normalized.includes("paused")) {
    return "border-muted-foreground/35 text-muted-foreground";
  }

  return "border-emerald-500/35 text-emerald-600 dark:text-emerald-300";
};

export function WorkspaceProjectsPage() {
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspaceProjects } = useWorkspaceProject();
  const [search, setSearch] = useState("");

  const queryParams = useMemo(
    () => ({ page: 1, limit: 80, search, archived: false }),
    [search],
  );
  const projectsQuery = useWorkspaceProjects(workspaceId || "", queryParams);
  const projects = projectsQuery.data?.data?.projects ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <section className="flex flex-col gap-3 bg-card/70 p-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[15px] font-semibold">Projects</div>
          <p className="text-muted-foreground text-[12px] leading-5">
            Browse active workspace projects and jump back into execution.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className="h-9 pl-8"
          />
        </div>
      </section>

      {projectsQuery.isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-border/35 bg-card/60">
          <LoaderComponent />
        </div>
      ) : projects.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const stats = getProjectStats(project);

            return (
              <Link
                key={project.projectId}
                href={getProjectRoute(project.projectId)}
                className="group rounded-xl border border-border/35 bg-card/70 p-3 shadow-xs transition-colors hover:border-foreground/20 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-[13px] font-semibold">
                      {project.name}
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-[12px] leading-5">
                      {project.summary || "No project summary yet."}
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 px-1.5 text-[10.5px]",
                      statusClassName(project.status),
                    )}
                  >
                    {String(project.status || "active").replaceAll("-", " ")}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10.5px]">
                    {stats.progress}% complete
                  </Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10.5px]">
                    Updated {formatDate(project.updatedAt)}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/25 bg-background/55 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <GitBranch className="size-3.5" />
                      Workflows
                    </div>
                    <div className="mt-1 text-[15px] font-semibold">
                      {stats.workflows}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/25 bg-background/55 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ListTodo className="size-3.5" />
                      Tasks
                    </div>
                    <div className="mt-1 text-[15px] font-semibold">
                      {stats.completedTasks}/{stats.tasks}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty className="border-border/35 bg-card/60 min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban className="size-5 text-primary" />
            </EmptyMedia>
            <EmptyTitle className="text-[15px]">No projects found</EmptyTitle>
            <EmptyDescription className="text-[12px]">
              Projects you create or join will appear here for quick access.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Back to dashboard
          </Link>
        </Empty>
      )}
    </div>
  );
}
