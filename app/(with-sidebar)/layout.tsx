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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isImmersivePage =
    pathname === ROUTES.ASK_SQUIRCLE || pathname.startsWith(ROUTES.SPACES);

  return (
    <RequireAuth>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isImmersivePage
                ? "p-0 md:px-4 md:pt-3 md:pb-0"
                : "gap-4 px-4 py-6 md:py-10",
            )}
          >
            {children}
            <Toaster position="top-right" />
          </div>
          <CommandSearch />
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
