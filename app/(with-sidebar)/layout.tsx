"use client";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Header from "./_components/header";
import CommandSearch from "@/components/modals/command-search";
import RequireAuth from "@/middleware";
import { Toaster } from "@/components/ui/sonner";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/utils/constants";
import { cn } from "@/lib/utils";
import ProjectNotificationListener from "@/components/projects/project-notification-listener";
import TeamCallNotificationListener from "@/components/spaces/team-call-notification-listener";
import RouteWalkthrough from "@/components/walkthrough/route-walkthrough";
import useWorkspaceStore from "@/stores/workspace";
import { recordRecentVisit } from "@/lib/helpers/recent-visits";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { workspaceId } = useWorkspaceStore();
  const isJamCanvasRoute =
    pathname.startsWith(`${ROUTES.JAMS}/`) && pathname !== ROUTES.JAMS;
  const isImmersivePage =
    pathname === ROUTES.ASK_SQUIRCLE ||
    pathname === ROUTES.CALENDAR ||
    pathname.startsWith(ROUTES.JAMS) ||
    pathname.startsWith(ROUTES.SPACES);

  useEffect(() => {
    const scopedWorkspaceId = String(workspaceId || "").trim();
    if (!scopedWorkspaceId || !pathname) {
      return;
    }

    if (pathname.startsWith(`${ROUTES.PROJECTS}/`)) {
      const projectId = decodeURIComponent(
        pathname.slice(`${ROUTES.PROJECTS}/`.length).split("/")[0] || "",
      ).trim();

      if (!projectId) {
        return;
      }

      recordRecentVisit({
        workspaceId: scopedWorkspaceId,
        key: `project:${projectId}`,
        kind: "project",
        href: `${ROUTES.PROJECTS}/${encodeURIComponent(projectId)}`,
      });
      return;
    }

    if (pathname.startsWith(`${ROUTES.JAMS}/`)) {
      const jamId = decodeURIComponent(
        pathname.slice(`${ROUTES.JAMS}/`.length).split("/")[0] || "",
      ).trim();

      if (!jamId) {
        return;
      }

      recordRecentVisit({
        workspaceId: scopedWorkspaceId,
        key: `jam:${jamId}`,
        kind: "jam",
        href: `${ROUTES.JAMS}/${encodeURIComponent(jamId)}`,
      });
    }
  }, [pathname, workspaceId]);

  if (isJamCanvasRoute) {
    return (
      <RequireAuth>
        <div className="bg-background h-[100dvh] overflow-hidden">
          {children}
          <Toaster position="top-right" />
          <ProjectNotificationListener />
          <TeamCallNotificationListener />
          <RouteWalkthrough />
          <CommandSearch />
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <SidebarProvider className="h-[100dvh] overflow-hidden">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <Header />
          <div
            className={cn(
              "flex h-full min-h-0 flex-1 flex-col",
              isImmersivePage
                ? "overflow-hidden p-0 md:px-4 md:pt-3 md:pb-0"
                : "gap-4 overflow-y-auto px-4 py-6 md:py-10",
            )}
          >
            {children}
            <Toaster position="top-right" />
            <ProjectNotificationListener />
            <TeamCallNotificationListener />
            <RouteWalkthrough />
          </div>
          <CommandSearch />
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
