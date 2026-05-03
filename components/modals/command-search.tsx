"use client";

import * as React from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  Bug,
  Calendar,
  FileText,
  FolderKanban,
  GitBranch,
  Hash,
  HomeIcon,
  InboxIcon,
  LifeBuoy,
  ListChecks,
  ListTodo,
  Library,
  MessageCircleQuestion,
  PlusIcon,
  RefreshCcw,
  Star,
  Store,
  StickyNote,
  Workflow,
  type LucideIcon,
  Gem,
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
import { getWorkspaceDocs } from "@/lib/services/workspace-doc-service";
import { searchWorkspaceKnowledgeBase } from "@/lib/services/workspace-knowledge-base-service";
import { getWorkspaceProjects } from "@/lib/services/workspace-project-service";
import { getWorkspaceJams } from "@/lib/services/workspace-jam-service";
import { getWorkspaceSpaceRooms } from "@/lib/services/workspace-space-service";
import { getWorkspaceSupportTickets } from "@/lib/services/workspace-support-service";
import { getWorkspaceTemplates } from "@/lib/services/workspace-template-service";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/auth";
import { useAppStore, useFavoritesStore, useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import { FavoriteItemType } from "@/types/favorite";
import { getProjectRoute, ROUTES } from "@/utils/constants";
import { resetWalkthroughForUser } from "@/components/walkthrough/storage";
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
  doc: StickyNote,
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

function dedupeSearchResults(items: SearchResultItem[]) {
  const seen = new Set<string>();
  const output: SearchResultItem[] = [];

  for (const item of items) {
    const key = `${normalize(item.href)}::${normalize(item.label)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
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

  const jamsSearchQuery = useQuery({
    queryKey: ["command-search-jams", resolvedWorkspaceId, normalizedQuery],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      getWorkspaceJams(resolvedWorkspaceId, {
        page: 1,
        limit: 25,
        search: normalizedQuery,
        archived: false,
        includeSnapshot: false,
      }),
  });

  const templatesSearchQuery = useQuery({
    queryKey: [
      "command-search-templates",
      resolvedWorkspaceId,
      normalizedQuery,
    ],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      getWorkspaceTemplates(resolvedWorkspaceId, {
        page: 1,
        limit: 25,
        search: normalizedQuery,
        archived: false,
      }),
  });

  const docsSearchQuery = useQuery({
    queryKey: ["command-search-docs", resolvedWorkspaceId, normalizedQuery],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      getWorkspaceDocs(resolvedWorkspaceId, {
        page: 1,
        limit: 25,
        search: normalizedQuery,
        archived: false,
      }),
  });

  const knowledgeBaseSearchQuery = useQuery({
    queryKey: [
      "command-search-knowledge-base",
      resolvedWorkspaceId,
      normalizedQuery,
    ],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      searchWorkspaceKnowledgeBase(resolvedWorkspaceId, {
        query: normalizedQuery,
        page: 1,
        limit: 20,
        source: "all",
        category: "all",
        publishState: "all",
      }),
  });

  const supportTicketsSearchQuery = useQuery({
    queryKey: [
      "command-search-support-tickets",
      resolvedWorkspaceId,
      normalizedQuery,
    ],
    enabled: showSpotlightSearch && queryActive && Boolean(resolvedWorkspaceId),
    queryFn: () =>
      getWorkspaceSupportTickets(resolvedWorkspaceId, {
        page: 1,
        limit: 15,
        search: normalizedQuery,
        status: "all",
        priority: "all",
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
        id: "nav-docs",
        label: "Docs",
        icon: FileText,
        shortcut: "⌘D",
        onSelect: () => closeAndRoute(ROUTES.DOCS),
      },
      {
        id: "nav-kb",
        label: "Knowledge Base",
        icon: Library,
        shortcut: "⌥⌘K",
        onSelect: () => closeAndRoute(ROUTES.KNOWLEDGE_BASE),
      },
      {
        id: "nav-calendar",
        label: "Calendar",
        icon: Calendar,
        shortcut: "⌘L",
        onSelect: () => closeAndRoute(ROUTES.CALENDAR),
      },
      {
        id: "nav-ask",
        label: "Scribe",
        icon: Gem,
        hint: "Coming soon",
        disabled: true,
        shortcut: "⌘A",
        onSelect: () => closeAndRoute(ROUTES.ASK_SQUIRCLE),
      },
      {
        id: "nav-templates",
        label: "Templates",
        icon: Store,
        shortcut: "⌘T",
        onSelect: () => closeAndRoute(ROUTES.TEMPLATES),
      },
      {
        id: "nav-portfolio",
        label: "Portfolio",
        icon: BarChart3,
        shortcut: "⌘P",
        onSelect: () => closeAndRoute(ROUTES.PORTFOLIO),
      },
      {
        id: "nav-support",
        label: user?.isInternal ? "Support Admin" : "Help & Support",
        icon: user?.isInternal ? MessageCircleQuestion : LifeBuoy,
        shortcut: "⌥⌘S",
        onSelect: () =>
          closeAndRoute(
            user?.isInternal ? ROUTES.SUPPORT_ADMIN : ROUTES.SUPPORT,
          ),
      },
      {
        id: "nav-archive",
        label: "Archive",
        icon: Archive,
        shortcut: "⌥⌘A",
        onSelect: () => closeAndRoute(ROUTES.ARCHIVE),
      },
    ],
    [closeAndRoute, user?.isInternal],
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
        id: "action-new-jam",
        label: "New jam",
        icon: StickyNote,
        shortcut: "⌥⌘N",
        onSelect: () => closeAndRoute(`${ROUTES.JAMS}?create=1`),
      },
      {
        id: "action-new-doc",
        label: "New doc",
        icon: FileText,
        shortcut: "⌥⌘D",
        onSelect: () => closeAndRoute(ROUTES.DOCS),
      },
      {
        id: "action-new-support-ticket",
        label: "New support ticket",
        icon: LifeBuoy,
        shortcut: "⌥⌘H",
        onSelect: () => closeAndRoute(ROUTES.SUPPORT),
      },
      {
        id: "action-new-template",
        label: "New template",
        icon: Store,
        shortcut: "⇧⌘T",
        onSelect: () => closeAndRoute(ROUTES.TEMPLATES),
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
      {
        id: "action-restart-walkthrough",
        label: "Restart walkthrough",
        icon: RefreshCcw,
        hint: "Replay guided tours",
        onSelect: () =>
          runAction(() => {
            resetWalkthroughForUser(String(user?._id || ""));
            window.location.reload();
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
      user?._id,
    ],
  );

  const projectResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const items = projectsSearchQuery.data?.data?.projects ?? [];
    return dedupeSearchResults(
      items.map((entry) => ({
        id: `project:${entry.projectId}`,
        label: entry.name,
        href: getProjectRoute(entry.projectId),
        icon: FolderKanban,
        hint: entry.status,
      })),
    );
  }, [projectsSearchQuery.data, queryActive]);

  const chatResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const rooms = chatsSearchQuery.data?.data?.rooms ?? [];
    return dedupeSearchResults(
      rooms.map((room) => ({
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
      })),
    );
  }, [chatsSearchQuery.data, queryActive]);

  const jamResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const jams = jamsSearchQuery.data?.data?.jams ?? [];
    return dedupeSearchResults(
      jams.map((jam) => ({
        id: `jam:${jam.id}`,
        label: jam.title,
        href: `${ROUTES.JAMS}/${jam.id}`,
        icon: StickyNote,
        hint: jam.visibility === "workspace" ? "Workspace jam" : "Private jam",
      })),
    );
  }, [jamsSearchQuery.data, queryActive]);

  const templateResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const templates = templatesSearchQuery.data?.data?.templates ?? [];
    return dedupeSearchResults(
      templates.map((template) => ({
        id: `template:${template.id}`,
        label: template.name,
        href: ROUTES.TEMPLATES,
        icon: Store,
        hint: `${template.kind} template`,
      })),
    );
  }, [queryActive, templatesSearchQuery.data]);

  const routeResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const pageResults: SearchResultItem[] = [
      {
        id: "route:dashboard",
        label: "Dashboard",
        href: ROUTES.DASHBOARD,
        icon: HomeIcon,
        hint: "Page",
      },
      {
        id: "route:spaces",
        label: "Spaces",
        href: ROUTES.SPACES,
        icon: InboxIcon,
        hint: "Page",
      },
      {
        id: "route:jams",
        label: "Jams",
        href: ROUTES.JAMS,
        icon: StickyNote,
        hint: "Page",
      },
      {
        id: "route:docs",
        label: "Docs",
        href: ROUTES.DOCS,
        icon: FileText,
        hint: "Page",
      },
      {
        id: "route:knowledge-base",
        label: "Knowledge Base",
        href: ROUTES.KNOWLEDGE_BASE,
        icon: Library,
        hint: "Page",
      },
      {
        id: "route:portfolio",
        label: "Portfolio",
        href: ROUTES.PORTFOLIO,
        icon: BarChart3,
        hint: "Page",
      },
      {
        id: "route:templates",
        label: "Templates",
        href: ROUTES.TEMPLATES,
        icon: Store,
        hint: "Page",
      },
      {
        id: "route:calendar",
        label: "Calendar",
        href: ROUTES.CALENDAR,
        icon: Calendar,
        hint: "Page",
      },
      {
        id: "route:archive",
        label: "Archive",
        href: ROUTES.ARCHIVE,
        icon: Archive,
        hint: "Page",
      },
      {
        id: "route:support",
        label: user?.isInternal ? "Support Admin" : "Help & Support",
        href: user?.isInternal ? ROUTES.SUPPORT_ADMIN : ROUTES.SUPPORT,
        icon: user?.isInternal ? MessageCircleQuestion : LifeBuoy,
        hint: "Page",
      },
    ];

    return dedupeSearchResults(
      pageResults.filter((item) =>
        includesQuery(`${item.label} ${item.hint || ""}`, normalizedQuery),
      ),
    );
  }, [normalizedQuery, queryActive, user?.isInternal]);

  const docsResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const docs = docsSearchQuery.data?.data?.docs ?? [];
    return dedupeSearchResults(
      docs.map((doc) => ({
        id: `doc:${doc.id}`,
        label: doc.title || "Untitled doc",
        href: `${ROUTES.DOCS}/${encodeURIComponent(doc.id)}`,
        icon: FileText,
        hint: `${doc.category || "general"} • doc`,
        badge: doc.publishState,
      })),
    );
  }, [docsSearchQuery.data, queryActive]);

  const knowledgeBaseResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const articles = knowledgeBaseSearchQuery.data?.data?.articles ?? [];
    return dedupeSearchResults(
      articles.map((article) => ({
        id: `kb:${article.id}`,
        label: article.title,
        href: article.route || ROUTES.KNOWLEDGE_BASE,
        icon:
          article.source === "project"
            ? FolderKanban
            : article.source === "curated"
              ? BookOpen
              : Library,
        hint: `${article.category} • knowledge`,
        badge: `${Math.round(Number(article.confidenceScore || 0) * 100)}%`,
      })),
    );
  }, [knowledgeBaseSearchQuery.data, queryActive]);

  const supportTicketResults = React.useMemo<SearchResultItem[]>(() => {
    if (!queryActive) {
      return [];
    }

    const tickets = supportTicketsSearchQuery.data?.data?.tickets ?? [];
    return dedupeSearchResults(
      tickets.map((ticket) => ({
        id: `support:${ticket.id}`,
        label: ticket.subject,
        href: `${ROUTES.SUPPORT}/tickets/${encodeURIComponent(ticket.id)}`,
        icon: LifeBuoy,
        hint: `${ticket.priority} • ${ticket.status}`,
        badge: ticket.category,
      })),
    );
  }, [queryActive, supportTicketsSearchQuery.data]);

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

    const reservedKeys = new Set(
      [
        ...routeResults,
        ...projectResults,
        ...chatResults,
        ...jamResults,
        ...templateResults,
        ...docsResults,
        ...knowledgeBaseResults,
        ...supportTicketResults,
        ...localWorkflowTaskRiskResults,
      ].map((item) => `${normalize(item.href)}::${normalize(item.label)}`),
    );

    return favorites
      .filter((favorite) =>
        includesQuery(
          `${favorite.label} ${favorite.subtitle || ""} ${favorite.type}`,
          normalizedQuery,
        ),
      )
      .filter((favorite) => {
        const key = `${normalize(favorite.href)}::${normalize(favorite.label)}`;
        return !reservedKeys.has(key);
      })
      .slice(0, 12)
      .map((favorite) => ({
        id: `favorite:${favorite.key}`,
        label: favorite.label,
        href: favorite.href,
        icon: FAVORITE_ICON_MAP[favorite.type] ?? Star,
        hint: favorite.subtitle || "Favorite",
        badge: "Favorite",
      }));
  }, [
    chatResults,
    docsResults,
    favorites,
    jamResults,
    knowledgeBaseResults,
    localWorkflowTaskRiskResults,
    normalizedQuery,
    projectResults,
    queryActive,
    routeResults,
    supportTicketResults,
    templateResults,
  ]);

  const loadingSearchResults =
    queryActive &&
    (projectsSearchQuery.isFetching ||
      chatsSearchQuery.isFetching ||
      jamsSearchQuery.isFetching ||
      templatesSearchQuery.isFetching ||
      docsSearchQuery.isFetching ||
      knowledgeBaseSearchQuery.isFetching ||
      supportTicketsSearchQuery.isFetching);

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
              {loadingSearchResults ? (
                <CommandGroup heading="Searching">
                  <CommandItem disabled>
                    <LoaderComponent />
                  </CommandItem>
                </CommandGroup>
              ) : null}

              {routeResults.length ? (
                <CommandGroup heading="Pages">
                  {routeResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => closeAndRoute(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      <span className="text-muted-foreground ml-auto text-[11px]">
                        {item.hint}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {projectResults.length ? (
                <CommandGroup heading="Projects">
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
                </CommandGroup>
              ) : null}

              {docsResults.length ? (
                <CommandGroup heading="Docs">
                  {docsResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => closeAndRoute(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.badge ? (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] capitalize"
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
                </CommandGroup>
              ) : null}

              {knowledgeBaseResults.length ? (
                <CommandGroup heading="Knowledge Base">
                  {knowledgeBaseResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => closeAndRoute(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.badge ? (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px]"
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
                </CommandGroup>
              ) : null}

              {supportTicketResults.length ? (
                <CommandGroup heading="Support">
                  {supportTicketResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => closeAndRoute(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.badge ? (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] capitalize"
                        >
                          {item.badge}
                        </Badge>
                      ) : item.hint ? (
                        <span className="text-muted-foreground ml-auto text-[11px] capitalize">
                          {item.hint}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {chatResults.length ? (
                <CommandGroup heading="Chats">
                  {chatResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => closeAndRoute(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.badge ? (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      ) : item.hint ? (
                        <span className="text-muted-foreground ml-auto text-[11px] capitalize">
                          {item.hint}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {jamResults.length ? (
                <CommandGroup heading="Jams">
                  {jamResults.map((item) => (
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
                </CommandGroup>
              ) : null}

              {templateResults.length ? (
                <CommandGroup heading="Templates">
                  {templateResults.map((item) => (
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
                </CommandGroup>
              ) : null}

              {localWorkflowTaskRiskResults.length ? (
                <CommandGroup heading="Work Items">
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
                </CommandGroup>
              ) : null}

              {favoriteResults.length ? (
                <CommandGroup heading="Favorites">
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
              ) : null}

              {!loadingSearchResults &&
              !routeResults.length &&
              !projectResults.length &&
              !docsResults.length &&
              !knowledgeBaseResults.length &&
              !supportTicketResults.length &&
              !chatResults.length &&
              !jamResults.length &&
              !templateResults.length &&
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
