"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Brush,
  Check,
  Clock3,
  Eye,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  Shapes,
  Users,
  UsersRound,
  Loader,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useWorkspaceJam from "@/hooks/use-workspace-jam";
import { useDebounce } from "@/hooks/use-debounce";
import useWorkspaceStore from "@/stores/workspace";
import {
  WorkspaceJamRecord,
  WorkspaceJamScopeFilter,
  WorkspaceJamVisibility,
} from "@/types/jam";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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

const JamsPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const {
    useWorkspaceJams,
    useWorkspaceJamDetail,
    useWorkspaceJamShareTargets,
    useCreateWorkspaceJam,
    useUpdateWorkspaceJam,
    useUpdateWorkspaceJamContent,
    useShareWorkspaceJam,
    useArchiveWorkspaceJam,
    useUnarchiveWorkspaceJam,
  } = useWorkspaceJam();

  const [listSearch, setListSearch] = React.useState("");
  const [scope, setScope] = React.useState<WorkspaceJamScopeFilter>("all");
  const [showArchived, setShowArchived] = React.useState(false);
  const [activeJamId, setActiveJamId] = React.useState("");
  const [isCanvasFocusMode, setIsCanvasFocusMode] = React.useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createVisibility, setCreateVisibility] =
    React.useState<WorkspaceJamVisibility>("private");

  const [renameJamState, setRenameJamState] =
    React.useState<RenameJamState>(defaultRenameState);

  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [shareSelection, setShareSelection] = React.useState<ShareSelection>(
    defaultShareSelection,
  );
  const [shareSearch, setShareSearch] = React.useState("");
  const lastCanvasRefetchKeyRef = React.useRef("");

  const debouncedListSearch = useDebounce(listSearch, 300);
  const debouncedShareSearch = useDebounce(shareSearch, 250);
  const activeJamFromUrl = String(searchParams.get("jam") || "").trim();

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
    enabled: !!workspaceKey,
  });

  const jamRows = React.useMemo<WorkspaceJamRecord[]>(
    () => jamsQuery.data?.data?.jams || [],
    [jamsQuery.data?.data?.jams],
  );

  React.useEffect(() => {
    if (!activeJamFromUrl || activeJamFromUrl === activeJamId) {
      return;
    }

    setActiveJamId(activeJamFromUrl);
    setIsCanvasFocusMode(true);
  }, [activeJamFromUrl, activeJamId]);

  React.useEffect(() => {
    if (!jamRows.length) {
      setActiveJamId("");
      setIsCanvasFocusMode(false);
      return;
    }

    const hasActive = jamRows.some((jam) => jam.jamId === activeJamId);
    if (hasActive) {
      return;
    }

    const nextJamId = activeJamFromUrl || jamRows[0]?.jamId || "";
    setActiveJamId(nextJamId);
  }, [activeJamFromUrl, activeJamId, jamRows]);

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

  const syncUrlWithJam = React.useCallback(
    (jamId: string) => {
      const currentJam = String(searchParams.get("jam") || "").trim();
      if (currentJam === jamId) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (jamId) {
        params.set("jam", jamId);
      } else {
        params.delete("jam");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    syncUrlWithJam(activeJamId);
  }, [activeJamId, syncUrlWithJam]);

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

    setLocalDraftSnapshot(activeJamSnapshot);
    writeJamLocalDraft(workspaceKey, activeJamKey, activeJamSnapshot);
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
  const shareJamMutation = useShareWorkspaceJam();
  const archiveJamMutation = useArchiveWorkspaceJam();
  const unarchiveJamMutation = useUnarchiveWorkspaceJam();

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
        setActiveJamId(nextJamId);
        setIsCanvasFocusMode(true);
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
      if (!workspaceKey || !jam.canEdit) {
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

  React.useEffect(() => {
    if (!activeJamKey) {
      savedSnapshotHashRef.current = "";
      setPendingSnapshot(null);
      pendingSnapshotRef.current = null;
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
          await updateJamContentMutation.mutateAsync({
            workspaceId: workspaceKey,
            jamId: activeJam.jamId,
            payload: {
              snapshot: snapshotToSave,
            },
          });
          savedSnapshotHashRef.current = nextHash;
          writeJamLocalDraft(workspaceKey, activeJam.jamId, snapshotToSave);
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
  }, [activeJam, updateJamContentMutation, workspaceKey]);

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
      setActiveJamId(jamId);
      setIsCanvasFocusMode(true);
    },
    [captureLatestCanvasSnapshot, flushPendingSnapshot],
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

  const handleShareJam = async () => {
    if (!workspaceKey || !activeJam) {
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

  const jamListLoading = jamsQuery.isLoading && !jamRows.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
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
                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="size-3.5" />
                  Create Jam
                </Button>
              </Empty>
            )}
          </section>
        </div>
      )}

      {isCanvasFocusMode && activeJam ? (
        <div className="bg-background fixed inset-0 z-[120] flex min-h-0 flex-col">
          <div className="bg-background/90 border-border/40 flex shrink-0 items-center gap-2 border-b px-3 py-2 backdrop-blur-sm">
            <Badge variant="outline" className="text-[10px] uppercase">
              Canvas mode
            </Badge>
            <p className="line-clamp-1 text-[12px] font-medium">
              {activeJam.title}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {!activeJam.canEdit ? (
                <Badge variant="secondary" className="text-[10px]">
                  Read only
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5"
                onClick={async () => {
                  captureLatestCanvasSnapshot();
                  await flushPendingSnapshot();
                  setIsCanvasFocusMode(false);
                }}
              >
                <Minimize2 className="size-3.5" />
                Exit
              </Button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {jamDetailQuery.isLoading ? (
              <LoaderComponent />
            ) : (
              <JamCanvas
                jamId={activeJam.jamId}
                snapshot={resolvedCanvasSnapshot}
                canEdit={Boolean(activeJam.canEdit)}
                onSnapshotChange={handleCanvasSnapshotChange}
                onRegisterSnapshotGetter={(getter) => {
                  latestCanvasSnapshotGetterRef.current = getter;
                }}
              />
            )}
            {updateJamContentMutation.isPending ? (
              <div className="bg-background/80 text-muted-foreground absolute right-3 bottom-3 z-30 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                <Loader className="size-3 animate-spin" />
                Saving...
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Share Jam</DialogTitle>
            <DialogDescription>
              Share this board with people, teams, and Spaces rooms.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] gap-3 overflow-hidden md:grid-cols-3">
            <Input
              value={shareSearch}
              onChange={(event) => setShareSearch(event.target.value)}
              placeholder="Search people, teams, or rooms"
              className="md:col-span-3 h-8 text-[12px]"
            />
            <ShareListSection
              title="People"
              icon={Users}
              items={shareTargetsQuery.data?.data?.users || []}
              selected={shareSelection.users}
              emptyLabel="No people found"
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              getMeta={(item) => item.email}
              onToggle={(value) => toggleSelection("users", value)}
            />
            <ShareListSection
              title="Teams"
              icon={UsersRound}
              items={shareTargetsQuery.data?.data?.teams || []}
              selected={shareSelection.teams}
              emptyLabel="No teams found"
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              getMeta={(item) => `${item.memberCount} members`}
              onToggle={(value) => toggleSelection("teams", value)}
            />
            <ShareListSection
              title="Spaces Rooms"
              icon={Share2}
              items={shareTargetsQuery.data?.data?.rooms || []}
              selected={shareSelection.rooms}
              emptyLabel="No rooms found"
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              getMeta={(item) => `${item.kind} • ${item.members} members`}
              onToggle={(value) => toggleSelection("rooms", value)}
            />
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
};

const getJamPreviewElements = (
  snapshot: Record<string, unknown> | null | undefined,
) => {
  const elements = Array.isArray(snapshot?.elements)
    ? (snapshot.elements as Array<Record<string, unknown>>)
    : [];

  return elements
    .filter((element) => !Boolean(element?.isDeleted))
    .map((element) => ({
      id: String(element?.id || Math.random().toString(36).slice(2)),
      x: Number(element?.x ?? 0),
      y: Number(element?.y ?? 0),
      width: Math.max(2, Math.abs(Number(element?.width ?? 4))),
      height: Math.max(2, Math.abs(Number(element?.height ?? 4))),
      strokeColor:
        typeof element?.strokeColor === "string"
          ? element.strokeColor
          : "#a1a1aa",
      backgroundColor:
        typeof element?.backgroundColor === "string"
          ? element.backgroundColor
          : "transparent",
    }))
    .slice(0, 40);
};

const JamCardPreview = ({
  snapshot,
}: {
  snapshot: Record<string, unknown> | null | undefined;
}) => {
  const elements = React.useMemo(
    () => getJamPreviewElements(snapshot),
    [snapshot],
  );

  if (!elements.length) {
    return (
      <>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] bg-[size:10px_10px] opacity-35" />
      </>
    );
  }

  const bounds = elements.reduce(
    (acc, element) => ({
      minX: Math.min(acc.minX, element.x),
      minY: Math.min(acc.minY, element.y),
      maxX: Math.max(acc.maxX, element.x + element.width),
      maxY: Math.max(acc.maxY, element.y + element.height),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  const widthSpan = Math.max(1, bounds.maxX - bounds.minX);
  const heightSpan = Math.max(1, bounds.maxY - bounds.minY);

  return (
    <svg
      viewBox="0 0 100 60"
      className="absolute inset-0 h-full w-full opacity-60"
      preserveAspectRatio="xMidYMid meet"
    >
      {elements.map((element) => {
        const x = ((element.x - bounds.minX) / widthSpan) * 88 + 6;
        const y = ((element.y - bounds.minY) / heightSpan) * 48 + 6;
        const width = Math.max(2.2, (element.width / widthSpan) * 88);
        const height = Math.max(2.2, (element.height / heightSpan) * 48);
        const fill =
          element.backgroundColor && element.backgroundColor !== "transparent"
            ? element.backgroundColor
            : "transparent";

        return (
          <rect
            key={element.id}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={2}
            ry={2}
            fill={fill}
            stroke={element.strokeColor || "#a1a1aa"}
            strokeWidth={0.8}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
};

const JamListCard = ({
  jam,
  isActive,
  onOpen,
  onRename,
  onShare,
  onToggleArchive,
}: JamListCardProps) => {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-lg transition-colors",
        isActive ? "ring-primary/25 ring-1" : undefined,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative h-36 w-full text-left"
      >
        <div className="from-muted/95 via-muted/65 to-background/80 absolute inset-0 bg-gradient-to-br" />
        <JamCardPreview snapshot={jam.snapshot || null} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5 dark:from-black/80 dark:via-black/35 dark:to-black/10" />

        <div className="relative z-10 flex h-full flex-col justify-between p-2">
          <div className="flex items-start justify-between gap-2">
            <Badge
              variant="outline"
              className="h-5 border-white/30 bg-black/35 px-1.5 text-[8.5px] text-white uppercase backdrop-blur-sm"
            >
              {jam.visibility}
            </Badge>
            {jam.archived ? (
              <Badge
                variant="secondary"
                className="h-5 bg-black/45 px-1.5 text-[8.5px] text-white"
              >
                Archived
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="inline-flex size-6 items-center justify-center rounded-md bg-black/30 text-white/85 backdrop-blur-sm">
              <Shapes className="size-3" />
            </div>
            <p className="line-clamp-1 text-[12px] font-semibold text-white">
              {jam.title}
            </p>
            <p className="line-clamp-1 text-[10.5px] text-white/85">
              {jam.description || "No description"}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-white/80">
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
              className="h-6 w-6 shrink-0 border border-white/20 bg-black/30 text-white hover:bg-black/45 hover:text-white"
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
              disabled={!jam.canEdit}
              className="text-[12px]"
            >
              <Share2 className="size-3.5" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRename}
              disabled={!jam.canEdit}
              className="text-[12px]"
            >
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onToggleArchive}
              disabled={!jam.canEdit}
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

type ShareListSectionProps<TItem extends { id: string }> = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: TItem[];
  selected: string[];
  emptyLabel: string;
  getKey: (item: TItem) => string;
  getLabel: (item: TItem) => string;
  getMeta?: (item: TItem) => string;
  onToggle: (value: string) => void;
};

const ShareListSection = <TItem extends { id: string }>({
  title,
  icon: Icon,
  items,
  selected,
  emptyLabel,
  getKey,
  getLabel,
  getMeta,
  onToggle,
}: ShareListSectionProps<TItem>) => {
  return (
    <div className="bg-muted/20 border-border/45 min-h-0 rounded-md border p-2">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="text-muted-foreground size-3.5" />
        <p className="text-[12px] font-medium">{title}</p>
      </div>
      <ScrollArea className="h-[16rem]">
        <div className="space-y-1">
          {items.length ? (
            items.map((item) => {
              const key = getKey(item);
              const isChecked = selected.includes(key);

              return (
                <label
                  key={key}
                  className="hover:bg-muted/45 flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1.5"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggle(key)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] leading-none">
                      {getLabel(item)}
                    </span>
                    {getMeta ? (
                      <span className="text-muted-foreground mt-1 block truncate text-[11px]">
                        {getMeta(item)}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="text-muted-foreground px-1.5 py-2 text-[11px]">
              {emptyLabel}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default JamsPage;
