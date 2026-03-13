"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  History,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Share2,
  Shapes,
  Hash,
  Users,
  UsersRound,
  X,
  Loader,
  Magnet,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Mention, MentionItem, MentionsInput, OnChangeHandlerFunc } from "react-mentions";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import useWorkspaceJam from "@/hooks/use-workspace-jam";
import { useDebounce } from "@/hooks/use-debounce";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import {
  WorkspaceJamActivityRecord,
  WorkspaceJamMentionRecord,
  WorkspaceJamRecord,
  WorkspaceJamScopeFilter,
  WorkspaceJamVisibility,
} from "@/types/jam";
import { ROUTES } from "@/utils/constants";
import { cn } from "@/lib/utils";
import JamCanvas from "@/components/jams/jam-canvas";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoaderComponent from "../shared/loader";

const getSnapshotSignature = (
  value: Record<string, unknown> | null | undefined,
) => {
  if (!value || typeof value !== "object") {
    return "empty";
  }

  const elements = Array.isArray(value.elements)
    ? (value.elements as Array<Record<string, unknown>>).filter(
        (element) => !Boolean(element?.isDeleted),
      )
    : [];
  const files =
    value.files && typeof value.files === "object"
      ? Object.keys(value.files as Record<string, unknown>)
      : [];

  const elementSignature = elements
    .map((element) => {
      const id = String(element?.id || "");
      const version = Number(element?.version ?? 0);
      const versionNonce = Number(element?.versionNonce ?? 0);
      return `${id}:${version}:${versionNonce}:0`;
    })
    .join("|");

  return `${elements.length}:${files.length}:${elementSignature}`;
};

const hasSnapshotContent = (
  value: Record<string, unknown> | null | undefined,
) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const elements = Array.isArray(value.elements)
    ? value.elements.filter((element) => {
        if (!element || typeof element !== "object") {
          return false;
        }
        return !Boolean((element as { isDeleted?: boolean }).isDeleted);
      })
    : [];
  const files =
    value.files && typeof value.files === "object"
      ? Object.keys(value.files as Record<string, unknown>)
      : [];

  return elements.length > 0 || files.length > 0;
};

const getJamLocalDraftKey = (workspaceId: string, jamId: string) =>
  `jam:draft:${workspaceId}:${jamId}`;

const readJamLocalDraft = (workspaceId: string, jamId: string) => {
  if (typeof window === "undefined" || !workspaceId || !jamId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      getJamLocalDraftKey(workspaceId, jamId),
    );
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const writeJamLocalDraft = (
  workspaceId: string,
  jamId: string,
  snapshot: Record<string, unknown> | null | undefined,
) => {
  if (typeof window === "undefined" || !workspaceId || !jamId || !snapshot) {
    return;
  }

  try {
    window.localStorage.setItem(
      getJamLocalDraftKey(workspaceId, jamId),
      JSON.stringify(snapshot),
    );
  } catch {
    // ignore storage limits or serialization issues
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return "just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.round(deltaMs / (60 * 1000));

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDateTime(value);
};

const formatMentionLabel = (label?: string, fallbackId?: string) => {
  const normalized = String(label || fallbackId || "")
    .replace(/^@+/, "")
    .trim();

  return normalized || String(fallbackId || "").trim();
};

const toJamMentionPayload = (
  mentions: MentionItem[],
): WorkspaceJamMentionRecord[] => {
  const byKey = new Map<string, WorkspaceJamMentionRecord>();

  mentions.forEach((mention) => {
    const rawId = String(mention?.id || "").trim();
    const [kind, id] = rawId.split(":");

    if ((kind !== "user" && kind !== "team") || !id) {
      return;
    }

    byKey.set(`${kind}:${id}`, {
      kind,
      id,
      label: formatMentionLabel(mention?.display, id),
    });
  });

  return Array.from(byKey.values());
};

const buildJamMentionChipLabel = (mention: WorkspaceJamMentionRecord) => {
  const baseLabel = formatMentionLabel(mention.label, mention.id);
  if (mention.kind === "team") {
    const teamLabel = baseLabel.startsWith("team:")
      ? baseLabel
      : `team:${baseLabel}`;
    return `@${teamLabel}`;
  }

  return `@${baseLabel}`;
};

const JAMS_SCOPE_OPTIONS: Array<{
  value: WorkspaceJamScopeFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "shared", label: "Shared" },
];

const JAMS_VISIBILITY_OPTIONS: Array<{
  value: WorkspaceJamVisibility;
  label: string;
}> = [
  { value: "private", label: "Private" },
  { value: "workspace", label: "Workspace" },
];

type ShareSelection = {
  users: string[];
  teams: string[];
  rooms: string[];
  announceInRooms: boolean;
  note: string;
};

const defaultShareSelection: ShareSelection = {
  users: [],
  teams: [],
  rooms: [],
  announceInRooms: true,
  note: "",
};

type ShareRecipientOption = {
  id: string;
  type: "users" | "teams" | "rooms";
  label: string;
  meta: string;
};

type RenameJamState = {
  open: boolean;
  jamId: string;
  title: string;
};

const defaultRenameState: RenameJamState = {
  open: false,
  jamId: "",
  title: "",
};

type JamsPageProps = {
  routeJamId?: string | null;
};

const JamsPage = ({ routeJamId }: JamsPageProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const {
    useWorkspaceJams,
    useWorkspaceJamDetail,
    useWorkspaceJamShareTargets,
    useCreateWorkspaceJam,
    useUpdateWorkspaceJam,
    useUpdateWorkspaceJamContent,
    useCreateWorkspaceJamComment,
    useShareWorkspaceJam,
    useArchiveWorkspaceJam,
    useUnarchiveWorkspaceJam,
    useRequestWorkspaceJamEditAccess,
    useReviewWorkspaceJamEditAccessRequest,
  } = useWorkspaceJam();

  const [listSearch, setListSearch] = React.useState("");
  const [scope, setScope] = React.useState<WorkspaceJamScopeFilter>("all");
  const [showArchived, setShowArchived] = React.useState(false);
  const isRoutedCanvasMode = Boolean(routeJamId && routeJamId.trim());
  const [activeJamId, setActiveJamId] = React.useState(
    routeJamId?.trim() || "",
  );
  const [isCanvasFocusMode, setIsCanvasFocusMode] =
    React.useState(isRoutedCanvasMode);
  const [isSnapEnabled, setIsSnapEnabled] = React.useState(true);
  const [isCanvasSidePanelOpen, setIsCanvasSidePanelOpen] =
    React.useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createVisibility, setCreateVisibility] =
    React.useState<WorkspaceJamVisibility>("private");
  const [canvasPanelTab, setCanvasPanelTab] = React.useState<
    "discussion" | "history"
  >("discussion");
  const [commentDraftMarkup, setCommentDraftMarkup] = React.useState("");
  const [commentDraftPlain, setCommentDraftPlain] = React.useState("");
  const [commentMentions, setCommentMentions] = React.useState<MentionItem[]>(
    [],
  );
  const [activeReplyCommentId, setActiveReplyCommentId] = React.useState("");
  const [replyDraftMarkup, setReplyDraftMarkup] = React.useState("");
  const [replyDraftPlain, setReplyDraftPlain] = React.useState("");
  const [replyMentions, setReplyMentions] = React.useState<MentionItem[]>([]);

  const [renameJamState, setRenameJamState] =
    React.useState<RenameJamState>(defaultRenameState);

  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [shareSelection, setShareSelection] = React.useState<ShareSelection>(
    defaultShareSelection,
  );
  const [shareSearch, setShareSearch] = React.useState("");
  const [isEditAccessRequestDialogOpen, setIsEditAccessRequestDialogOpen] =
    React.useState(false);
  const [requestEditAccessJamId, setRequestEditAccessJamId] =
    React.useState("");
  const [editAccessRequestMessage, setEditAccessRequestMessage] =
    React.useState("");
  const lastCanvasRefetchKeyRef = React.useRef("");

  const debouncedListSearch = useDebounce(listSearch, 300);
  const debouncedShareSearch = useDebounce(shareSearch, 250);
  const activeJamFromRoute = routeJamId?.trim() || "";
  const shouldAutoOpenCreateDialog = searchParams?.get("create") === "1";

  const workspaceKey = workspaceId ?? "";
  const listParams = React.useMemo(
    () => ({
      page: 1,
      limit: 200,
      search: debouncedListSearch,
      archived: showArchived,
      scope,
      includeSnapshot: true,
    }),
    [debouncedListSearch, scope, showArchived],
  );

  const jamsQuery = useWorkspaceJams(workspaceKey, listParams, {
    enabled: !!workspaceKey && !isRoutedCanvasMode,
  });

  const jamRows = React.useMemo<WorkspaceJamRecord[]>(
    () => jamsQuery.data?.data?.jams || [],
    [jamsQuery.data?.data?.jams],
  );

  React.useEffect(() => {
    if (!activeJamFromRoute || activeJamFromRoute === activeJamId) {
      return;
    }

    setActiveJamId(activeJamFromRoute);
    setIsCanvasFocusMode(true);
  }, [activeJamFromRoute, activeJamId]);

  React.useEffect(() => {
    if (isRoutedCanvasMode) {
      return;
    }

    if (!jamRows.length) {
      setActiveJamId("");
      setIsCanvasFocusMode(false);
      return;
    }

    const hasActive = jamRows.some((jam) => jam.jamId === activeJamId);
    if (hasActive) {
      return;
    }

    const nextJamId = jamRows[0]?.jamId || "";
    setActiveJamId(nextJamId);
  }, [activeJamId, isRoutedCanvasMode, jamRows]);

  React.useEffect(() => {
    if (!isCanvasFocusMode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCanvasFocusMode]);

  React.useEffect(() => {
    if (!isCanvasFocusMode) {
      return;
    }

    setIsCanvasSidePanelOpen(false);
  }, [activeJamId, isCanvasFocusMode]);

  React.useEffect(() => {
    if (!shouldAutoOpenCreateDialog || isRoutedCanvasMode || !workspaceKey) {
      return;
    }

    setIsCreateDialogOpen(true);
  }, [isRoutedCanvasMode, shouldAutoOpenCreateDialog, workspaceKey]);

  const jamDetailQuery = useWorkspaceJamDetail(workspaceKey, activeJamId, {
    enabled: !!workspaceKey && !!activeJamId,
    includeSnapshot: true,
  });
  const refetchJamDetail = jamDetailQuery.refetch;

  const activeJam = jamDetailQuery.data?.data?.jam || null;
  const activeJamSnapshot = (activeJam?.snapshot || null) as Record<
    string,
    unknown
  > | null;
  const activeJamUpdatedAt = activeJam?.updatedAt || "";
  const activeJamKey = activeJam?.jamId || "";
  const [localDraftSnapshot, setLocalDraftSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);

  React.useEffect(() => {
    if (!workspaceKey || !activeJamKey) {
      setLocalDraftSnapshot(null);
      return;
    }

    setLocalDraftSnapshot(readJamLocalDraft(workspaceKey, activeJamKey));
  }, [activeJamKey, workspaceKey]);

  React.useEffect(() => {
    if (!isCanvasFocusMode || !workspaceKey || !activeJamKey) {
      return;
    }

    const latestLocalDraft = readJamLocalDraft(workspaceKey, activeJamKey);
    if (latestLocalDraft) {
      setLocalDraftSnapshot(latestLocalDraft);
    }
  }, [activeJamKey, isCanvasFocusMode, workspaceKey]);

  React.useEffect(() => {
    if (
      !workspaceKey ||
      !activeJamKey ||
      isCanvasFocusMode ||
      !hasSnapshotContent(activeJamSnapshot)
    ) {
      return;
    }

    const serverUpdatedAtMs = Number(new Date(activeJamUpdatedAt).getTime());
    if (
      Number.isFinite(serverUpdatedAtMs) &&
      serverUpdatedAtMs > 0 &&
      serverUpdatedAtMs < lastLocalDraftWriteAtRef.current
    ) {
      return;
    }

    setLocalDraftSnapshot(activeJamSnapshot);
    writeJamLocalDraft(workspaceKey, activeJamKey, activeJamSnapshot);
    if (Number.isFinite(serverUpdatedAtMs) && serverUpdatedAtMs > 0) {
      lastLocalDraftWriteAtRef.current = serverUpdatedAtMs;
    } else {
      lastLocalDraftWriteAtRef.current = Date.now();
    }
  }, [
    activeJamKey,
    activeJamSnapshot,
    activeJamUpdatedAt,
    isCanvasFocusMode,
    workspaceKey,
  ]);

  const resolvedCanvasSnapshot = React.useMemo(() => {
    // While editing, prefer local draft to prevent UI jumps from slower server echoes.
    if (isCanvasFocusMode && hasSnapshotContent(localDraftSnapshot)) {
      return localDraftSnapshot;
    }

    if (hasSnapshotContent(activeJamSnapshot)) {
      return activeJamSnapshot;
    }

    if (hasSnapshotContent(localDraftSnapshot)) {
      return localDraftSnapshot;
    }

    return activeJamSnapshot || localDraftSnapshot || null;
  }, [activeJamSnapshot, isCanvasFocusMode, localDraftSnapshot]);

  const shareTargetsQuery = useWorkspaceJamShareTargets(
    workspaceKey,
    {
      search: debouncedShareSearch,
      limit: 200,
    },
    {
      enabled: !!workspaceKey && isShareDialogOpen,
    },
  );

  const shareTargetsData = shareTargetsQuery.data?.data;
  const shareTargetUsers = React.useMemo(
    () => shareTargetsData?.users || [],
    [shareTargetsData?.users],
  );
  const shareTargetTeams = React.useMemo(
    () => shareTargetsData?.teams || [],
    [shareTargetsData?.teams],
  );
  const shareTargetRooms = React.useMemo(
    () => shareTargetsData?.rooms || [],
    [shareTargetsData?.rooms],
  );
  const mentionTargetsQuery = useWorkspaceJamShareTargets(
    workspaceKey,
    { search: "", limit: 250 },
    {
      enabled: !!workspaceKey && !!activeJamId && isCanvasFocusMode,
    },
  );
  const mentionTargetsData = mentionTargetsQuery.data?.data;
  const mentionTargetUsers = React.useMemo(
    () => mentionTargetsData?.users || [],
    [mentionTargetsData?.users],
  );
  const mentionTargetTeams = React.useMemo(
    () => mentionTargetsData?.teams || [],
    [mentionTargetsData?.teams],
  );
  const currentUserId = String(user?._id || "").trim();
  const mentionSuggestions = React.useMemo(
    () => [
      ...mentionTargetUsers
        .filter((entry) => String(entry?.id || "") !== currentUserId)
        .map((entry) => ({
          id: `user:${entry.id}`,
          display: entry.name,
        })),
      ...mentionTargetTeams.map((entry) => ({
        id: `team:${entry.id}`,
        display: `team:${entry.name}`,
      })),
    ],
    [currentUserId, mentionTargetTeams, mentionTargetUsers],
  );

  const mentionListBg =
    resolvedTheme === "dark" ? "#000000" : "hsl(var(--popover))";
  const mentionListText =
    resolvedTheme === "dark" ? "#ffffff" : "hsl(var(--popover-foreground))";
  const mentionFocusedBg =
    resolvedTheme === "dark" ? "hsl(var(--accent) / 0.35)" : "hsl(var(--muted))";
  const mentionFocusedText =
    resolvedTheme === "dark" ? "#ffffff" : "hsl(var(--foreground))";
  const mentionComposerStyle = React.useMemo(
    () => ({
      control: {
        width: "100%",
        minHeight: 34,
        borderRadius: 8,
        border: "1px solid hsl(var(--border) / 0.45)",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontSize: 12,
        lineHeight: 1.4,
      },
      highlighter: {
        padding: "8px 10px",
        overflow: "hidden",
        color: "transparent",
      },
      input: {
        margin: 0,
        padding: "8px 10px",
        outline: 0,
        border: 0,
        backgroundColor: "transparent",
        color: "hsl(var(--foreground))",
      },
      suggestions: {
        list: {
          backgroundColor: mentionListBg,
          color: mentionListText,
          border: "1px solid hsl(var(--border) / 0.45)",
          boxShadow: "0 8px 24px rgba(0,0,0,.22)",
          fontSize: 12,
          overflow: "hidden",
          zIndex: 120,
        },
        item: {
          display: "block",
          padding: "6px 8px",
          backgroundColor: mentionListBg,
          color: mentionListText,
          borderBottom: "1px solid hsl(var(--border) / 0.2)",
          "&focused": {
            backgroundColor: mentionFocusedBg,
            color: mentionFocusedText,
          },
        },
      },
    }),
    [mentionFocusedBg, mentionFocusedText, mentionListBg, mentionListText],
  );

  const shareRecipientOptions = React.useMemo<ShareRecipientOption[]>(() => {
    const people = shareTargetUsers.map((user) => ({
      id: user.id,
      type: "users" as const,
      label: user.name,
      meta: user.email,
    }));

    const teams = shareTargetTeams.map((team) => ({
      id: team.id,
      type: "teams" as const,
      label: team.name,
      meta: `${team.memberCount} members`,
    }));

    const rooms = shareTargetRooms.map((room) => ({
      id: room.id,
      type: "rooms" as const,
      label: room.name,
      meta: `${room.kind} • ${room.members} members`,
    }));

    return [...people, ...teams, ...rooms];
  }, [shareTargetRooms, shareTargetTeams, shareTargetUsers]);

  const shareRecipientLabelByType = React.useMemo(() => {
    const users = new Map(
      shareTargetUsers.map((entry) => [entry.id, entry.name]),
    );
    const teams = new Map(
      shareTargetTeams.map((entry) => [entry.id, entry.name]),
    );
    const rooms = new Map(
      shareTargetRooms.map((entry) => [entry.id, entry.name]),
    );

    return { users, teams, rooms };
  }, [shareTargetRooms, shareTargetTeams, shareTargetUsers]);

  React.useEffect(() => {
    if (!isShareDialogOpen || !activeJam) {
      return;
    }

    setShareSelection({
      users: [...activeJam.sharedUserIds],
      teams: [...activeJam.sharedTeamIds],
      rooms: [...activeJam.sharedRoomIds],
      announceInRooms: true,
      note: "",
    });
    setShareSearch("");
  }, [activeJam, isShareDialogOpen]);

  React.useEffect(() => {
    if (!isCanvasFocusMode) {
      lastCanvasRefetchKeyRef.current = "";
      return;
    }

    if (!workspaceKey || !activeJamId) {
      return;
    }

    const refetchKey = `${workspaceKey}:${activeJamId}`;
    if (lastCanvasRefetchKeyRef.current === refetchKey) {
      return;
    }
    lastCanvasRefetchKeyRef.current = refetchKey;

    void refetchJamDetail();
  }, [activeJamId, isCanvasFocusMode, refetchJamDetail, workspaceKey]);

  const createJamMutation = useCreateWorkspaceJam();
  const updateJamMutation = useUpdateWorkspaceJam();
  const updateJamContentMutation = useUpdateWorkspaceJamContent();
  const createJamCommentMutation = useCreateWorkspaceJamComment();
  const shareJamMutation = useShareWorkspaceJam();
  const archiveJamMutation = useArchiveWorkspaceJam();
  const unarchiveJamMutation = useUnarchiveWorkspaceJam();
  const requestWorkspaceJamEditAccessMutation = useRequestWorkspaceJamEditAccess();
  const reviewWorkspaceJamEditAccessRequestMutation =
    useReviewWorkspaceJamEditAccessRequest();

  const invalidateJamQueries = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-jams", workspaceKey],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-jam-detail", workspaceKey],
      }),
    ]);
  }, [queryClient, workspaceKey]);

  const handleCreateJam = async () => {
    if (!workspaceKey || !createTitle.trim()) {
      return;
    }

    try {
      const response = await createJamMutation.mutateAsync({
        workspaceId: workspaceKey,
        payload: {
          title: createTitle.trim(),
          description: createDescription.trim(),
          visibility: createVisibility,
        },
      });

      const nextJamId = String(response.data?.jam?.jamId || "").trim();
      await invalidateJamQueries();

      if (nextJamId) {
        if (isRoutedCanvasMode) {
          setActiveJamId(nextJamId);
          setIsCanvasFocusMode(true);
        }
        router.push(`${ROUTES.JAMS}/${nextJamId}`);
      }

      setIsCreateDialogOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateVisibility("private");
      toast.success("Jam created");
    } catch {
      // handled by hook
    }
  };

  const openRenameDialog = React.useCallback((jam: WorkspaceJamRecord) => {
    setRenameJamState({
      open: true,
      jamId: jam.jamId,
      title: jam.title,
    });
  }, []);

  const handleRenameJam = async () => {
    if (
      !workspaceKey ||
      !renameJamState.jamId ||
      !renameJamState.title.trim()
    ) {
      return;
    }

    try {
      await updateJamMutation.mutateAsync({
        workspaceId: workspaceKey,
        jamId: renameJamState.jamId,
        updates: {
          title: renameJamState.title.trim(),
        },
      });
      await invalidateJamQueries();
      toast.success("Jam renamed");
      setRenameJamState(defaultRenameState);
    } catch {
      // handled by hook
    }
  };

  const openShareDialog = React.useCallback((jamId: string) => {
    setActiveJamId(jamId);
    setIsShareDialogOpen(true);
  }, []);

  const handleArchiveToggle = React.useCallback(
    async (jam: WorkspaceJamRecord) => {
      if (!workspaceKey || !jam.canManage) {
        return;
      }

      try {
        if (jam.archived) {
          await unarchiveJamMutation.mutateAsync({
            workspaceId: workspaceKey,
            jamId: jam.jamId,
          });
        } else {
          await archiveJamMutation.mutateAsync({
            workspaceId: workspaceKey,
            jamId: jam.jamId,
          });
        }

        await invalidateJamQueries();
        toast.success(jam.archived ? "Jam restored" : "Jam archived");
      } catch {
        // handled by hook
      }
    },
    [
      archiveJamMutation,
      invalidateJamQueries,
      unarchiveJamMutation,
      workspaceKey,
    ],
  );

  const savedSnapshotHashRef = React.useRef("");
  const [pendingSnapshot, setPendingSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const pendingSnapshotRef = React.useRef<Record<string, unknown> | null>(null);
  const flushPromiseRef = React.useRef<Promise<void> | null>(null);
  const latestCanvasSnapshotGetterRef = React.useRef<
    (() => Record<string, unknown> | null) | null
  >(null);
  const lastLocalDraftWriteAtRef = React.useRef(0);

  React.useEffect(() => {
    if (!activeJamKey) {
      savedSnapshotHashRef.current = "";
      setPendingSnapshot(null);
      pendingSnapshotRef.current = null;
      lastLocalDraftWriteAtRef.current = 0;
      return;
    }

    savedSnapshotHashRef.current = getSnapshotSignature(activeJamSnapshot);
    if (!isCanvasFocusMode) {
      setPendingSnapshot(null);
      pendingSnapshotRef.current = null;
    }
  }, [activeJamKey, activeJamSnapshot, activeJamUpdatedAt, isCanvasFocusMode]);

  React.useEffect(() => {
    if (!workspaceKey || !activeJamKey || !activeJam?.canEdit) {
      return;
    }

    if (hasSnapshotContent(activeJamSnapshot)) {
      return;
    }

    if (!hasSnapshotContent(localDraftSnapshot)) {
      return;
    }

    const localDraft = localDraftSnapshot as Record<string, unknown>;
    const localHash = getSnapshotSignature(localDraft);
    if (!localHash || localHash === savedSnapshotHashRef.current) {
      return;
    }

    pendingSnapshotRef.current = localDraft;
    setPendingSnapshot(localDraft);
  }, [
    activeJam?.canEdit,
    activeJamKey,
    activeJamSnapshot,
    localDraftSnapshot,
    workspaceKey,
  ]);

  const handleCanvasSnapshotChange = React.useCallback(
    (snapshot: Record<string, unknown>) => {
      if (!activeJam?.canEdit) {
        return;
      }

      const nextHash = getSnapshotSignature(snapshot);
      if (!nextHash || nextHash === savedSnapshotHashRef.current) {
        return;
      }

      pendingSnapshotRef.current = snapshot;
      setPendingSnapshot(snapshot);
      setLocalDraftSnapshot(snapshot);
      if (workspaceKey && activeJam?.jamId) {
        writeJamLocalDraft(workspaceKey, activeJam.jamId, snapshot);
        lastLocalDraftWriteAtRef.current = Date.now();
      }
    },
    [activeJam?.canEdit, activeJam?.jamId, workspaceKey],
  );

  const captureLatestCanvasSnapshot = React.useCallback(() => {
    if (!activeJam?.canEdit) {
      return;
    }

    const snapshot = latestCanvasSnapshotGetterRef.current?.();
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    handleCanvasSnapshotChange(snapshot);
  }, [activeJam?.canEdit, handleCanvasSnapshotChange]);

  const flushPendingSnapshot = React.useCallback(async () => {
    if (!workspaceKey || !activeJam || !activeJam.canEdit) {
      return;
    }

    if (flushPromiseRef.current) {
      await flushPromiseRef.current;
      return;
    }

    const runFlush = async () => {
      while (true) {
        const snapshotToSave = pendingSnapshotRef.current;
        if (!snapshotToSave) {
          break;
        }

        const nextHash = getSnapshotSignature(snapshotToSave);
        if (!nextHash || nextHash === savedSnapshotHashRef.current) {
          pendingSnapshotRef.current = null;
          setPendingSnapshot(null);
          continue;
        }

        // consume the snapshot now; if user keeps drawing while request is in-flight,
        // a new snapshot will be queued and picked by the next loop iteration.
        pendingSnapshotRef.current = null;

        try {
          const response = await updateJamContentMutation.mutateAsync({
            workspaceId: workspaceKey,
            jamId: activeJam.jamId,
            payload: {
              snapshot: snapshotToSave,
            },
          });
          const persistedJam = response.data?.jam;

          savedSnapshotHashRef.current = nextHash;
          writeJamLocalDraft(workspaceKey, activeJam.jamId, snapshotToSave);
          lastLocalDraftWriteAtRef.current = Date.now();

          if (persistedJam) {
            queryClient.setQueryData(
              ["workspace-jam-detail", workspaceKey, activeJam.jamId, true],
              (previous: unknown) => {
                if (!previous || typeof previous !== "object") {
                  return previous;
                }

                const previousResponse = previous as {
                  data?: { message?: string; jam?: WorkspaceJamRecord };
                };

                return {
                  ...previousResponse,
                  data: {
                    ...(previousResponse.data || {
                      message: "Retrieved successfully",
                    }),
                    jam: persistedJam,
                  },
                };
              },
            );
          }
        } catch {
          // handled by hook
          // put it back so next flush can retry.
          pendingSnapshotRef.current = snapshotToSave;
          break;
        }
      }

      if (!pendingSnapshotRef.current) {
        setPendingSnapshot(null);
      }
    };

    const promise = runFlush().finally(() => {
      flushPromiseRef.current = null;
    });

    flushPromiseRef.current = promise;
    await promise;
  }, [activeJam, queryClient, updateJamContentMutation, workspaceKey]);

  React.useEffect(() => {
    if (!workspaceKey || !activeJam || !activeJam.canEdit || !pendingSnapshot) {
      return;
    }

    const timer = setTimeout(() => {
      void flushPendingSnapshot();
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeJam, flushPendingSnapshot, pendingSnapshot, workspaceKey]);

  React.useEffect(() => {
    if (!activeJam?.canEdit) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushPendingSnapshot();
      }
    };

    window.addEventListener("beforeunload", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeJam?.canEdit, flushPendingSnapshot]);

  const handleOpenJamCanvas = React.useCallback(
    async (jamId: string) => {
      captureLatestCanvasSnapshot();
      await flushPendingSnapshot();
      if (isRoutedCanvasMode) {
        setActiveJamId(jamId);
        setIsCanvasFocusMode(true);
      }
      router.push(`${ROUTES.JAMS}/${jamId}`);
    },
    [
      captureLatestCanvasSnapshot,
      flushPendingSnapshot,
      isRoutedCanvasMode,
      router,
    ],
  );

  const toggleSelection = React.useCallback(
    (type: "users" | "teams" | "rooms", value: string) => {
      setShareSelection((current) => {
        const exists = current[type].includes(value);
        const next = exists
          ? current[type].filter((entry) => entry !== value)
          : [...current[type], value];

        return {
          ...current,
          [type]: next,
        };
      });
    },
    [],
  );

  const addSelection = React.useCallback(
    (type: "users" | "teams" | "rooms", value: string) => {
      setShareSelection((current) => {
        if (current[type].includes(value)) {
          return current;
        }

        return {
          ...current,
          [type]: [...current[type], value],
        };
      });
    },
    [],
  );

  const selectedRecipients = React.useMemo(
    () => [
      ...shareSelection.users.map((id) => ({
        id,
        type: "users" as const,
        label: shareRecipientLabelByType.users.get(id) || id,
      })),
      ...shareSelection.teams.map((id) => ({
        id,
        type: "teams" as const,
        label: shareRecipientLabelByType.teams.get(id) || id,
      })),
      ...shareSelection.rooms.map((id) => ({
        id,
        type: "rooms" as const,
        label: shareRecipientLabelByType.rooms.get(id) || id,
      })),
    ],
    [
      shareRecipientLabelByType,
      shareSelection.rooms,
      shareSelection.teams,
      shareSelection.users,
    ],
  );

  const availableShareRecipientOptions = React.useMemo(
    () =>
      shareRecipientOptions.filter((option) => {
        return !shareSelection[option.type].includes(option.id);
      }),
    [shareRecipientOptions, shareSelection],
  );

  const handleShareJam = async () => {
    if (!workspaceKey || !activeJam || !activeJam.canManage) {
      return;
    }

    try {
      const response = await shareJamMutation.mutateAsync({
        workspaceId: workspaceKey,
        jamId: activeJam.jamId,
        payload: {
          userIds: shareSelection.users,
          teamIds: shareSelection.teams,
          roomIds: shareSelection.rooms,
          replace: true,
          announceInRooms: shareSelection.announceInRooms,
          note: shareSelection.note.trim(),
        },
      });
      await invalidateJamQueries();
      toast.success(
        response.data?.announcementsCount
          ? `Shared. Posted in ${response.data.announcementsCount} chat(s).`
          : "Jam sharing updated",
      );
      setIsShareDialogOpen(false);
    } catch {
      // handled by hook
    }
  };

  const handleRequestEditAccess = async () => {
    const targetJamId =
      requestEditAccessJamId || String(activeJam?.jamId || "").trim();
    if (!workspaceKey || !targetJamId) {
      return;
    }

    try {
      await requestWorkspaceJamEditAccessMutation.mutateAsync({
        workspaceId: workspaceKey,
        jamId: targetJamId,
        payload: {
          message: editAccessRequestMessage.trim(),
        },
      });
      await invalidateJamQueries();
      setIsEditAccessRequestDialogOpen(false);
      setEditAccessRequestMessage("");
      setRequestEditAccessJamId("");
      toast.success("Edit access request sent");
    } catch {
      // handled by hook
    }
  };

  const handleReviewEditAccessRequest = React.useCallback(
    async (requestId: string, action: "approve" | "reject") => {
      if (!workspaceKey || !activeJam) {
        return;
      }

      try {
        await reviewWorkspaceJamEditAccessRequestMutation.mutateAsync({
          workspaceId: workspaceKey,
          jamId: activeJam.jamId,
          requestId,
          payload: { action },
        });
        await invalidateJamQueries();
        toast.success(
          action === "approve"
            ? "Edit request approved"
            : "Edit request declined",
        );
      } catch {
        // handled by hook
      }
    },
    [
      activeJam,
      invalidateJamQueries,
      reviewWorkspaceJamEditAccessRequestMutation,
      workspaceKey,
    ],
  );

  const syncJamDetailCache = React.useCallback(
    (jam: WorkspaceJamRecord | undefined) => {
      if (!jam || !workspaceKey || !jam.jamId) {
        return;
      }

      queryClient.setQueryData(
        ["workspace-jam-detail", workspaceKey, jam.jamId, true],
        (previous: unknown) => {
          if (!previous || typeof previous !== "object") {
            return previous;
          }

          const previousResponse = previous as {
            data?: {
              message?: string;
              jam?: WorkspaceJamRecord;
            };
          };

          return {
            ...previousResponse,
            data: {
              ...(previousResponse.data || {
                message: "Retrieved successfully",
              }),
              jam,
            },
          };
        },
      );
    },
    [queryClient, workspaceKey],
  );

  const handleCommentInputChange: OnChangeHandlerFunc = (
    _event,
    newValue,
    newPlainTextValue,
    mentions,
  ) => {
    setCommentDraftMarkup(newValue);
    setCommentDraftPlain(newPlainTextValue);
    setCommentMentions(mentions);
  };

  const handleReplyInputChange: OnChangeHandlerFunc = (
    _event,
    newValue,
    newPlainTextValue,
    mentions,
  ) => {
    setReplyDraftMarkup(newValue);
    setReplyDraftPlain(newPlainTextValue);
    setReplyMentions(mentions);
  };

  const resetReplyDraft = React.useCallback(() => {
    setActiveReplyCommentId("");
    setReplyDraftMarkup("");
    setReplyDraftPlain("");
    setReplyMentions([]);
  }, []);

  React.useEffect(() => {
    setCanvasPanelTab("discussion");
    setCommentDraftMarkup("");
    setCommentDraftPlain("");
    setCommentMentions([]);
    resetReplyDraft();
  }, [activeJam?.jamId, resetReplyDraft]);

  const handlePostComment = async () => {
    if (!workspaceKey || !activeJam?.jamId || !commentDraftPlain.trim()) {
      return;
    }

    try {
      const response = await createJamCommentMutation.mutateAsync({
        workspaceId: workspaceKey,
        jamId: activeJam.jamId,
        payload: {
          message: commentDraftPlain.trim(),
          mentions: toJamMentionPayload(commentMentions),
        },
      });

      syncJamDetailCache(response.data?.jam);
      setCommentDraftMarkup("");
      setCommentDraftPlain("");
      setCommentMentions([]);
      toast.success("Comment posted");
    } catch {
      // handled by hook
    }
  };

  const handlePostReply = async () => {
    if (
      !workspaceKey ||
      !activeJam?.jamId ||
      !activeReplyCommentId ||
      !replyDraftPlain.trim()
    ) {
      return;
    }

    try {
      const response = await createJamCommentMutation.mutateAsync({
        workspaceId: workspaceKey,
        jamId: activeJam.jamId,
        payload: {
          parentCommentId: activeReplyCommentId,
          message: replyDraftPlain.trim(),
          mentions: toJamMentionPayload(replyMentions),
        },
      });

      syncJamDetailCache(response.data?.jam);
      resetReplyDraft();
      toast.success("Reply posted");
    } catch {
      // handled by hook
    }
  };

  const renderMentionBadges = React.useCallback(
    (mentions: WorkspaceJamMentionRecord[]) => {
      if (!Array.isArray(mentions) || !mentions.length) {
        return null;
      }

      return (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {mentions.map((mention, index) => (
            <Badge
              key={`${mention.kind}:${mention.id}:${index}`}
              variant="secondary"
              className="h-5 px-1.5 text-[10px]"
            >
              {buildJamMentionChipLabel(mention)}
            </Badge>
          ))}
        </div>
      );
    },
    [],
  );

  const jamListLoading =
    !isRoutedCanvasMode && jamsQuery.isLoading && !jamRows.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {!isRoutedCanvasMode ? (
        <>
          <div className="bg-background/90 border-border/45 shrink-0 border-b px-4 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold">Jams</p>
                <p className="text-muted-foreground text-[11px]">
                  Compact boards with instant canvas mode
                </p>
              </div>
              <Button
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="size-3.5" />
                New
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[16rem] flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-3.5" />
                <Input
                  value={listSearch}
                  onChange={(event) => setListSearch(event.target.value)}
                  placeholder="Search jams"
                  className="h-8 pl-8 text-[12px]"
                />
              </div>
              <div className="bg-muted/40 border-border/50 inline-flex h-8 items-center rounded-lg border p-0.5">
                {JAMS_SCOPE_OPTIONS.map((option) => {
                  const isActive = scope === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScope(option.value)}
                      className={cn(
                        "h-6 rounded-md px-2.5 text-[11px] transition-colors",
                        isActive
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={() => setShowArchived((value) => !value)}
              >
                {showArchived ? "Archived view" : "Active view"}
              </Button>
            </div>
          </div>

          {!workspaceKey ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <Empty className="border-border/40 max-w-xl border border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Select a workspace first</EmptyTitle>
                  <EmptyDescription>
                    Switch to a workspace to create and collaborate on jams.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <section className="min-h-0 flex-1 overflow-hidden px-4 py-3">
                <div className="text-muted-foreground mb-2 text-[11px]">
                  {jamRows.length} result{jamRows.length === 1 ? "" : "s"}
                </div>
                {jamListLoading ? (
                  <LoaderComponent />
                ) : jamRows.length ? (
                  <ScrollArea className="h-full pr-1">
                    <div className="grid gap-2.5 pb-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {jamRows.map((jam) => (
                        <JamListCard
                          key={jam.jamId}
                          jam={jam}
                          isActive={activeJamId === jam.jamId}
                          onOpen={() => handleOpenJamCanvas(jam.jamId)}
                          onRename={() => openRenameDialog(jam)}
                          onShare={() => openShareDialog(jam.jamId)}
                          onToggleArchive={() => handleArchiveToggle(jam)}
                          onRequestEditAccess={() => {
                            setActiveJamId(jam.jamId);
                            setRequestEditAccessJamId(jam.jamId);
                            setEditAccessRequestMessage("");
                            setIsEditAccessRequestDialogOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <Empty className="border-border/40 h-full rounded-lg border border-dashed p-4">
                    <EmptyHeader className="gap-1">
                      <Brush className="text-muted-foreground size-5" />
                      <EmptyTitle className="text-sm">No jams yet</EmptyTitle>
                      <EmptyDescription className="text-[12px]">
                        Create your first jamboard to sketch ideas, flows, and
                        plans.
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button
                      size="sm"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="size-3.5" />
                      Create Jam
                    </Button>
                  </Empty>
                )}
              </section>
            </div>
          )}
        </>
      ) : null}

      {isCanvasFocusMode ? (
        <div
          className={cn(
            "bg-background flex min-h-0 flex-col",
            isRoutedCanvasMode ? "h-full" : "fixed inset-0 z-[120]",
          )}
        >
          <div className="bg-background/90 border-border/40 flex shrink-0 items-center gap-2 border-b px-3 py-2 backdrop-blur-sm">
            <p className="line-clamp-1 text-[12px] font-medium">
              {activeJam?.title || "Loading jam..."}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {activeJam?.canEdit ? (
                <Button
                  size="sm"
                  variant={isSnapEnabled ? "secondary" : "outline"}
                  className="h-8 px-2.5"
                  onClick={() => setIsSnapEnabled((value) => !value)}
                >
                  <Magnet className="size-3.5" />
                  {isSnapEnabled ? "Snap on" : "Snap off"}
                </Button>
              ) : null}
              {activeJam?.canManage &&
              Number(activeJam?.pendingEditAccessRequestCount || 0) > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5"
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  {activeJam.pendingEditAccessRequestCount} request
                  {activeJam.pendingEditAccessRequestCount === 1 ? "" : "s"}
                </Button>
              ) : null}
              {activeJam && !activeJam.canEdit ? (
                <Badge variant="secondary" className="text-[10px]">
                  Read only
                </Badge>
              ) : null}
              {activeJam && !activeJam.canEdit ? (
                <Button
                  size="sm"
                  variant={
                    activeJam.hasPendingEditAccessRequest
                      ? "secondary"
                      : "outline"
                  }
                  className="h-8 px-2.5"
                  disabled={
                    activeJam.hasPendingEditAccessRequest ||
                    requestWorkspaceJamEditAccessMutation.isPending
                  }
                  loading={requestWorkspaceJamEditAccessMutation.isPending}
                  onClick={() => {
                    setRequestEditAccessJamId(activeJam.jamId);
                    setIsEditAccessRequestDialogOpen(true);
                  }}
                >
                  {activeJam.hasPendingEditAccessRequest
                    ? "Request pending"
                    : "Request edit"}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5"
                onClick={async () => {
                  captureLatestCanvasSnapshot();
                  await flushPendingSnapshot();
                  if (isRoutedCanvasMode) {
                    router.push(ROUTES.JAMS);
                  } else {
                    setIsCanvasFocusMode(false);
                  }
                }}
              >
                <Minimize2 className="size-3.5" />
                Exit
              </Button>
              <Button
                size="icon"
                variant={isCanvasSidePanelOpen ? "secondary" : "outline"}
                className="size-8"
                onClick={() => setIsCanvasSidePanelOpen((value) => !value)}
                aria-label={
                  isCanvasSidePanelOpen ? "Close jam panel" : "Open jam panel"
                }
                title={
                  isCanvasSidePanelOpen ? "Close jam panel" : "Open jam panel"
                }
              >
                {isCanvasSidePanelOpen ? (
                  <ChevronRight className="size-3.5" />
                ) : (
                  <ChevronLeft className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {jamDetailQuery.isLoading || !activeJam ? (
              <LoaderComponent />
            ) : (
              <div className="flex h-full min-h-0">
                <div className="relative min-h-0 flex-1">
                  <JamCanvas
                    jamId={activeJam.jamId}
                    snapshot={resolvedCanvasSnapshot}
                    canEdit={Boolean(activeJam.canEdit)}
                    gridModeEnabled={Boolean(activeJam.canEdit) && isSnapEnabled}
                    onSnapshotChange={handleCanvasSnapshotChange}
                    onRegisterSnapshotGetter={(getter) => {
                      latestCanvasSnapshotGetterRef.current = getter;
                    }}
                  />
                  {updateJamContentMutation.isPending ? (
                    <div className="bg-background/80 text-muted-foreground absolute right-3 bottom-3 z-30 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                      <Loader className="size-3 animate-spin" />
                      Saving...
                    </div>
                  ) : null}
                </div>
                <Sheet
                  open={isCanvasSidePanelOpen}
                  onOpenChange={setIsCanvasSidePanelOpen}
                >
                  <SheetContent
                    side="right"
                    showCloseButton={false}
                    className="w-[92vw] max-w-none p-0 sm:max-w-[22rem]"
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>Jam panel</SheetTitle>
                      <SheetDescription>
                        Discussion and history for this jam.
                      </SheetDescription>
                    </SheetHeader>
                    <Tabs
                      value={canvasPanelTab}
                      onValueChange={(value) =>
                        setCanvasPanelTab(value as "discussion" | "history")
                      }
                      className="flex h-full min-h-0 flex-col"
                    >
                      <div className="border-b border-border/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <TabsList className="grid h-8 min-w-0 flex-1 grid-cols-2">
                            <TabsTrigger
                              value="discussion"
                              className="h-7 text-[11px]"
                            >
                              Discussion
                            </TabsTrigger>
                            <TabsTrigger
                              value="history"
                              className="h-7 text-[11px]"
                            >
                              History
                            </TabsTrigger>
                          </TabsList>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7 shrink-0"
                            onClick={() => setIsCanvasSidePanelOpen(false)}
                            aria-label="Close jam panel"
                            title="Close jam panel"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <TabsContent
                        value="discussion"
                        className="mt-0 flex min-h-0 flex-1 flex-col"
                      >
                        <ScrollArea className="min-h-0 flex-1 px-3 py-2">
                          {Array.isArray(activeJam.comments) &&
                          activeJam.comments.length ? (
                            <div className="space-y-2.5 pb-3">
                              {activeJam.comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="bg-muted/20 border-border/35 rounded-md border p-2"
                                >
                                  <div className="flex items-start gap-2">
                                    <Avatar className="size-6">
                                      <AvatarImage
                                        src={comment.user?.avatarUrl || ""}
                                        alt={comment.user?.name || "User"}
                                      />
                                      <AvatarFallback className="text-[10px]">
                                        {comment.user?.initials || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-[11px] font-medium">
                                          {comment.user?.name || "Workspace member"}
                                        </p>
                                        <p className="text-muted-foreground shrink-0 text-[10px]">
                                          {formatRelativeTime(comment.createdAt)}
                                        </p>
                                      </div>
                                      <p className="mt-1 whitespace-pre-wrap text-[12px]">
                                        {comment.message}
                                      </p>
                                      {renderMentionBadges(comment.mentions || [])}
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-[10.5px]"
                                        onClick={() => {
                                          if (
                                            activeReplyCommentId === comment.id
                                          ) {
                                            resetReplyDraft();
                                          } else {
                                            setActiveReplyCommentId(comment.id);
                                            setReplyDraftMarkup("");
                                            setReplyDraftPlain("");
                                            setReplyMentions([]);
                                          }
                                        }}
                                      >
                                        <Reply className="size-3" />
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                  {Array.isArray(comment.replies) &&
                                  comment.replies.length ? (
                                    <div className="mt-2 space-y-1.5 border-l border-border/35 pl-3">
                                      {comment.replies.map((reply) => (
                                        <div key={reply.id} className="space-y-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <p className="text-[10.5px] font-medium">
                                              {reply.user?.name || "Workspace member"}
                                            </p>
                                            <p className="text-muted-foreground text-[10px]">
                                              {formatRelativeTime(reply.createdAt)}
                                            </p>
                                          </div>
                                          <p className="text-[11px]">
                                            {reply.message}
                                          </p>
                                          {renderMentionBadges(
                                            reply.mentions || [],
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                  {activeReplyCommentId === comment.id ? (
                                    <div className="mt-2 space-y-1.5 border-t border-border/30 pt-2">
                                      <MentionsInput
                                        value={replyDraftMarkup}
                                        onChange={handleReplyInputChange}
                                        placeholder="Reply with @mentions"
                                        allowSuggestionsAboveCursor
                                        className="w-full"
                                        style={mentionComposerStyle}
                                        disabled={createJamCommentMutation.isPending}
                                      >
                                        <Mention
                                          trigger="@"
                                          data={mentionSuggestions}
                                          markup="@[__display__](__id__)"
                                          displayTransform={(_id, display) =>
                                            `@${display}`
                                          }
                                          appendSpaceOnAdd
                                        />
                                      </MentionsInput>
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={resetReplyDraft}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => void handlePostReply()}
                                          disabled={
                                            createJamCommentMutation.isPending ||
                                            !replyDraftPlain.trim()
                                          }
                                          loading={createJamCommentMutation.isPending}
                                        >
                                          <Send className="size-3.5" />
                                          Reply
                                        </Button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground py-8 text-center text-[11px]">
                              No comments yet. Start the discussion.
                            </div>
                          )}
                        </ScrollArea>
                        <div className="border-t border-border/35 p-2">
                          <MentionsInput
                            value={commentDraftMarkup}
                            onChange={handleCommentInputChange}
                            placeholder="Comment with @mentions"
                            allowSuggestionsAboveCursor
                            className="w-full"
                            style={mentionComposerStyle}
                            disabled={createJamCommentMutation.isPending}
                          >
                            <Mention
                              trigger="@"
                              data={mentionSuggestions}
                              markup="@[__display__](__id__)"
                              displayTransform={(_id, display) => `@${display}`}
                              appendSpaceOnAdd
                            />
                          </MentionsInput>
                          <div className="mt-1.5 flex items-center justify-between gap-1.5">
                            <p className="text-muted-foreground text-[10px]">
                              Tag teammates or teams to request feedback.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => void handlePostComment()}
                              disabled={
                                createJamCommentMutation.isPending ||
                                !commentDraftPlain.trim()
                              }
                              loading={createJamCommentMutation.isPending}
                            >
                              <Send className="size-3.5" />
                              Send
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent
                        value="history"
                        className="mt-0 min-h-0 flex-1 overflow-hidden"
                      >
                        <ScrollArea className="h-full px-3 py-2">
                          {Array.isArray(activeJam.activity) &&
                          activeJam.activity.length ? (
                            <div className="space-y-2 pb-3">
                              {activeJam.activity.map((activity) => (
                                <JamActivityRow
                                  key={activity.id}
                                  activity={activity}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground py-8 text-center text-[11px]">
                              No activity yet.
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open && shouldAutoOpenCreateDialog) {
            router.replace(ROUTES.JAMS);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Jam</DialogTitle>
            <DialogDescription>
              Create a collaborative whiteboard that you can share in Spaces and
              with teammates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="jam-title">Title</Label>
              <Input
                id="jam-title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                placeholder="Sprint planning board"
                className="h-9 text-[12px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="jam-description">Description</Label>
              <Textarea
                id="jam-description"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="Outline flows, blockers, and responsibilities."
                className="min-h-[90px] text-[12px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Visibility</Label>
              <Select
                value={createVisibility}
                onValueChange={(value) =>
                  setCreateVisibility(value as WorkspaceJamVisibility)
                }
              >
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JAMS_VISIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateJam}
              disabled={!createTitle.trim() || createJamMutation.isPending}
              loading={createJamMutation.isPending}
            >
              <Plus className="size-3.5" />
              Create jam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameJamState.open}
        onOpenChange={(open) =>
          setRenameJamState((current) => ({
            ...current,
            open,
          }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Jam</DialogTitle>
            <DialogDescription>
              Use a short, clear title for easier discovery.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="rename-jam-title">Title</Label>
            <Input
              id="rename-jam-title"
              value={renameJamState.title}
              onChange={(event) =>
                setRenameJamState((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="h-9 text-[12px]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleRenameJam}
              disabled={
                !renameJamState.title.trim() || updateJamMutation.isPending
              }
              loading={updateJamMutation.isPending}
            >
              <>
                <Check className="size-3.5" />
                Save title
              </>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditAccessRequestDialogOpen}
        onOpenChange={(open) => {
          setIsEditAccessRequestDialogOpen(open);
          if (!open) {
            setRequestEditAccessJamId("");
            setEditAccessRequestMessage("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request edit access</DialogTitle>
            <DialogDescription>
              Send a request to the jam owner so you can continue from this
              point.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="jam-edit-request-message">
              Optional message to owner
            </Label>
            <Textarea
              id="jam-edit-request-message"
              value={editAccessRequestMessage}
              onChange={(event) => setEditAccessRequestMessage(event.target.value)}
              maxLength={400}
              placeholder="I need edit access to continue this board."
              className="min-h-[90px] text-[12px]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleRequestEditAccess}
              disabled={requestWorkspaceJamEditAccessMutation.isPending}
              loading={requestWorkspaceJamEditAccessMutation.isPending}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Share Jam</DialogTitle>
            <DialogDescription>
              Share this board with people, teams, and Spaces rooms.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label className="text-[12px]">Add access by name</Label>
            <Input
              value={shareSearch}
              onChange={(event) => setShareSearch(event.target.value)}
              placeholder="Type a person, team, or room name"
              className="h-9 text-[12px]"
            />
            <div className="bg-muted/20 border-border/45 min-h-0 rounded-md border">
              <ScrollArea className="h-[13.5rem]">
                <div className="space-y-0.5 p-1.5">
                  {shareTargetsQuery.isLoading ? (
                    <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-2 text-[11px]">
                      <Loader className="size-3.5 animate-spin" />
                      Searching...
                    </div>
                  ) : availableShareRecipientOptions.length ? (
                    availableShareRecipientOptions.map((option) => {
                      const OptionIcon =
                        option.type === "users"
                          ? Users
                          : option.type === "teams"
                            ? UsersRound
                            : Hash;

                      return (
                        <button
                          key={`${option.type}:${option.id}`}
                          type="button"
                          onClick={() => addSelection(option.type, option.id)}
                          className="hover:bg-muted/55 flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left"
                        >
                          <OptionIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] leading-none">
                              {option.label}
                            </span>
                            <span className="text-muted-foreground mt-1 block truncate text-[11px]">
                              {option.meta}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground px-2 py-2 text-[11px]">
                      No matching recipients found.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedRecipients.length ? (
                selectedRecipients.map((entry) => {
                  const EntryIcon =
                    entry.type === "users"
                      ? Users
                      : entry.type === "teams"
                        ? UsersRound
                        : Hash;

                  return (
                    <Badge
                      key={`${entry.type}:${entry.id}`}
                      variant="secondary"
                      className="h-6 gap-1 px-2 text-[11px]"
                    >
                      <EntryIcon className="size-3" />
                      <span className="max-w-[14rem] truncate">
                        {entry.label}
                      </span>
                      <button
                        type="button"
                        className="hover:text-foreground text-muted-foreground"
                        onClick={() => toggleSelection(entry.type, entry.id)}
                        aria-label={`Remove ${entry.label}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  No recipients selected yet.
                </p>
              )}
            </div>
            {activeJam?.canManage &&
            Array.isArray(activeJam.pendingEditAccessRequests) &&
            activeJam.pendingEditAccessRequests.length ? (
              <div className="bg-muted/20 border-border/45 space-y-2 rounded-md border p-2">
                <p className="text-[11px] font-medium">
                  Edit access requests
                </p>
                <div className="space-y-1.5">
                  {activeJam.pendingEditAccessRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-background/60 border-border/40 flex items-start justify-between gap-2 rounded-md border px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium">
                          {request.requester?.name || "Workspace member"}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {request.requester?.email || "No email"}
                        </p>
                        {request.message ? (
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
                            {request.message}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-7"
                          disabled={
                            reviewWorkspaceJamEditAccessRequestMutation.isPending
                          }
                          onClick={() =>
                            void handleReviewEditAccessRequest(
                              request.id,
                              "approve",
                            )
                          }
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-7"
                          disabled={
                            reviewWorkspaceJamEditAccessRequestMutation.isPending
                          }
                          onClick={() =>
                            void handleReviewEditAccessRequest(
                              request.id,
                              "reject",
                            )
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <Separator />
          <div className="grid gap-2">
            <label className="inline-flex items-center gap-2 text-[12px]">
              <Switch
                checked={shareSelection.announceInRooms}
                onCheckedChange={(checked) =>
                  setShareSelection((current) => ({
                    ...current,
                    announceInRooms: checked,
                  }))
                }
                size="sm"
              />
              Post this jam link to selected rooms in Spaces
            </label>
            <Textarea
              value={shareSelection.note}
              onChange={(event) =>
                setShareSelection((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder="Optional note to include with the shared link"
              className="min-h-[70px] text-[12px]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleShareJam}
              disabled={shareJamMutation.isPending}
              loading={shareJamMutation.isPending}
            >
              <>
                <Check className="size-3.5" />
                Save sharing
              </>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

type JamListCardProps = {
  jam: WorkspaceJamRecord;
  isActive: boolean;
  onOpen: () => void;
  onRename: () => void;
  onShare: () => void;
  onToggleArchive: () => void;
  onRequestEditAccess: () => void;
};

const JamListCard = ({
  jam,
  isActive,
  onOpen,
  onRename,
  onShare,
  onToggleArchive,
  onRequestEditAccess,
}: JamListCardProps) => {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border/45 bg-card transition-colors",
        isActive ? "bg-accent/10" : undefined,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex h-46 w-full flex-col justify-between p-2 text-left transition-colors",
          isActive
            ? "bg-accent/15 hover:bg-accent/20"
            : "bg-muted/25 hover:bg-muted/35",
        )}
      >
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant="outline"
                className="h-5 border-border/40 bg-background/70 px-1.5 text-[8.5px] uppercase"
              >
                {jam.visibility}
              </Badge>
              {jam.canManage && jam.pendingEditAccessRequestCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 bg-primary/10 px-1.5 text-[8.5px] text-primary"
                >
                  {jam.pendingEditAccessRequestCount} request
                  {jam.pendingEditAccessRequestCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {jam.archived ? (
                <Badge
                  variant="secondary"
                  className="h-5 bg-muted/70 px-1.5 text-[8.5px]"
                >
                  Archived
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex size-6 items-center justify-center rounded-md bg-primary/12 text-primary">
              <Shapes className="size-3" />
            </div>
            <p className="line-clamp-1 text-[12px] font-semibold text-foreground">
              {jam.title}
            </p>
            <p className="text-muted-foreground line-clamp-1 text-[10.5px]">
              {jam.description || "No description"}
            </p>
            <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Clock3 className="size-3" />
              <span className="truncate">
                {formatDateTime(jam.lastEditedAt || jam.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </button>

      <div className="absolute top-1.5 right-1.5 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="bg-background/75 border-border/35 text-muted-foreground hover:text-foreground hover:bg-muted/70 h-6 w-6 shrink-0 border"
            >
              <MoreHorizontal className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen} className="text-[12px]">
              <Eye className="size-3.5" />
              Open canvas
            </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onShare}
                disabled={!jam.canManage}
                className="text-[12px]"
              >
              <Share2 className="size-3.5" />
              Share
            </DropdownMenuItem>
            {!jam.canEdit ? (
              <DropdownMenuItem
                onClick={onRequestEditAccess}
                disabled={jam.hasPendingEditAccessRequest}
                className="text-[12px]"
              >
                <Pencil className="size-3.5" />
                {jam.hasPendingEditAccessRequest
                  ? "Request pending"
                  : "Request edit access"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={onRename}
              disabled={!jam.canManage}
              className="text-[12px]"
            >
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onToggleArchive}
              disabled={!jam.canManage}
              className="text-[12px]"
            >
              {jam.archived ? (
                <>
                  <ArchiveRestore className="size-3.5" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="size-3.5" />
                  Archive
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
};

const JamActivityRow = ({
  activity,
}: {
  activity: WorkspaceJamActivityRecord;
}) => {
  return (
    <div className="bg-muted/20 border-border/35 rounded-md border p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
            {activity.actorInitials || "U"}
          </span>
          <p className="text-[11px] font-medium">
            {activity.actorName || "Workspace member"}
          </p>
        </div>
        <p className="text-muted-foreground text-[10px]">
          {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px]">
        <History className="text-muted-foreground size-3.5" />
        <span>{activity.summary}</span>
      </div>
      <p className="text-muted-foreground mt-1 text-[10px] uppercase tracking-wide">
        {activity.type}
      </p>
    </div>
  );
};

export default JamsPage;
