"use client";
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isImmersivePage =
    pathname === ROUTES.ASK_SQUIRCLE ||
    pathname === ROUTES.CALENDAR ||
    pathname.startsWith(ROUTES.JAMS) ||
    pathname.startsWith(ROUTES.SPACES);

  return (
    <RequireAuth>
      <SidebarProvider className="h-[100dvh] overflow-hidden">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <Header />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isImmersivePage
                ? "overflow-hidden p-0 md:px-4 md:pt-3 md:pb-0"
                : "gap-4 overflow-y-auto px-4 py-6 md:py-10",
            )}
          >
            {children}
            <Toaster position="top-right" />
            <ProjectNotificationListener />
            <TeamCallNotificationListener />
          </div>
          <CommandSearch />
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
