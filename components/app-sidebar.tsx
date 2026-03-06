"use client";

import * as React from "react";
import {
  Archive,
  Calendar,
  Home,
  Inbox,
  MessageCircleQuestion,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { CreateProjectSheet } from "@/components/projects/create-project-sheet";
import { ProjectMark } from "@/components/projects/project-mark";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { NavFavorites } from "@/components/nav-favorites";
import { NavMain } from "@/components/nav-main";
import { NavProjects, SidebarProjectNavItem } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAppStore, useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import { getProjectRoute, ROUTES } from "@/utils/constants";

import SettingsModal from "./modals/settings-modal";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setShowSettings } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const { workspaceId } = useWorkspaceStore();
  const projectRecords = useProjectStore((state) => state.projectRecords);
  const projectCreateOpen = useProjectStore((state) => state.projectCreateOpen);
  const setProjectCreateOpen = useProjectStore((state) => state.setProjectCreateOpen);
  const requestWorkflowCreate = useProjectStore((state) => state.requestWorkflowCreate);
  const hydrateProjectRecords = useProjectStore((state) => state.hydrateProjectRecords);
  const setProjectsLoaded = useProjectStore((state) => state.setProjectsLoaded);
  const { useWorkspaceProjects } = useWorkspaceProject();

  const projectQueryParams = React.useMemo(
    () => ({ page: 1, limit: 100, search: "", archived: false }),
    [],
  );

  const workspaceProjectsQuery = useWorkspaceProjects(
    workspaceId ?? "",
    projectQueryParams,
  );

  React.useEffect(() => {
    if (!workspaceId) {
      hydrateProjectRecords([]);
      setProjectsLoaded(true);
      return;
    }

    setProjectsLoaded(false);
  }, [hydrateProjectRecords, workspaceId, setProjectsLoaded]);

  React.useEffect(() => {
    if (!workspaceId) {
      return;
    }

    if (workspaceProjectsQuery.data?.data?.projects) {
      hydrateProjectRecords(
        workspaceProjectsQuery.data.data.projects
          .map((project) => project.record)
          .filter(Boolean),
      );
      setProjectsLoaded(true);
      return;
    }

    if (workspaceProjectsQuery.isFetched || workspaceProjectsQuery.isError) {
      setProjectsLoaded(true);
    }
  }, [
    hydrateProjectRecords,
    setProjectsLoaded,
    workspaceId,
    workspaceProjectsQuery.data,
    workspaceProjectsQuery.isError,
    workspaceProjectsQuery.isFetched,
  ]);

  const data = {
    navMain: [
      {
        title: "Search",
        url: "#",
        icon: Search,
      },
      {
        title: "Ask Squircle",
        url: ROUTES.ASK_SQUIRCLE,
        icon: Sparkles,
        isActive: pathname === ROUTES.ASK_SQUIRCLE,
      },
      {
        title: "Home",
        url: ROUTES.DASHBOARD,
        icon: Home,
        isActive: pathname === ROUTES.DASHBOARD,
      },
      {
        title: "Spaces",
        url: ROUTES.SPACES,
        icon: Inbox,
        badge: "10",
        isActive: pathname.startsWith(ROUTES.SPACES),
      },
    ],
    navSecondary: [
      {
        title: "Calendar",
        url: "#",
        icon: Calendar,
        onClick: () => {},
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        onClick: () => setShowSettings(true),
      },
      {
        title: "Archive",
        url: "#",
        icon: Archive,
        onClick: () => {},
      },
      {
        title: "Help & Support",
        url: "#",
        icon: MessageCircleQuestion,
        onClick: () => {},
      },
    ],
    favorites: [
      {
        name: "The Big Squircle Project.",
        url: "#",
        emoji: "📊",
      },
      {
        name: "Family Recipe Collection & Meal Planning",
        url: "#",
        emoji: "🍳",
      },
      {
        name: "Fitness Tracker & Workout Routines",
        url: "#",
        emoji: "💪",
      },
      {
        name: "Book Notes & Reading List",
        url: "#",
        emoji: "📚",
      },
      {
        name: "Sustainable Gardening Tips & Plant Care",
        url: "#",
        emoji: "🌱",
      },
    ],
  };

  const projects = React.useMemo<SidebarProjectNavItem[]>(
    () =>
      Object.values(projectRecords).map((project) => ({
        id: project.id,
        name: project.name,
        emoji: <ProjectMark name={project.name} size="sm" />,
        href: getProjectRoute(project.id),
        pipelines: project.workflows.filter((workflow) => !workflow.archived).map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          href: `${getProjectRoute(project.id)}?tab=workflows&workflow=${workflow.id}`,
        })),
      })),
    [projectRecords],
  );

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavFavorites favorites={data.favorites} />
        <NavProjects
          projects={projects}
          onCreateProject={() => setProjectCreateOpen(true)}
          onCreateWorkflow={(project) => {
            requestWorkflowCreate(project.id);
            router.push(project.href);
          }}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />

      <CreateProjectSheet
        key={projectCreateOpen ? "project-create-open" : "project-create-closed"}
        open={projectCreateOpen}
        onOpenChange={setProjectCreateOpen}
      />
      <SettingsModal />
    </Sidebar>
  );
}
