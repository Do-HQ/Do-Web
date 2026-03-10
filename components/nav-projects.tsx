"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";

import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export type SidebarProjectNavItem = {
  id: string;
  name: string;
  emoji: ReactNode;
  href: string;
  pipelines: {
    id: string;
    name: string;
    href: string;
    status?: "on-track" | "at-risk" | "blocked" | "complete";
  }[];
};

type NavProjectsProps = {
  projects: SidebarProjectNavItem[];
  onCreateProject: () => void;
  onCreateWorkflow: (project: SidebarProjectNavItem) => void;
  canCreateProject?: boolean;
  canCreateWorkflow?: boolean;
};

export function NavProjects({
  projects,
  onCreateProject,
  onCreateWorkflow,
  canCreateProject = true,
  canCreateWorkflow = true,
}: NavProjectsProps) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeWorkflowId = searchParams.get("workflow");
  const activeTab = searchParams.get("tab");
  const MAX_VISIBLE_PROJECTS = 10;
  const PIPELINE_DOT_CLASSES: Record<
    NonNullable<SidebarProjectNavItem["pipelines"][number]["status"]>,
    string
  > = {
    "on-track":
      "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)] animate-pulse",
    "at-risk":
      "bg-primary shadow-[0_0_0_3px_rgba(249,115,22,0.16)] animate-pulse",
    blocked:
      "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.16)] animate-pulse",
    complete: "bg-muted-foreground",
  };
  const displayedProjects = useMemo(() => {
    if (expanded || projects.length <= MAX_VISIBLE_PROJECTS) {
      return projects;
    }

    const collapsedProjects = projects.slice(0, MAX_VISIBLE_PROJECTS);
    const hasActiveInCollapsed = collapsedProjects.some(
      (project) => pathname === project.href || pathname.startsWith(`${project.href}/`),
    );

    if (hasActiveInCollapsed) {
      return collapsedProjects;
    }

    const activeProject = projects.find(
      (project) => pathname === project.href || pathname.startsWith(`${project.href}/`),
    );

    if (!activeProject) {
      return collapsedProjects;
    }

    return [...collapsedProjects.slice(0, MAX_VISIBLE_PROJECTS - 1), activeProject];
  }, [expanded, pathname, projects]);
  const hiddenCount = Math.max(projects.length - displayedProjects.length, 0);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupAction
        type="button"
        aria-label="Create project"
        onClick={onCreateProject}
        disabled={!canCreateProject}
        title={
          !canCreateProject
            ? "You do not have permission to create projects."
            : undefined
        }
      >
        <Plus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {!displayedProjects.length ? (
            <SidebarMenuItem>
              <div className="rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 px-2.5 py-2">
                <p className="text-sidebar-foreground text-[12px] font-medium">
                  No projects yet
                </p>
                <p className="text-sidebar-foreground/70 mt-0.5 text-[11px]">
                  Create your first project to get started.
                </p>
                <SidebarMenuButton
                  type="button"
                  className="mt-2 h-7 justify-center rounded-md border border-sidebar-border bg-sidebar-accent/50 text-[11px]"
                  onClick={onCreateProject}
                  disabled={!canCreateProject}
                  title={
                    !canCreateProject
                      ? "You do not have permission to create projects."
                      : undefined
                  }
                >
                  <Plus />
                  <span>Create project</span>
                </SidebarMenuButton>
              </div>
            </SidebarMenuItem>
          ) : null}

          {displayedProjects.map((project) => {
            const isProjectActive =
              pathname === project.href ||
              pathname.startsWith(`${project.href}/`);
            const hasOngoingWorkflow = project.pipelines.some(
              (pipeline) => pipeline.status && pipeline.status !== "complete",
            );

            return (
              <Collapsible
                key={`${project.id}-${isProjectActive ? "open" : "closed"}`}
                defaultOpen={isProjectActive}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isProjectActive}>
                    <Link href={project.href}>
                      <span className="shrink-0">{project.emoji}</span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{project.name}</span>
                        {hasOngoingWorkflow ? (
                          <span className="inline-flex size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_rgba(249,115,22,0.16)] animate-pulse" />
                        ) : null}
                      </span>
                    </Link>
                  </SidebarMenuButton>

                  <SidebarMenuAction
                    showOnHover
                    type="button"
                    aria-label={`Create workflow in ${project.name}`}
                    disabled={!canCreateWorkflow}
                    title={
                      !canCreateWorkflow
                        ? "You do not have permission to create workflows."
                        : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!canCreateWorkflow) {
                        return;
                      }
                      onCreateWorkflow(project);
                    }}
                  >
                    <Plus />
                  </SidebarMenuAction>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {project.pipelines.map((pipeline) => {
                        const isPipelineActive =
                          isProjectActive &&
                          activeTab === "workflows" &&
                          activeWorkflowId === pipeline.id;

                        return (
                          <SidebarMenuSubItem key={pipeline.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isPipelineActive}
                            >
                              <Link href={pipeline.href}>
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    pipeline.status
                                      ? PIPELINE_DOT_CLASSES[pipeline.status]
                                      : "bg-sidebar-border",
                                  )}
                                />
                                <span>{pipeline.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
          {hiddenCount > 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                type="button"
                className={cn(
                  "text-sidebar-foreground/70",
                  expanded && "bg-sidebar-accent/60",
                )}
                onClick={() => setExpanded((current) => !current)}
              >
                <MoreHorizontal />
                <span>{expanded ? "Show less" : `More (${hiddenCount})`}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
