"use client";

import { useMemo } from "react";
import { NavActions } from "@/components/nav-actions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

const routeTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ask-squircle": "Ask Squircle",
  "/spaces": "Spaces",
  "/spaces/team-call": "Team Call",
};

const Header = () => {
  const pathname = usePathname();

  const breadcrumbTitle = useMemo(() => {
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
    <header className="flex h-14 shrink-0 items-center gap-2">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <SidebarSeparator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">
                {breadcrumbTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-3">
        <NavActions />
      </div>
    </header>
  );
};

export default Header;
