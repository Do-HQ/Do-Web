"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";

import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
  }[];
};

type NavProjectsProps = {
  projects: SidebarProjectNavItem[];
  onCreateProject: () => void;
  onCreateWorkflow: (project: SidebarProjectNavItem) => void;
};

export function NavProjects({
  projects,
  onCreateProject,
  onCreateWorkflow,
}: NavProjectsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeWorkflowId = searchParams.get("workflow");
  const activeTab = searchParams.get("tab");

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupAction
        type="button"
        aria-label="Create project"
        onClick={onCreateProject}
      >
        <Plus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {projects.map((project) => {
            const isProjectActive =
              pathname === project.href ||
              pathname.startsWith(`${project.href}/`);

            return (
              <Collapsible
                key={`${project.id}-${isProjectActive ? "open" : "closed"}`}
                defaultOpen={isProjectActive}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isProjectActive}>
                    <Link href={project.href}>
                      <span>{project.name}</span>
                    </Link>
                  </SidebarMenuButton>

                  <SidebarMenuAction
                    showOnHover
                    type="button"
                    aria-label={`Create workflow in ${project.name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
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
                                <span className="bg-sidebar-border size-1.5 rounded-full" />
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
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <MoreHorizontal />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
