"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  GitBranch,
  Hash,
  ListChecks,
  ListTodo,
  MoreHorizontal,
  ShieldAlert,
  Star,
  StarOff,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppFavoriteItem, FavoriteItemType } from "@/types/favorite";

export function NavFavorites({
  favorites,
  onRemoveFavorite,
}: {
  favorites: AppFavoriteItem[];
  onRemoveFavorite: (key: string) => void;
}) {
  const { isMobile } = useSidebar();
  const [expanded, setExpanded] = useState(false);

  const displayedFavorites = useMemo(
    () => (expanded ? favorites : favorites.slice(0, 10)),
    [expanded, favorites],
  );
  const hiddenCount = Math.max(favorites.length - 10, 0);

  if (!favorites.length) {
    return null;
  }

  const typeIconMap: Record<
    FavoriteItemType,
    React.ComponentType<{ className?: string }>
  > = {
    chat: Hash,
    workflow: GitBranch,
    task: ListTodo,
    subtask: ListChecks,
    risk: TriangleAlert,
    issue: ShieldAlert,
  };

  const handleCopyLink = async (href: string) => {
    try {
      const absoluteLink =
        typeof window !== "undefined" && href.startsWith("/")
          ? `${window.location.origin}${href}`
          : href;
      await navigator.clipboard.writeText(absoluteLink);
      toast("Favorite link copied.");
    } catch {
      toast("Could not copy favorite link.");
    }
  };

  const handleOpenInNewTab = (href: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden py-1">
      <SidebarGroupLabel className="h-7 px-1.5 text-[11px]">Favorites</SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {displayedFavorites.map((item) => {
          const TypeIcon = typeIconMap[item.type] ?? Star;

          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                asChild
                size="sm"
                className="h-7 gap-2 rounded-md px-1.5"
              >
                <Link href={item.href} title={item.label}>
                  <span className="bg-muted/45 text-muted-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-sm">
                    <TypeIcon className="size-3" />
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium font-sans text-[12.5px] leading-none">
                      {item.label}
                    </span>
                    {item.subtitle ? (
                      <span className="text-muted-foreground inline-flex min-w-0 items-center truncate text-[10px] leading-none">
                        <span className="mr-1 opacity-60">•</span>
                        <span className="truncate">{item.subtitle}</span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem
                    onClick={() => onRemoveFavorite(item.key)}
                  >
                    <StarOff className="text-muted-foreground" />
                    <span>Remove from favorites</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleCopyLink(item.href)}>
                    <Hash className="text-muted-foreground" />
                    <span>Copy link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenInNewTab(item.href)}
                  >
                    <ArrowUpRight className="text-muted-foreground" />
                    <span>Open in new tab</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}

        {hiddenCount > 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className={cn(
                "text-sidebar-foreground/70 h-7 gap-2 px-1.5 text-[11px]",
                expanded && "bg-sidebar-accent/55 text-sidebar-accent-foreground",
              )}
            >
              <MoreHorizontal className="size-3.5" />
              <span>{expanded ? "Show less" : `More (${hiddenCount})`}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  );
}
