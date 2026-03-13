"use client";

import * as React from "react";
import {
  Archive,
  Calendar,
  FolderKanban,
  Home,
  Inbox,
  MessageCircleQuestion,
  Shapes,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { CreateProjectSheet } from "@/components/projects/create-project-sheet";
import { shouldShowProfileCompletionIndicator } from "@/lib/helpers/profile-completion";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { NavFavorites } from "@/components/nav-favorites";
import { NavMain } from "@/components/nav-main";
import { NavProjects, SidebarProjectNavItem } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import useAuthStore from "@/stores/auth";
import { useAppStore, useFavoritesStore, useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import { getProjectRoute, ROUTES } from "@/utils/constants";

import SettingsModal from "./modals/settings-modal";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setShowSettings, setShowSpotlightSearch } = useAppStore();
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const { workspaceId } = useWorkspaceStore();
  const projectRecords = useProjectStore((state) => state.projectRecords);
  const favorites = useFavoritesStore((state) => state.favorites);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const setFavoritesWorkspaceScope = useFavoritesStore(
    (state) => state.setWorkspaceScope,
  );
  const projectCreateOpen = useProjectStore((state) => state.projectCreateOpen);
  const setProjectCreateOpen = useProjectStore(
    (state) => state.setProjectCreateOpen,
  );
  const requestWorkflowCreate = useProjectStore(
    (state) => state.requestWorkflowCreate,
  );
  const hydrateProjectRecords = useProjectStore(
    (state) => state.hydrateProjectRecords,
  );
  const setProjectsLoaded = useProjectStore((state) => state.setProjectsLoaded);
  const { useWorkspaceProjects } = useWorkspaceProject();
  const workspacePermissions = useWorkspacePermissions();
  const canCreateProjects = workspacePermissions.canCreateProjects;
  const canCreateWorkflows = workspacePermissions.canCreateWorkflows;

  const projectQueryParams = React.useMemo(
    () => ({ page: 1, limit: 100, search: "", archived: false }),
    [],
  );

  const workspaceProjectsQuery = useWorkspaceProjects(
    workspaceId ?? "",
    projectQueryParams,
  );

  React.useEffect(() => {
    setFavoritesWorkspaceScope(workspaceId);
  }, [setFavoritesWorkspaceScope, workspaceId]);

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

  const showSettingsCompletionDot = React.useMemo(
    () => shouldShowProfileCompletionIndicator(user),
    [user],
  );

  const data = {
    navMain: [
      {
        title: "Search",
        url: "#",
        icon: Search,
        onClick: () => setShowSpotlightSearch(true),
      },
      {
        title: "Ask Squircle",
        url: ROUTES.ASK_SQUIRCLE,
        icon: Sparkles,
        disabled: true,
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
      {
        title: "Jams",
        url: ROUTES.JAMS,
        icon: Shapes,
        isActive: pathname.startsWith(ROUTES.JAMS),
      },
    ],
    navSecondary: [
      {
        title: "Calendar",
        url: ROUTES.CALENDAR,
        icon: Calendar,
        isActive: pathname === ROUTES.CALENDAR,
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        badge: showSettingsCompletionDot ? (
          <Badge
            variant="secondary"
            className="bg-primary/20 text-primary ring-primary/30 inline-flex size-2.5 rounded-full p-0 ring-1"
          />
        ) : undefined,
        onClick: () => setShowSettings(true),
      },
      {
        title: "Archive",
        url: "#",
        icon: Archive,
        disabled: true,
      },
      {
        title: "Help & Support",
        url: "#",
        icon: MessageCircleQuestion,
        onClick: () => {},
      },
    ],
  };

  const projects = React.useMemo<SidebarProjectNavItem[]>(
    () =>
      Object.values(projectRecords).map((project) => ({
        id: project.id,
        name: project.name,
        emoji: (
          <span className="bg-muted/60 text-muted-foreground inline-flex size-5 items-center justify-center rounded-sm border border-border/35">
            <FolderKanban className="size-3.5" />
          </span>
        ),
        href: getProjectRoute(project.id),
        pipelines: project.workflows
          .filter((workflow) => !workflow.archived)
          .map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            href: `${getProjectRoute(project.id)}?tab=workflows&workflow=${workflow.id}`,
            status: workflow.status,
          })),
      })),
    [projectRecords],
  );
  const hasFavorites = favorites.length > 0;

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="shrink-0 border-b border-sidebar-border/50">
        <TeamSwitcher />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <NavProjects
            projects={projects}
            canCreateProject={canCreateProjects}
            canCreateWorkflow={canCreateWorkflows}
            onCreateProject={() => setProjectCreateOpen(true)}
            onCreateWorkflow={(project) => {
              requestWorkflowCreate(project.id);
              router.push(project.href);
            }}
          />
          {hasFavorites ? (
            <NavFavorites
              favorites={favorites}
              onRemoveFavorite={removeFavorite}
            />
          ) : null}
        </div>
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-t border-sidebar-border/50">
        <NavSecondary items={data.navSecondary} />
      </SidebarFooter>
      <SidebarRail />

      <CreateProjectSheet
        key={
          projectCreateOpen ? "project-create-open" : "project-create-closed"
        }
        open={projectCreateOpen}
        onOpenChange={setProjectCreateOpen}
      />
      <SettingsModal />
    </Sidebar>
  );
}
