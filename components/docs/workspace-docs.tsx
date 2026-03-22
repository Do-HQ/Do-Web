"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookMarked,
  BookText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock3,
  Eye,
  FileText,
  Globe,
  Grid2X2,
  List,
  Loader,
  Lock,
  MoreHorizontal,
  PencilLine,
  Plus,
  Search,
  Share2,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceDoc from "@/hooks/use-workspace-doc";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import useAuthStore from "@/stores/auth";
import { useFavoritesStore } from "@/stores";
import {
  getRecentVisits,
  subscribeRecentVisits,
} from "@/lib/helpers/recent-visits";
import { WorkspaceDocRecord } from "@/types/doc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import LoaderComponent from "@/components/shared/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import WorkspaceDocEditor from "@/components/docs/workspace-doc-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavActions } from "@/components/nav-actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";

interface WorkspaceDocsProps {
  activeDocId?: string;
}

type ConfirmActionType = "archive" | "unarchive" | "delete";
type DocsViewScope = "all" | "assigned" | "favorites" | "recent" | "archived";
type DocsSortMode =
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "title-asc"
  | "title-desc";
type DocsLayoutMode = "list" | "grid";

type ConfirmActionState = {
  open: boolean;
  type: ConfirmActionType;
  doc: WorkspaceDocRecord | null;
};

const DEFAULT_DOC_CONTENT = [
  {
    type: "paragraph",
    content: "",
  },
];
const DOC_AUTOSAVE_DELAY_MS = 5000;

const DOC_SCOPE_META: Record<
  DocsViewScope,
  {
    label: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  all: {
    label: "All docs",
    hint: "Every active workspace document",
    icon: BookText,
  },
  assigned: {
    label: "Assigned to me",
    hint: "Documents where you are an assignee",
    icon: Users,
  },
  favorites: {
    label: "Favorites",
    hint: "Pinned docs for quick access",
    icon: Star,
  },
  recent: {
    label: "Recent",
    hint: "Recently opened documents",
    icon: Clock3,
  },
  archived: {
    label: "Archived",
    hint: "Soft-hidden docs you can restore",
    icon: Archive,
  },
};

const SORT_META: Record<DocsSortMode, string> = {
  "updated-desc": "Last edited (newest)",
  "updated-asc": "Last edited (oldest)",
  "created-desc": "Created (newest)",
  "title-asc": "Title (A → Z)",
  "title-desc": "Title (Z → A)",
};

const formatRelativeDateLabel = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const now = Date.now();
  const delta = now - parsed.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) {
    return "Just now";
  }

  if (delta < hour) {
    return `${Math.max(1, Math.floor(delta / minute))}m ago`;
  }

  if (delta < day) {
    return `${Math.max(1, Math.floor(delta / hour))}h ago`;
  }

  if (delta < 7 * day) {
    return `${Math.max(1, Math.floor(delta / day))}d ago`;
  }

  return parsed.toLocaleDateString();
};

const getInitials = (name: string) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "WS";

const getDocFavoriteKey = (workspaceId: string, docId: string) =>
  `doc:${workspaceId}:${docId}`;

const getRecentDocIdFromVisitKey = (key: string) => {
  const normalized = String(key || "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("doc:")) {
    return normalized.slice(4);
  }

  return normalized.split(":").slice(1).join(":");
};

const WorkspaceDocs = ({ activeDocId }: WorkspaceDocsProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();

  const workspaceDocHook = useWorkspaceDoc();
  const workspaceHook = useWorkspace();
  const workspaceTeamHook = useWorkspaceTeam();
  const workspaceProjectHook = useWorkspaceProject();

  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const [searchValue, setSearchValue] = useState("");
  const [scope, setScope] = useState<DocsViewScope>("all");
  const [sortMode, setSortMode] = useState<DocsSortMode>("updated-desc");
  const [layoutMode, setLayoutMode] = useState<DocsLayoutMode>("list");
  const debouncedSearch = useDebounce(searchValue, 280);

  const [title, setTitle] = useState("");
  const [accessScope, setAccessScope] = useState<"workspace" | "assigned">(
    "workspace",
  );
  const [workspacePermission, setWorkspacePermission] = useState<
    "view" | "edit"
  >("view");
  const [assignedPermission, setAssignedPermission] = useState<"view" | "edit">(
    "view",
  );
  const [linkSharingEnabled, setLinkSharingEnabled] = useState(false);
  const [linkSharingScope, setLinkSharingScope] = useState<
    "workspace" | "public"
  >("workspace");
  const [linkSharingPermission, setLinkSharingPermission] = useState<
    "view" | "edit"
  >("view");
  const [shareTarget, setShareTarget] = useState<
    "people" | "teams" | "projects"
  >("people");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [teamsSearch, setTeamsSearch] = useState("");
  const [projectsSearch, setProjectsSearch] = useState("");
  const debouncedPeopleSearch = useDebounce(peopleSearch, 260);
  const debouncedTeamsSearch = useDebounce(teamsSearch, 260);
  const debouncedProjectsSearch = useDebounce(projectsSearch, 260);
  const [peoplePage, setPeoplePage] = useState(1);
  const [teamsPage, setTeamsPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMetaUpdatesRef = useRef<
    Partial<{
      title: string;
      workspacePermission: "view" | "edit";
      assignedPermission: "view" | "edit";
      assignedUserIds: string[];
      assignedTeamIds: string[];
      assignedProjectIds: string[];
      linkSharingEnabled: boolean;
      linkSharingScope: "workspace" | "public";
      linkSharingPermission: "view" | "edit";
    }>
  >({});
  const pendingContentRef = useRef<unknown[] | null>(null);
  const pendingSaveContextRef = useRef<{
    workspaceId: string;
    docId: string;
  } | null>(null);
  const flushPendingSavesRef = useRef<() => Promise<void>>(async () => {});
  const [recentDocIds, setRecentDocIds] = useState<string[]>([]);

  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>({
    open: false,
    type: "archive",
    doc: null,
  });

  const selectedDocId = useMemo(
    () => String(activeDocId || "").trim(),
    [activeDocId],
  );
  const isDetailRoute = Boolean(selectedDocId);
  const currentUserId = useMemo(() => String(user?._id || "").trim(), [user]);

  const activeDocsQuery = workspaceDocHook.useWorkspaceDocs(
    workspaceId || "",
    {
      page: 1,
      limit: 200,
      search: "",
      archived: false,
    },
    { enabled: Boolean(workspaceId) },
  );

  const archivedDocsCountQuery = workspaceDocHook.useWorkspaceDocs(
    workspaceId || "",
    {
      page: 1,
      limit: 1,
      search: "",
      archived: true,
    },
    { enabled: Boolean(workspaceId) },
  );

  const docsQuery = workspaceDocHook.useWorkspaceDocs(
    workspaceId || "",
    {
      page: 1,
      limit: 200,
      search: debouncedSearch,
      archived: scope === "archived",
    },
    { enabled: Boolean(workspaceId) },
  );

  const queriedDocs = useMemo(
    () => docsQuery.data?.data?.docs ?? [],
    [docsQuery.data?.data?.docs],
  );
  const allActiveDocs = useMemo(
    () => activeDocsQuery.data?.data?.docs ?? [],
    [activeDocsQuery.data?.data?.docs],
  );

  const docDetailQuery = workspaceDocHook.useWorkspaceDocDetail(
    workspaceId || "",
    selectedDocId,
    { enabled: Boolean(workspaceId && selectedDocId) },
  );

  const createDocMutation = workspaceDocHook.useCreateWorkspaceDoc();
  const updateDocMutation = workspaceDocHook.useUpdateWorkspaceDoc();
  const archiveDocMutation = workspaceDocHook.useArchiveWorkspaceDoc();
  const unarchiveDocMutation = workspaceDocHook.useUnarchiveWorkspaceDoc();
  const deleteDocMutation = workspaceDocHook.useDeleteWorkspaceDoc();

  const peopleSearchReady = debouncedPeopleSearch.trim().length > 0;
  const teamsSearchReady = debouncedTeamsSearch.trim().length > 0;
  const projectsSearchReady = debouncedProjectsSearch.trim().length > 0;

  const peopleQuery = workspaceHook.useWorkspacePeople(
    shareDialogOpen &&
      shareTarget === "people" &&
      peopleSearchReady &&
      Boolean(workspaceId)
      ? workspaceId || ""
      : "",
    {
      page: peoplePage,
      limit: 25,
      search: debouncedPeopleSearch,
    },
  );
  const teamsQuery = workspaceTeamHook.useWorkspaceTeams(
    shareDialogOpen &&
      shareTarget === "teams" &&
      teamsSearchReady &&
      Boolean(workspaceId)
      ? workspaceId || ""
      : "",
    {
      page: teamsPage,
      limit: 25,
      search: debouncedTeamsSearch,
      status: "active",
    },
  );
  const projectsQuery = workspaceProjectHook.useWorkspaceProjects(
    shareDialogOpen &&
      shareTarget === "projects" &&
      projectsSearchReady &&
      Boolean(workspaceId)
      ? workspaceId || ""
      : "",
    {
      page: projectsPage,
      limit: 25,
      search: debouncedProjectsSearch,
      archived: false,
    },
  );

  const members = useMemo(
    () => peopleQuery.data?.data?.members ?? [],
    [peopleQuery.data?.data?.members],
  );
  const teams = useMemo(
    () => teamsQuery.data?.data?.teams ?? [],
    [teamsQuery.data?.data?.teams],
  );
  const projects = useMemo(
    () => projectsQuery.data?.data?.projects ?? [],
    [projectsQuery.data?.data?.projects],
  );
  const peoplePagination = peopleQuery.data?.data?.pagination;
  const teamsPagination = teamsQuery.data?.data?.pagination;
  const projectsPagination = projectsQuery.data?.data?.pagination;

  const selectedDoc = docDetailQuery.data?.data?.doc || null;

  useEffect(() => {
    if (!selectedDoc) {
      return;
    }

    setTitle(selectedDoc.title || "");
    setAccessScope(selectedDoc.accessScope || "workspace");
    setWorkspacePermission(selectedDoc.workspacePermission || "view");
    setAssignedPermission(selectedDoc.assignedPermission || "view");
    setLinkSharingEnabled(Boolean(selectedDoc.linkSharing?.enabled));
    setLinkSharingScope(selectedDoc.linkSharing?.scope || "workspace");
    setLinkSharingPermission(selectedDoc.linkSharing?.permission || "view");
    setAssignedUserIds(selectedDoc.assignedUserIds || []);
    setAssignedTeamIds(selectedDoc.assignedTeamIds || []);
    setAssignedProjectIds(selectedDoc.assignedProjectIds || []);
    setSaveState("idle");
  }, [selectedDoc?.id]);

  useEffect(() => {
    if (!selectedDoc?.id) {
      return;
    }

    if (selectedDoc.archived) {
      setScope("archived");
      return;
    }

    if (scope === "archived") {
      setScope("all");
    }
  }, [selectedDoc?.archived, selectedDoc?.id, scope]);

  useEffect(() => {
    setPeoplePage(1);
  }, [debouncedPeopleSearch, shareDialogOpen]);

  useEffect(() => {
    setTeamsPage(1);
  }, [debouncedTeamsSearch, shareDialogOpen]);

  useEffect(() => {
    setProjectsPage(1);
  }, [debouncedProjectsSearch, shareDialogOpen]);

  useEffect(() => {
    if (!shareDialogOpen) {
      return;
    }

    setShareTarget("people");
    setPeopleSearch("");
    setTeamsSearch("");
    setProjectsSearch("");
    setPeoplePage(1);
    setTeamsPage(1);
    setProjectsPage(1);
  }, [shareDialogOpen]);

  useEffect(() => {
    if (shareTarget === "people") {
      setPeoplePage(1);
      return;
    }

    if (shareTarget === "teams") {
      setTeamsPage(1);
      return;
    }

    setProjectsPage(1);
  }, [shareTarget]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (metaSaveTimerRef.current) {
        clearTimeout(metaSaveTimerRef.current);
      }
      if (saveStateTimerRef.current) {
        clearTimeout(saveStateTimerRef.current);
      }
      void flushPendingSavesRef.current();
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      setRecentDocIds([]);
      return;
    }

    const sync = () => {
      const ids = getRecentVisits(workspaceId, 120)
        .filter((entry) => entry.kind === "doc")
        .map((entry) => getRecentDocIdFromVisitKey(entry.key))
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      setRecentDocIds(ids);
    };

    sync();
    return subscribeRecentVisits(sync);
  }, [workspaceId]);

  const getToggledSelection = (current: string[], value: string) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return current;
    }

    if (current.includes(normalized)) {
      return current.filter((item) => item !== normalized);
    }

    return [...current, normalized];
  };

  const updateDocQueryCache = useCallback(
    (doc: WorkspaceDocRecord, scopedWorkspaceId: string = workspaceId || "") => {
      if (!scopedWorkspaceId) {
        return;
      }

      queryClient.setQueryData(
        ["workspace-doc-detail", scopedWorkspaceId, doc.id],
        (previous: any) => ({
          ...(previous || {}),
          data: {
            ...(previous?.data || {}),
            doc,
          },
        }),
      );
    },
    [queryClient, workspaceId],
  );

  const setSavedState = useCallback(() => {
    setSaveState("saved");
    if (saveStateTimerRef.current) {
      clearTimeout(saveStateTimerRef.current);
    }
    saveStateTimerRef.current = setTimeout(() => {
      setSaveState((current) => (current === "saved" ? "idle" : current));
    }, 900);
  }, []);

  const flushPendingSaves = useCallback(async () => {
    const context = pendingSaveContextRef.current;
    const hasMetaUpdates = Object.keys(pendingMetaUpdatesRef.current).length > 0;
    const hasContentUpdate = pendingContentRef.current !== null;

    if (!context || (!hasMetaUpdates && !hasContentUpdate)) {
      return;
    }

    const queuedMetaUpdates = { ...pendingMetaUpdatesRef.current };
    const queuedContent = pendingContentRef.current;

    pendingMetaUpdatesRef.current = {};
    pendingContentRef.current = null;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (metaSaveTimerRef.current) {
      clearTimeout(metaSaveTimerRef.current);
      metaSaveTimerRef.current = null;
    }

    setSaveState("saving");

    try {
      const updates: Record<string, unknown> = { ...queuedMetaUpdates };
      if (queuedContent !== null) {
        updates.content = queuedContent;
      }

      const response = await updateDocMutation.mutateAsync({
        workspaceId: context.workspaceId,
        docId: context.docId,
        updates,
      });

      const nextDoc = response?.data?.doc;
      if (nextDoc) {
        updateDocQueryCache(nextDoc, context.workspaceId);
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-docs", context.workspaceId],
      });

      setSavedState();

      const stillHasMeta =
        Object.keys(pendingMetaUpdatesRef.current).length > 0;
      const stillHasContent = pendingContentRef.current !== null;
      if (!stillHasMeta && !stillHasContent) {
        pendingSaveContextRef.current = null;
      }
    } catch {
      pendingMetaUpdatesRef.current = {
        ...queuedMetaUpdates,
        ...pendingMetaUpdatesRef.current,
      };
      if (queuedContent !== null && pendingContentRef.current === null) {
        pendingContentRef.current = queuedContent;
      }
      setSaveState("error");
    }
  }, [queryClient, setSavedState, updateDocMutation, updateDocQueryCache]);

  useEffect(() => {
    flushPendingSavesRef.current = flushPendingSaves;
  }, [flushPendingSaves]);

  const handleCreateDoc = async () => {
    if (!workspaceId) {
      return;
    }

    const request = createDocMutation.mutateAsync({
      workspaceId,
      payload: {
        title: "Untitled doc",
        accessScope: "workspace",
        content: DEFAULT_DOC_CONTENT,
      },
    });

    await toast.promise(request, {
      loading: "Creating document...",
      success: (response) => {
        const docId = response?.data?.doc?.id;
        queryClient.invalidateQueries({
          queryKey: ["workspace-docs", workspaceId],
        });
        if (docId) {
          router.push(`/docs/${docId}`);
        }
        return "Document created";
      },
      error: "Could not create document.",
    });
  };

  const handleDuplicateDoc = async (doc: WorkspaceDocRecord) => {
    if (!workspaceId) {
      return;
    }

    const request = createDocMutation.mutateAsync({
      workspaceId,
      payload: {
        title: `${doc.title} (Copy)`,
        summary: doc.summary || "",
        content: Array.isArray(doc.content) ? doc.content : DEFAULT_DOC_CONTENT,
        accessScope: doc.accessScope,
        workspacePermission: doc.workspacePermission,
        assignedPermission: doc.assignedPermission,
        assignedUserIds: doc.assignedUserIds || [],
        assignedTeamIds: doc.assignedTeamIds || [],
        assignedProjectIds: doc.assignedProjectIds || [],
        linkSharingEnabled: Boolean(doc.linkSharing?.enabled),
        linkSharingScope: doc.linkSharing?.scope || "workspace",
        linkSharingPermission: doc.linkSharing?.permission || "view",
      },
    });

    await toast.promise(request, {
      loading: "Duplicating document...",
      success: (response) => {
        const docId = response?.data?.doc?.id;
        queryClient.invalidateQueries({
          queryKey: ["workspace-docs", workspaceId],
        });
        if (docId) {
          router.push(`/docs/${docId}`);
        }
        return "Document duplicated";
      },
      error: "Could not duplicate document.",
    });
  };

  const scheduleMetaSave = (
    updates: Partial<{
      title: string;
      workspacePermission: "view" | "edit";
      assignedPermission: "view" | "edit";
      assignedUserIds: string[];
      assignedTeamIds: string[];
      assignedProjectIds: string[];
      linkSharingEnabled: boolean;
      linkSharingScope: "workspace" | "public";
      linkSharingPermission: "view" | "edit";
    }>,
    delay = DOC_AUTOSAVE_DELAY_MS,
  ) => {
    if (!workspaceId || !selectedDoc?.id || !selectedDoc.canEdit) {
      return;
    }

    pendingSaveContextRef.current = {
      workspaceId,
      docId: selectedDoc.id,
    };

    pendingMetaUpdatesRef.current = {
      ...pendingMetaUpdatesRef.current,
      ...updates,
    };

    if (metaSaveTimerRef.current) {
      clearTimeout(metaSaveTimerRef.current);
    }

    setSaveState("saving");

    metaSaveTimerRef.current = setTimeout(() => {
      void flushPendingSaves();
    }, delay);
  };

  const handleTitleChange = (nextValue: string) => {
    setTitle(nextValue);
    if (!selectedDoc?.canEdit) {
      return;
    }

    const trimmed = nextValue.trim();
    if (!trimmed) {
      return;
    }

    scheduleMetaSave({ title: trimmed }, DOC_AUTOSAVE_DELAY_MS);
  };

  const handleTitleBlur = () => {
    if (!selectedDoc) {
      return;
    }

    if (!title.trim()) {
      setTitle(selectedDoc.title || "Untitled doc");
    }
  };

  const getShareLink = () => {
    const token = String(selectedDoc?.linkSharing?.token || "").trim();
    if (!token || typeof window === "undefined") {
      return "";
    }

    const origin = String(window.location.origin || "").trim();
    if (!origin) {
      return "";
    }

    if (linkSharingScope === "public") {
      return `${origin}/docs/shared/${token}`;
    }

    return `${origin}/docs/${selectedDoc?.id || ""}`;
  };

  const handleCopyShareLink = async () => {
    const shareLink = getShareLink();
    if (!shareLink) {
      toast.error("Share link is not ready yet. Save share settings first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy share link");
    }
  };

  const handleSaveShareSettings = async () => {
    if (!workspaceId || !selectedDoc?.id || !selectedDoc.canEdit) {
      return;
    }

    if (
      accessScope === "assigned" &&
      !assignedUserIds.length &&
      !assignedTeamIds.length &&
      !assignedProjectIds.length
    ) {
      toast.error(
        "Assigned docs must target at least one person, team, or project.",
      );
      return;
    }

    const request = updateDocMutation.mutateAsync({
      workspaceId,
      docId: selectedDoc.id,
      updates: {
        accessScope,
        workspacePermission,
        assignedPermission,
        assignedUserIds,
        assignedTeamIds,
        assignedProjectIds,
        linkSharingEnabled,
        linkSharingScope,
        linkSharingPermission,
      },
    });

    await toast.promise(request, {
      loading: "Saving share settings...",
      success: (response) => {
        const nextDoc = response?.data?.doc;
        if (nextDoc) {
          updateDocQueryCache(nextDoc);
          setAccessScope(nextDoc.accessScope || "workspace");
          setWorkspacePermission(nextDoc.workspacePermission || "view");
          setAssignedPermission(nextDoc.assignedPermission || "view");
          setLinkSharingEnabled(Boolean(nextDoc.linkSharing?.enabled));
          setLinkSharingScope(nextDoc.linkSharing?.scope || "workspace");
          setLinkSharingPermission(nextDoc.linkSharing?.permission || "view");
          setAssignedUserIds(nextDoc.assignedUserIds || []);
          setAssignedTeamIds(nextDoc.assignedTeamIds || []);
          setAssignedProjectIds(nextDoc.assignedProjectIds || []);
        }
        queryClient.invalidateQueries({
          queryKey: ["workspace-docs", workspaceId],
        });
        setShareDialogOpen(false);
        return "Share settings updated";
      },
      error: "Could not save share settings.",
    });
  };

  const scheduleContentSave = (nextContent: unknown[]) => {
    if (!workspaceId || !selectedDoc?.id || !selectedDoc.canEdit) {
      return;
    }

    pendingSaveContextRef.current = {
      workspaceId,
      docId: selectedDoc.id,
    };
    pendingContentRef.current = nextContent;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveState("saving");

    saveTimerRef.current = setTimeout(() => {
      void flushPendingSaves();
    }, DOC_AUTOSAVE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      void flushPendingSavesRef.current();
    };
  }, [selectedDoc?.id]);

  useEffect(() => {
    const handlePageHide = () => {
      void flushPendingSavesRef.current();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushPendingSavesRef.current();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const openConfirm = (type: ConfirmActionType, doc: WorkspaceDocRecord) => {
    setConfirmAction({
      open: true,
      type,
      doc,
    });
  };

  const handleConfirmAction = async () => {
    if (!workspaceId || !confirmAction.doc?.id) {
      return;
    }

    const doc = confirmAction.doc;

    if (confirmAction.type === "archive") {
      const request = archiveDocMutation.mutateAsync({
        workspaceId,
        docId: doc.id,
      });

      await toast.promise(request, {
        loading: "Archiving document...",
        success: () => {
          queryClient.invalidateQueries({
            queryKey: ["workspace-docs", workspaceId],
          });
          if (pathname === `/docs/${doc.id}`) {
            router.push("/docs");
          }
          return "Document archived";
        },
        error: "Could not archive document.",
      });
    }

    if (confirmAction.type === "unarchive") {
      const request = unarchiveDocMutation.mutateAsync({
        workspaceId,
        docId: doc.id,
      });

      await toast.promise(request, {
        loading: "Restoring document...",
        success: () => {
          queryClient.invalidateQueries({
            queryKey: ["workspace-docs", workspaceId],
          });
          return "Document restored";
        },
        error: "Could not restore document.",
      });
    }

    if (confirmAction.type === "delete") {
      const request = deleteDocMutation.mutateAsync({
        workspaceId,
        docId: doc.id,
      });

      await toast.promise(request, {
        loading: "Deleting document...",
        success: () => {
          queryClient.invalidateQueries({
            queryKey: ["workspace-docs", workspaceId],
          });
          if (pathname === `/docs/${doc.id}`) {
            router.push("/docs");
          }
          return "Document deleted";
        },
        error: "Could not delete document.",
      });
    }

    setConfirmAction({ open: false, type: "archive", doc: null });
  };

  const confirmTitleMap: Record<ConfirmActionType, string> = {
    archive: "Archive document?",
    unarchive: "Restore document?",
    delete: "Delete document?",
  };

  const confirmDescriptionMap: Record<ConfirmActionType, string> = {
    archive:
      "The doc will be hidden from the active list and can be restored later.",
    unarchive: "The doc will return to your active workspace docs list.",
    delete: "This permanently removes the document and its content.",
  };

  const isBusy =
    createDocMutation.isPending ||
    updateDocMutation.isPending ||
    archiveDocMutation.isPending ||
    unarchiveDocMutation.isPending ||
    deleteDocMutation.isPending;

  const favoriteKeySet = useMemo(
    () => new Set(favorites.map((favorite) => favorite.key)),
    [favorites],
  );

  const isDocFavorite = (doc: WorkspaceDocRecord) => {
    const normalizedWorkspaceId = String(workspaceId || "").trim();
    if (!normalizedWorkspaceId) {
      return false;
    }

    return favoriteKeySet.has(getDocFavoriteKey(normalizedWorkspaceId, doc.id));
  };

  const toggleDocFavorite = (doc: WorkspaceDocRecord) => {
    const normalizedWorkspaceId = String(workspaceId || "").trim();
    if (!normalizedWorkspaceId) {
      return;
    }

    toggleFavorite({
      key: getDocFavoriteKey(normalizedWorkspaceId, doc.id),
      type: "doc",
      label: doc.title || "Untitled doc",
      subtitle: doc.assignedProjects[0]?.name || "Workspace doc",
      href: `/docs/${doc.id}`,
    });
  };

  const docsForScope = useMemo(() => {
    let list = [...queriedDocs];
    const recentRank = new Map(
      recentDocIds.map((docId, index) => [String(docId), index]),
    );
    const recentDocIdSet = new Set(recentDocIds.map((value) => String(value)));

    if (scope === "assigned") {
      list = list.filter((doc) => doc.assignedUserIds.includes(currentUserId));
    } else if (scope === "favorites") {
      list = list.filter((doc) => isDocFavorite(doc));
    } else if (scope === "recent") {
      list = list.filter((doc) => recentDocIdSet.has(String(doc.id)));
      list.sort((left, right) => {
        const leftRank = recentRank.get(String(left.id));
        const rightRank = recentRank.get(String(right.id));
        return (
          (leftRank ?? Number.MAX_SAFE_INTEGER) -
          (rightRank ?? Number.MAX_SAFE_INTEGER)
        );
      });
      return list;
    }

    const getSortableTimestamp = (value?: string | null) => {
      const parsed = value ? new Date(value).getTime() : NaN;
      return Number.isFinite(parsed) ? parsed : 0;
    };

    list.sort((left, right) => {
      if (sortMode === "updated-desc") {
        return (
          getSortableTimestamp(right.lastEditedAt || right.updatedAt) -
          getSortableTimestamp(left.lastEditedAt || left.updatedAt)
        );
      }

      if (sortMode === "updated-asc") {
        return (
          getSortableTimestamp(left.lastEditedAt || left.updatedAt) -
          getSortableTimestamp(right.lastEditedAt || right.updatedAt)
        );
      }

      if (sortMode === "created-desc") {
        return (
          getSortableTimestamp(right.createdAt) -
          getSortableTimestamp(left.createdAt)
        );
      }

      if (sortMode === "title-desc") {
        return String(right.title || "").localeCompare(
          String(left.title || ""),
        );
      }

      return String(left.title || "").localeCompare(String(right.title || ""));
    });

    return list;
  }, [
    currentUserId,
    queriedDocs,
    recentDocIds,
    scope,
    sortMode,
    favoriteKeySet,
    workspaceId,
  ]);

  const assignedCount = useMemo(
    () =>
      allActiveDocs.filter((doc) => doc.assignedUserIds.includes(currentUserId))
        .length,
    [allActiveDocs, currentUserId],
  );

  const favoriteCount = useMemo(
    () => allActiveDocs.filter((doc) => isDocFavorite(doc)).length,
    [allActiveDocs, favoriteKeySet, workspaceId],
  );

  const recentCount = useMemo(() => {
    const idSet = new Set(recentDocIds.map((value) => String(value)));
    return allActiveDocs.filter((doc) => idSet.has(String(doc.id))).length;
  }, [allActiveDocs, recentDocIds]);

  const archivedCount = useMemo(
    () => archivedDocsCountQuery.data?.data?.pagination?.total ?? 0,
    [archivedDocsCountQuery.data?.data?.pagination?.total],
  );

  const scopeCounts = useMemo(
    () => ({
      all: allActiveDocs.length,
      assigned: assignedCount,
      favorites: favoriteCount,
      recent: recentCount,
      archived: archivedCount,
    }),
    [
      allActiveDocs.length,
      archivedCount,
      assignedCount,
      favoriteCount,
      recentCount,
    ],
  );

  const activeShareSearchValue = useMemo(() => {
    if (shareTarget === "people") {
      return peopleSearch;
    }

    if (shareTarget === "teams") {
      return teamsSearch;
    }

    return projectsSearch;
  }, [peopleSearch, projectsSearch, shareTarget, teamsSearch]);

  const activeShareSearchReady = useMemo(() => {
    if (shareTarget === "people") {
      return peopleSearchReady;
    }

    if (shareTarget === "teams") {
      return teamsSearchReady;
    }

    return projectsSearchReady;
  }, [peopleSearchReady, projectsSearchReady, shareTarget, teamsSearchReady]);

  const activeShareItems = useMemo(() => {
    if (shareTarget === "people") {
      return members;
    }

    if (shareTarget === "teams") {
      return teams;
    }

    return projects;
  }, [members, projects, shareTarget, teams]);

  const activeSharePagination = useMemo(() => {
    if (shareTarget === "people") {
      return peoplePagination;
    }

    if (shareTarget === "teams") {
      return teamsPagination;
    }

    return projectsPagination;
  }, [peoplePagination, projectsPagination, shareTarget, teamsPagination]);

  const activeShareLoading = useMemo(() => {
    if (shareTarget === "people") {
      return peopleQuery.isLoading || peopleQuery.isFetching;
    }

    if (shareTarget === "teams") {
      return teamsQuery.isLoading || teamsQuery.isFetching;
    }

    return projectsQuery.isLoading || projectsQuery.isFetching;
  }, [
    peopleQuery.isFetching,
    peopleQuery.isLoading,
    projectsQuery.isFetching,
    projectsQuery.isLoading,
    shareTarget,
    teamsQuery.isFetching,
    teamsQuery.isLoading,
  ]);

  const activeSharePage = activeSharePagination?.page || 1;
  const activeShareTotalPages = Math.max(
    1,
    activeSharePagination?.totalPages || 1,
  );

  const openDoc = (docId: string) => {
    router.push(`/docs/${docId}`);
  };

  const renderDocAssignments = (doc: WorkspaceDocRecord) => {
    if (!doc.assignedUsers.length) {
      return (
        <span className="text-muted-foreground text-[10.5px]">
          No assignees
        </span>
      );
    }

    return (
      <div className="inline-flex items-center">
        {doc.assignedUsers.slice(0, 3).map((assignee, index) => (
          <Avatar
            key={assignee.id}
            className={cn(
              "size-5 border border-background",
              index > 0 && "-ml-1",
            )}
          >
            <AvatarImage src={assignee.avatarUrl || ""} />
            <AvatarFallback className="text-[9px]">
              {getInitials(assignee.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {doc.assignedUsers.length > 3 ? (
          <span className="text-muted-foreground ml-1 text-[10px]">
            +{doc.assignedUsers.length - 3}
          </span>
        ) : null}
      </div>
    );
  };

  const renderDocRow = (doc: WorkspaceDocRecord, compact = false) => {
    const isActive = selectedDocId === doc.id;

    return (
      <div
        key={doc.id}
        className={cn(
          "group ring-border/35 bg-card/60 hover:bg-muted/50 flex items-start gap-2 rounded-md ring-1 transition-colors",
          compact ? "p-1.5" : "p-2.5",
          isActive && "bg-muted/60",
        )}
      >
        <button
          type="button"
          onClick={() => openDoc(doc.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
              <FileText className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium">
                {doc.title || "Untitled doc"}
              </p>
            </div>
          </div>

          {!compact ? (
            <div className="text-muted-foreground grid gap-1 text-[10.5px] sm:grid-cols-2 xl:grid-cols-4">
              <div className="truncate">
                Edited{" "}
                {formatRelativeDateLabel(doc.lastEditedAt || doc.updatedAt)}
              </div>
              <div className="truncate">
                By {doc.updatedBy?.name || doc.createdBy?.name || "Unknown"}
              </div>
              <div className="truncate">
                {doc.assignedProjects[0]?.name || "No linked project"}
              </div>
              <div>{renderDocAssignments(doc)}</div>
            </div>
          ) : (
            <div className="text-muted-foreground truncate text-[10px]">
              {formatRelativeDateLabel(doc.lastEditedAt || doc.updatedAt)}
            </div>
          )}
        </button>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => toggleDocFavorite(doc)}
            aria-label={isDocFavorite(doc) ? "Remove favorite" : "Add favorite"}
          >
            <Star
              className={cn(
                "size-3.5",
                isDocFavorite(doc) && "fill-current text-amber-500",
              )}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => openDoc(doc.id)}>
                <FileText className="size-3.5" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleDuplicateDoc(doc)}>
                <BookMarked className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              {doc.canEdit ? (
                <>
                  <DropdownMenuSeparator />
                  {!doc.archived ? (
                    <DropdownMenuItem
                      onClick={() => openConfirm("archive", doc)}
                    >
                      <Archive className="size-3.5" />
                      Archive
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => openConfirm("unarchive", doc)}
                    >
                      <ArchiveRestore className="size-3.5" />
                      Restore
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => openConfirm("delete", doc)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const mainLoading = docsQuery.isLoading || activeDocsQuery.isLoading;

  return (
    <>
      <div
        className={cn(
          "grid h-full min-h-0 gap-3",
          isDetailRoute ? "grid-cols-1" : "lg:grid-cols-[17rem_minmax(0,1fr)]",
        )}
      >
        {!isDetailRoute ? (
          <aside className="bg-card/35 ring-border/35 flex min-h-[calc(100svh-8.6rem)] flex-col rounded-md p-2 ring-1">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-[13px] font-semibold">Workspace docs</h2>
                <p className="text-muted-foreground text-[11px]">
                  Shared documentation hub
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                onClick={() => void handleCreateDoc()}
                disabled={!workspaceId || createDocMutation.isPending}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <div className="mb-2 px-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search docs"
                  className="h-8 pl-7 text-[12px]"
                />
              </div>
            </div>

            <div className="mb-2 space-y-1 px-1">
              {(Object.keys(DOC_SCOPE_META) as DocsViewScope[]).map(
                (scopeKey) => {
                  const meta = DOC_SCOPE_META[scopeKey];
                  const ScopeIcon = meta.icon;
                  const isActive = scope === scopeKey;

                  return (
                    <button
                      key={scopeKey}
                      type="button"
                      className={cn(
                        "hover:bg-muted/55 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground",
                      )}
                      onClick={() => setScope(scopeKey)}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <ScopeIcon className="size-3.5" />
                        <span className="truncate text-[12px]">
                          {meta.label}
                        </span>
                      </span>
                      <span className="text-[10.5px]">
                        {scopeCounts[scopeKey]}
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            <Separator className="bg-border/45 my-1" />

            <div className="mb-1 px-1">
              <p className="text-muted-foreground text-[10.5px] uppercase tracking-wide">
                In this view
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
              {mainLoading ? (
                <LoaderComponent />
              ) : docsForScope.length ? (
                docsForScope.slice(0, 32).map((doc) => renderDocRow(doc, true))
              ) : (
                <Empty className="border-border/35 bg-card/45 gap-2 rounded-md border p-3 md:p-3">
                  <EmptyHeader className="gap-1.5">
                    <EmptyMedia variant="icon" className="size-7">
                      <FileText className="size-3.5 text-primary/85" />
                    </EmptyMedia>
                    <EmptyTitle className="text-[12px]">
                      No docs in this view
                    </EmptyTitle>
                    <EmptyDescription className="text-[11px]">
                      Adjust filters or create a new document.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </aside>
        ) : null}

        <section
          className={cn(
            "bg-card/35 ring-border/35 min-h-[calc(100svh-8.6rem)] rounded-md ring-1",
            isDetailRoute &&
              "h-full min-h-0 overflow-x-hidden bg-transparent ring-0",
          )}
        >
          {!isDetailRoute ? (
            <div className="flex h-full min-h-0 flex-col p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-[14px] font-semibold">
                    {DOC_SCOPE_META[scope].label}
                  </h1>
                  <p className="text-muted-foreground text-[11.5px]">
                    {DOC_SCOPE_META[scope].hint}
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                  <Select
                    value={sortMode}
                    onValueChange={(value) =>
                      setSortMode(value as DocsSortMode)
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-[11.5px] sm:w-[14rem]">
                      <SelectValue placeholder="Sort docs" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SORT_META) as DocsSortMode[]).map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {SORT_META[value]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  <div className="bg-muted/45 inline-flex w-full rounded-md p-0.5 sm:w-auto">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-sm px-2 text-[11px] sm:flex-none",
                        layoutMode === "list"
                          ? "bg-background text-foreground"
                          : "text-muted-foreground",
                      )}
                      onClick={() => setLayoutMode("list")}
                    >
                      <List className="size-3.5" />
                      List
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-sm px-2 text-[11px] sm:flex-none",
                        layoutMode === "grid"
                          ? "bg-background text-foreground"
                          : "text-muted-foreground",
                      )}
                      onClick={() => setLayoutMode("grid")}
                    >
                      <Grid2X2 className="size-3.5" />
                      Grid
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {mainLoading ? (
                  <LoaderComponent />
                ) : docsForScope.length ? (
                  layoutMode === "grid" ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {docsForScope.map((doc) => renderDocRow(doc))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docsForScope.map((doc) => renderDocRow(doc))}
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Empty className="gap-3 p-3 md:p-3">
                      <EmptyHeader className="gap-1.5">
                        <EmptyMedia variant="icon" className="size-9">
                          <FileText className="size-4.5 text-primary/85" />
                        </EmptyMedia>
                        <EmptyTitle className="text-[13px]">
                          No documents found
                        </EmptyTitle>
                        <EmptyDescription className="text-[12px]">
                          Create a workspace document and assign it to users,
                          teams, or projects.
                        </EmptyDescription>
                      </EmptyHeader>
                      <Button
                        size="sm"
                        className="h-8 text-[12px]"
                        onClick={() => void handleCreateDoc()}
                      >
                        <Plus className="size-3.5" />
                        New document
                      </Button>
                    </Empty>
                  </div>
                )}
              </div>
            </div>
          ) : docDetailQuery.isLoading ? (
            <div className="flex h-full items-center justify-center p-4">
              <LoaderComponent />
            </div>
          ) : selectedDoc ? (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="bg-background/92 sticky top-0 z-30 shrink-0 border-b backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex min-h-14 items-center gap-2 px-3">
                  <SidebarTrigger />
                  <SidebarSeparator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/docs")}
                      className="text-foreground shrink-0 font-normal line-clamp-1 text-sm"
                    >
                      Docs
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/docs")}
                      className="text-muted-foreground text-[10.5px]"
                      aria-label="Go to docs"
                    >
                      /
                    </button>
                    <Input
                      value={title}
                      onChange={(event) =>
                        handleTitleChange(event.target.value)
                      }
                      onBlur={handleTitleBlur}
                      placeholder="Untitled doc"
                      className="h-7 min-w-0 max-w-full border-none bg-transparent px-0 text-[12px] font-medium shadow-none sm:max-w-[26rem] focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={!selectedDoc.canEdit || isBusy}
                    />
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => toggleDocFavorite(selectedDoc)}
                      >
                        <Star
                          className={cn(
                            "size-3.5",
                            isDocFavorite(selectedDoc) &&
                              "fill-current text-amber-500",
                          )}
                        />
                      </Button>
                      <Popover
                        open={shareDialogOpen}
                        onOpenChange={setShareDialogOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 px-2.5 text-[11.5px]"
                          >
                            <Share2 className="size-3.5" />
                            Share
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          sideOffset={8}
                          className="w-[min(95vw,27rem)] p-0"
                        >
                          <div className="border-border/55 border-b px-3 py-2.5">
                            <p className="text-[12.5px] font-medium">
                              Share document
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-[10.5px]">
                              Invite people, teams, or projects to this doc.
                            </p>
                          </div>

                          <div className="space-y-2 px-3 py-2.5">
                            <Tabs
                              value={shareTarget}
                              onValueChange={(value) =>
                                setShareTarget(
                                  value as "people" | "teams" | "projects",
                                )
                              }
                              className="w-full"
                            >
                              <TabsList className="bg-muted/45 h-8 w-full rounded-md p-0.5">
                                <TabsTrigger
                                  value="people"
                                  className="h-7 text-[11px]"
                                >
                                  People
                                </TabsTrigger>
                                <TabsTrigger
                                  value="teams"
                                  className="h-7 text-[11px]"
                                >
                                  Teams
                                </TabsTrigger>
                                <TabsTrigger
                                  value="projects"
                                  className="h-7 text-[11px]"
                                >
                                  Projects
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>

                            <div className="flex items-center gap-2">
                              <div className="relative min-w-0 flex-1">
                                <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
                                <Input
                                  value={activeShareSearchValue}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (shareTarget === "people") {
                                      setPeopleSearch(value);
                                      return;
                                    }
                                    if (shareTarget === "teams") {
                                      setTeamsSearch(value);
                                      return;
                                    }
                                    setProjectsSearch(value);
                                  }}
                                  placeholder={`Search ${shareTarget}`}
                                  className="h-8 pl-7 text-[11px]"
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-2.5 text-[11px]"
                                onClick={() => void handleSaveShareSettings()}
                                disabled={!selectedDoc?.canEdit || isBusy}
                              >
                                Invite
                              </Button>
                            </div>

                            {activeShareSearchReady ? (
                              <div className="ring-border/45 min-h-[10.5rem] rounded-md ring-1">
                                <div className="max-h-[11rem] overflow-y-auto p-1.5">
                                  {activeShareLoading ? (
                                    <div className="flex min-h-[8rem] items-center justify-center">
                                      <LoaderComponent />
                                    </div>
                                  ) : shareTarget === "people" ? (
                                    members.map((member) => {
                                      const workspaceUser = member.userId;
                                      const checked = assignedUserIds.includes(
                                        workspaceUser._id,
                                      );

                                      return (
                                        <label
                                          key={member._id}
                                          className="hover:bg-muted/45 flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px]"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => {
                                              const nextUserIds =
                                                getToggledSelection(
                                                  assignedUserIds,
                                                  workspaceUser._id,
                                                );
                                              setAssignedUserIds(nextUserIds);
                                              if (accessScope !== "assigned") {
                                                setAccessScope("assigned");
                                              }
                                            }}
                                            disabled={
                                              !selectedDoc?.canEdit || isBusy
                                            }
                                          />
                                          <Avatar className="size-5">
                                            <AvatarImage
                                              src={
                                                workspaceUser.profilePhoto
                                                  ?.url || ""
                                              }
                                            />
                                            <AvatarFallback className="text-[9px]">
                                              {getInitials(
                                                `${workspaceUser.firstName || ""} ${workspaceUser.lastName || ""}`,
                                              )}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="min-w-0 flex-1 truncate">
                                            {`${workspaceUser.firstName || ""} ${workspaceUser.lastName || ""}`.trim() ||
                                              workspaceUser.email}
                                          </span>
                                        </label>
                                      );
                                    })
                                  ) : shareTarget === "teams" ? (
                                    teams.map((team) => {
                                      const checked = assignedTeamIds.includes(
                                        team._id,
                                      );

                                      return (
                                        <label
                                          key={team._id}
                                          className="hover:bg-muted/45 flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px]"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => {
                                              const nextTeamIds =
                                                getToggledSelection(
                                                  assignedTeamIds,
                                                  team._id,
                                                );
                                              setAssignedTeamIds(nextTeamIds);
                                              if (accessScope !== "assigned") {
                                                setAccessScope("assigned");
                                              }
                                            }}
                                            disabled={
                                              !selectedDoc?.canEdit || isBusy
                                            }
                                          />
                                          <span className="min-w-0 flex-1 truncate">
                                            {team.name}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="h-5 px-1.5 text-[9.5px]"
                                          >
                                            {team.key}
                                          </Badge>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    projects.map((project) => {
                                      const checked =
                                        assignedProjectIds.includes(
                                          project.projectId,
                                        );

                                      return (
                                        <label
                                          key={project.projectId}
                                          className="hover:bg-muted/45 flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px]"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => {
                                              const nextProjectIds =
                                                getToggledSelection(
                                                  assignedProjectIds,
                                                  project.projectId,
                                                );
                                              setAssignedProjectIds(
                                                nextProjectIds,
                                              );
                                              if (accessScope !== "assigned") {
                                                setAccessScope("assigned");
                                              }
                                            }}
                                            disabled={
                                              !selectedDoc?.canEdit || isBusy
                                            }
                                          />
                                          <span className="min-w-0 flex-1 truncate">
                                            {project.name}
                                          </span>
                                        </label>
                                      );
                                    })
                                  )}

                                  {!activeShareLoading &&
                                  !activeShareItems.length ? (
                                    <div className="text-muted-foreground px-2 py-3 text-[11px]">
                                      No {shareTarget} found.
                                    </div>
                                  ) : null}
                                </div>
                                <div className="border-border/45 flex items-center justify-between border-t px-2 py-1.5">
                                  <span className="text-muted-foreground text-[10px]">
                                    Page {activeSharePage} of{" "}
                                    {activeShareTotalPages}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10.5px]"
                                      disabled={
                                        activeShareLoading ||
                                        activeSharePage <= 1
                                      }
                                      onClick={() => {
                                        if (shareTarget === "people") {
                                          setPeoplePage((current) =>
                                            Math.max(1, current - 1),
                                          );
                                          return;
                                        }
                                        if (shareTarget === "teams") {
                                          setTeamsPage((current) =>
                                            Math.max(1, current - 1),
                                          );
                                          return;
                                        }
                                        setProjectsPage((current) =>
                                          Math.max(1, current - 1),
                                        );
                                      }}
                                    >
                                      <ChevronLeft className="size-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10.5px]"
                                      disabled={
                                        activeShareLoading ||
                                        activeSharePage >= activeShareTotalPages
                                      }
                                      onClick={() => {
                                        if (shareTarget === "people") {
                                          setPeoplePage(
                                            (current) => current + 1,
                                          );
                                          return;
                                        }
                                        if (shareTarget === "teams") {
                                          setTeamsPage(
                                            (current) => current + 1,
                                          );
                                          return;
                                        }
                                        setProjectsPage(
                                          (current) => current + 1,
                                        );
                                      }}
                                    >
                                      <ChevronRight className="size-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground flex min-h-[10.5rem] items-center justify-center rounded-md border border-dashed border-border/55 px-3 text-center text-[11px]">
                                Start typing to search {shareTarget}.
                              </div>
                            )}
                          </div>

                          <div className="border-border/55 space-y-2.5 border-t px-3 py-2.5">
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium">
                                General access
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Select
                                  value={accessScope}
                                  onValueChange={(value) =>
                                    setAccessScope(
                                      value as "workspace" | "assigned",
                                    )
                                  }
                                  disabled={!selectedDoc?.canEdit || isBusy}
                                >
                                  <SelectTrigger className="h-8 w-full text-[11px]">
                                    <SelectValue placeholder="Visibility" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="workspace">
                                      Whole workspace
                                    </SelectItem>
                                    <SelectItem value="assigned">
                                      Only invited
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={
                                    accessScope === "workspace"
                                      ? workspacePermission
                                      : assignedPermission
                                  }
                                  onValueChange={(value) => {
                                    if (accessScope === "workspace") {
                                      setWorkspacePermission(
                                        value as "view" | "edit",
                                      );
                                      return;
                                    }
                                    setAssignedPermission(
                                      value as "view" | "edit",
                                    );
                                  }}
                                  disabled={!selectedDoc?.canEdit || isBusy}
                                >
                                  <SelectTrigger className="h-8 w-full text-[11px]">
                                    <SelectValue placeholder="Permission" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="view">
                                      Can view
                                    </SelectItem>
                                    <SelectItem value="edit">
                                      Can edit
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="rounded-md border border-border/55 px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-medium">
                                    Link sharing
                                  </p>
                                  <p className="text-muted-foreground text-[10px]">
                                    Enable shareable link access.
                                  </p>
                                </div>
                                <Switch
                                  checked={linkSharingEnabled}
                                  onCheckedChange={(checked) =>
                                    setLinkSharingEnabled(checked)
                                  }
                                  disabled={!selectedDoc?.canEdit || isBusy}
                                />
                              </div>

                              {linkSharingEnabled ? (
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <Select
                                    value={linkSharingScope}
                                    onValueChange={(value) =>
                                      setLinkSharingScope(
                                        value as "workspace" | "public",
                                      )
                                    }
                                    disabled={!selectedDoc?.canEdit || isBusy}
                                  >
                                    <SelectTrigger className="h-8 w-full text-[11px]">
                                      <SelectValue placeholder="Link scope" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="workspace">
                                        Workspace link
                                      </SelectItem>
                                      <SelectItem value="public">
                                        Anyone with link
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={linkSharingPermission}
                                    onValueChange={(value) =>
                                      setLinkSharingPermission(
                                        value as "view" | "edit",
                                      )
                                    }
                                    disabled={!selectedDoc?.canEdit || isBusy}
                                  >
                                    <SelectTrigger className="h-8 w-full text-[11px]">
                                      <SelectValue placeholder="Link permission" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="view">
                                        Can view
                                      </SelectItem>
                                      <SelectItem value="edit">
                                        Can edit
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : null}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={getShareLink()}
                                  readOnly
                                  placeholder="Save to generate link"
                                  className="h-8 min-w-0 flex-1 text-[10.5px]"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-[10.5px]"
                                  onClick={() => void handleCopyShareLink()}
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 px-2.5 text-[10.5px]"
                                  onClick={() => void handleSaveShareSettings()}
                                  disabled={!selectedDoc?.canEdit || isBusy}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => void handleDuplicateDoc(selectedDoc)}
                          >
                            <BookMarked className="size-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          {selectedDoc.canEdit ? (
                            <>
                              <DropdownMenuSeparator />
                              {!selectedDoc.archived ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirm("archive", selectedDoc)
                                  }
                                >
                                  <Archive className="size-3.5" />
                                  Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirm("unarchive", selectedDoc)
                                  }
                                >
                                  <ArchiveRestore className="size-3.5" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  openConfirm("delete", selectedDoc)
                                }
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="shrink-0 pl-1">
                    <NavActions />
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 px-3 py-4 md:px-5">
                <div className="mx-auto w-full max-w-[58rem]">
                  <WorkspaceDocEditor
                    key={selectedDoc.id}
                    docId={selectedDoc.id}
                    initialContent={selectedDoc.content || []}
                    editable={selectedDoc.canEdit}
                    onContentChange={scheduleContentSave}
                    immersive
                    className="min-h-[calc(100svh-12.8rem)]"
                  />
                </div>
              </div>
              {saveState === "saving" ? (
                <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-md border border-border/55 bg-background/85 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
                  <Loader className="size-3 animate-spin text-primary" />
                  Saving...
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <Empty className="gap-3 p-3 md:p-3">
                <EmptyHeader className="gap-1.5">
                  <EmptyMedia variant="icon" className="size-9">
                    <FileText className="size-4.5 text-primary/85" />
                  </EmptyMedia>
                  <EmptyTitle className="text-[13px]">
                    Document not found
                  </EmptyTitle>
                  <EmptyDescription className="text-[12px]">
                    This document may have been archived, deleted, or you may
                    not have access.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={confirmAction.open}
        onOpenChange={(open) =>
          setConfirmAction((current) => ({ ...current, open }))
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmTitleMap[confirmAction.type]}</DialogTitle>
            <DialogDescription>
              {confirmDescriptionMap[confirmAction.type]}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setConfirmAction({
                  open: false,
                  type: "archive",
                  doc: null,
                })
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void handleConfirmAction()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkspaceDocs;
