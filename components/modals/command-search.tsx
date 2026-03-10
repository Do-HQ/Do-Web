"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bug,
  FolderKanban,
  GitBranch,
  Hash,
  HomeIcon,
  InboxIcon,
  ListChecks,
  ListTodo,
  Loader2,
  PlusIcon,
  Sparkles,
  Star,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { useQuery } from "@tanstack/react-query";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { getWorkspaceProjects } from "@/lib/services/workspace-project-service";
import { getWorkspaceSpaceRooms } from "@/lib/services/workspace-space-service";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/auth";
import { useAppStore, useFavoritesStore, useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import { FavoriteItemType } from "@/types/favorite";
import { getProjectRoute, ROUTES } from "@/utils/constants";
import LoaderComponent from "../shared/loader";

type QuickActionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  disabled?: boolean;
  shortcut?: string;
  onSelect: () => void;
};

type SearchResultItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
  badge?: string;
};

const FAVORITE_ICON_MAP: Record<FavoriteItemType, LucideIcon> = {
  chat: Hash,
  workflow: GitBranch,
  task: ListTodo,
  subtask: ListChecks,
  risk: AlertTriangle,
  issue: Bug,
};

function normalize(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function includesQuery(value: string, query: string) {
  const source = normalize(value);
  const target = normalize(query);

  if (!target) {
    return false;
  }

  return source.includes(target);
}

function getProjectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

const CommandSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);
  const normalizedQuery = normalize(debouncedSearch);
  const queryActive = normalizedQuery.length >= 2;

  const { showSpotlightSearch, setShowSpotlightSearch } = useAppStore();
  const projectRecords = useProjectStore((state) => state.projectRecords);
  const requestWorkflowCreate = useProjectStore(
    (state) => state.requestWorkflowCreate,
  );
  const requestTaskCreate = useProjectStore((state) => state.requestTaskCreate);
  const setProjectCreateOpen = useProjectStore(
    (state) => state.setProjectCreateOpen,
  );
  const favorites = useFavoritesStore((state) => state.favorites);
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();

  const currentProjectId = getProjectIdFromPath(pathname);
  const currentProjectExists = Boolean(
    currentProjectId && projectRecords[currentProjectId],
  );

  const resolvedWorkspaceId =
    workspaceId || String(user?.currentWorkspaceId?._id || "");

  const projectsSearchQuery = useQuery({
    queryKey: ["command-search-projects", resolvedWorkspaceId, normalizedQuery],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      getWorkspaceProjects(resolvedWorkspaceId, {
        page: 1,
        limit: 20,
        search: normalizedQuery,
        archived: false,
      }),
  });

  const chatsSearchQuery = useQuery({
    queryKey: ["command-search-chats", resolvedWorkspaceId, normalizedQuery],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      getWorkspaceSpaceRooms(resolvedWorkspaceId, {
        page: 1,
        limit: 25,
        search: normalizedQuery,
        kind: "all",
      }),
  });

  const closeAndRoute = React.useCallback(
    (href: string) => {
      setShowSpotlightSearch(false);
      setSearch("");
      router.push(href);
    },
    [router, setShowSpotlightSearch],
  );

  const runAction = React.useCallback(
    (handler: () => void) => {
      setShowSpotlightSearch(false);
      setSearch("");
      handler();
    },
    [setShowSpotlightSearch],
  );

  const navigationItems = React.useMemo<QuickActionItem[]>(
    () => [
      {
        id: "nav-home",
        label: "Home",
        icon: HomeIcon,
        shortcut: "⌘H",
        onSelect: () => closeAndRoute(ROUTES.DASHBOARD),
      },
      {
        id: "nav-spaces",
        label: "Spaces",
        icon: InboxIcon,
        shortcut: "⌘C",
        onSelect: () => closeAndRoute(ROUTES.SPACES),
      },
      {
        id: "nav-ask",
        label: "Ask Squircle",
        icon: Sparkles,
        shortcut: "⌘A",
        onSelect: () => closeAndRoute(ROUTES.ASK_SQUIRCLE),
      },
    ],
    [closeAndRoute],
  );

  const actionItems = React.useMemo<QuickActionItem[]>(
    () => [
      {
        id: "action-new-project",
        label: "New project",
        icon: PlusIcon,
        shortcut: "⌘N",
        onSelect: () =>
          runAction(() => {
            setProjectCreateOpen(true);
          }),
      },
      {
        id: "action-new-space",
        label: "New space",
        icon: Hash,
        shortcut: "⇧⌘N",
        onSelect: () => closeAndRoute(ROUTES.SPACES),
      },
      {
        id: "action-new-workflow",
        label: "Create workflow",
        icon: Workflow,
        hint: currentProjectExists
          ? "Current project"
          : "Open from a project screen",
        disabled: !currentProjectExists,
        onSelect: () =>
          runAction(() => {
            if (!currentProjectId) {
              return;
            }
            requestWorkflowCreate(currentProjectId);
            router.push(getProjectRoute(currentProjectId));
          }),
      },
      {
        id: "action-new-task",
        label: "Create task",
        icon: ListTodo,
        hint: currentProjectExists
          ? "Current project"
          : "Open from a project screen",
        disabled: !currentProjectExists,
        onSelect: () =>
          runAction(() => {
            if (!currentProjectId) {
              return;
            }
            requestTaskCreate(currentProjectId);
            router.push(`${getProjectRoute(currentProjectId)}?tab=dos`);
          }),
      },
    ],
    [
      closeAndRoute,
      currentProjectExists,
      currentProjectId,
      requestTaskCreate,
      requestWorkflowCreate,
      router,
      runAction,
      setProjectCreateOpen,
    ],
  );

  const projectResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const items = projectsSearchQuery.data?.data?.projects ?? [];
    return items.map((entry) => ({
      id: `project:${entry.projectId}`,
      label: entry.name,
      href: getProjectRoute(entry.projectId),
      icon: FolderKanban,
      hint: entry.status,
    }));
  }, [projectsSearchQuery.data, queryActive]);

  const chatResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const rooms = chatsSearchQuery.data?.data?.rooms ?? [];
    return rooms.map((room) => ({
      id: `chat:${room.id}`,
      label: room.name,
      href: `${ROUTES.SPACES}?room=${encodeURIComponent(room.id)}`,
      icon: Hash,
      hint:
        room.kind === "direct"
          ? "Direct chat"
          : room.scope === "project"
            ? "Project chat"
            : room.scope === "task"
              ? "Task thread"
              : `${room.scope} chat`,
      badge: room.unread > 0 ? `${room.unread} new` : undefined,
    }));
  }, [chatsSearchQuery.data, queryActive]);

  const localWorkflowTaskRiskResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const items: SearchResultItem[] = [];

    for (const project of Object.values(projectRecords)) {
      for (const workflow of project.workflows) {
        if (workflow.archived) {
          continue;
        }

        if (
          includesQuery(
            `${workflow.name} ${workflow.description || ""} ${project.name}`,
            normalizedQuery,
          )
        ) {
          items.push({
            id: `workflow:${project.id}:${workflow.id}`,
            label: workflow.name,
            href: `${getProjectRoute(project.id)}?tab=workflows&workflow=${workflow.id}`,
            icon: GitBranch,
            hint: `${project.name} • workflow`,
          });
        }

        for (const task of workflow.tasks) {
          if (
            includesQuery(
              `${task.title} ${task.status} ${task.priority} ${workflow.name} ${project.name}`,
              normalizedQuery,
            )
          ) {
            items.push({
              id: `task:${project.id}:${workflow.id}:${task.id}`,
              label: task.title,
              href: `${getProjectRoute(project.id)}?tab=dos&workflow=${workflow.id}&task=${task.id}`,
              icon: ListTodo,
              hint: `${project.name} • ${workflow.name}`,
              badge: task.status,
            });
          }

          for (const subtask of task.subtasks ?? []) {
            if (
              includesQuery(
                `${subtask.title} ${subtask.status} ${task.title} ${workflow.name} ${project.name}`,
                normalizedQuery,
              )
            ) {
              items.push({
                id: `subtask:${project.id}:${workflow.id}:${task.id}:${subtask.id}`,
                label: subtask.title,
                href: `${getProjectRoute(project.id)}?tab=dos&workflow=${workflow.id}&task=${task.id}&subtask=${subtask.id}`,
                icon: ListChecks,
                hint: `${project.name} • ${task.title}`,
                badge: "Subtask",
              });
            }
          }
        }
      }

      for (const risk of project.risks) {
        if (
          includesQuery(
            `${risk.title} ${risk.description} ${risk.kind} ${risk.severity} ${risk.state} ${project.name}`,
            normalizedQuery,
          )
        ) {
          items.push({
            id: `${risk.kind}:${project.id}:${risk.id}`,
            label: risk.title,
            href: `${getProjectRoute(project.id)}?tab=risks-issues&riskId=${risk.id}`,
            icon: risk.kind === "issue" ? Bug : AlertTriangle,
            hint: `${project.name} • ${risk.kind}`,
            badge: risk.severity,
          });
        }
      }
    }

    return items.slice(0, 80);
  }, [normalizedQuery, projectRecords, queryActive]);

  const favoriteResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    return favorites
      .filter((favorite) =>
        includesQuery(
          `${favorite.label} ${favorite.subtitle || ""} ${favorite.type}`,
          normalizedQuery,
        ),
      )
      .slice(0, 12)
      .map((favorite) => ({
        id: `favorite:${favorite.key}`,
        label: favorite.label,
        href: favorite.href,
        icon: FAVORITE_ICON_MAP[favorite.type] ?? Star,
        hint: favorite.subtitle || "Favorite",
        badge: "Favorite",
      }));
  }, [favorites, normalizedQuery, queryActive]);

  const loadingSearchResults =
    queryActive &&
    (projectsSearchQuery.isFetching || chatsSearchQuery.isFetching);

  React.useEffect(() => {
    if (!showSpotlightSearch) {
      setSearch("");
    }
  }, [showSpotlightSearch]);

  useHotkeys(
    "meta+k,ctrl+k",
    (event) => {
      event.preventDefault();
      setShowSpotlightSearch(true);
    },
    [setShowSpotlightSearch],
  );

  return (
    <CommandDialog
      open={showSpotlightSearch}
      onOpenChange={setShowSpotlightSearch}
      className="max-w-2xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search anything..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[68vh]">
          {!queryActive ? (
            <>
              <CommandGroup heading="Navigation">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem key={item.id} onSelect={item.onSelect}>
                      <Icon />
                      <span>{item.label}</span>
                      {item.shortcut ? (
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                {actionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={item.onSelect}
                      disabled={item.disabled}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {item.hint ? (
                        <span className="text-muted-foreground ml-auto text-[11px]">
                          {item.hint}
                        </span>
                      ) : item.shortcut ? (
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : (
            <>
              <CommandGroup heading="Results">
                {loadingSearchResults ? (
                  <CommandItem disabled>
                    <LoaderComponent />
                  </CommandItem>
                ) : null}

                {projectResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => closeAndRoute(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.hint ? (
                      <span className="text-muted-foreground ml-auto text-[11px] capitalize">
                        {item.hint}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}

                {chatResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => closeAndRoute(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : item.hint ? (
                      <span className="text-muted-foreground ml-auto text-[11px] capitalize">
                        {item.hint}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}

                {localWorkflowTaskRiskResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => closeAndRoute(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <Badge
                        variant="outline"
                        className={cn("ml-auto text-[10px] capitalize")}
                      >
                        {item.badge}
                      </Badge>
                    ) : item.hint ? (
                      <span className="text-muted-foreground ml-auto text-[11px]">
                        {item.hint}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}

                {favoriteResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => closeAndRoute(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {item.badge}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>

              {!loadingSearchResults &&
              !projectResults.length &&
              !chatResults.length &&
              !localWorkflowTaskRiskResults.length &&
              !favoriteResults.length ? (
                <CommandEmpty>
                  No results found for &quot;{search}&quot;.
                </CommandEmpty>
              ) : null}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default CommandSearch;
