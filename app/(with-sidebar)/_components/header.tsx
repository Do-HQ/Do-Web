"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { NavActions } from "@/components/nav-actions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/utils/constants";

const routeTitleMap: Record<string, string> = {
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.CALENDAR]: "Calendar",
  [ROUTES.ARCHIVE]: "Archive",
  [ROUTES.DOCS]: "Docs",
  [ROUTES.ASK_SQUIRCLE]: "Ask Squircle",
  [ROUTES.SPACES]: "Spaces",
  [ROUTES.SPACES_TEAM_CALL]: "Team Call",
};

const Header = () => {
  const pathname = usePathname();
  const [hasTitleSlot, setHasTitleSlot] = useState(false);
  const [hasActionsSlot, setHasActionsSlot] = useState(false);

  useEffect(() => {
    const titleSlot = document.getElementById("app-header-title-slot");
    const actionsSlot = document.getElementById("app-header-actions-slot");

    if (!titleSlot && !actionsSlot) {
      return;
    }

    const updateState = () => {
      setHasTitleSlot(Boolean(titleSlot?.childElementCount));
      setHasActionsSlot(Boolean(actionsSlot?.childElementCount));
    };

    updateState();

    const titleObserver = titleSlot
      ? new MutationObserver(() => updateState())
      : null;
    const actionsObserver = actionsSlot
      ? new MutationObserver(() => updateState())
      : null;

    if (titleSlot && titleObserver) {
      titleObserver.observe(titleSlot, { childList: true, subtree: true });
    }
    if (actionsSlot && actionsObserver) {
      actionsObserver.observe(actionsSlot, { childList: true, subtree: true });
    }

    return () => {
      titleObserver?.disconnect();
      actionsObserver?.disconnect();
    };
  }, [pathname]);

  const breadcrumbTitle = useMemo(() => {
    if (pathname.startsWith(`${ROUTES.PROJECTS}/`)) {
      return "Project";
    }

    if (pathname.startsWith(`${ROUTES.DOCS}/`)) {
      return "Docs";
    }

    return (
      routeTitleMap[pathname] ??
      pathname
        .split("/")
        .filter(Boolean)
        .slice(-1)[0]
        ?.split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") ??
      "Dashboard"
    );
  }, [pathname]);

  return (
    <header className="bg-background/92 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <SidebarSeparator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div
          id="app-header-title-slot"
          className={cn("min-w-0 flex-1", !hasTitleSlot && "hidden")}
        />
        {!hasTitleSlot ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {breadcrumbTitle}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
      </div>
      <div
        id="app-header-actions-slot"
        className={cn("ml-auto flex items-center gap-1", !hasActionsSlot && "hidden")}
      />
      <div className="px-3">
        <NavActions />
      </div>
    </header>
  );
};

export default Header;
