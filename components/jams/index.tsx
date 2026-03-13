"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Hash,
  Users,
  UsersRound,
  X,
  Loader,
  Magnet,
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
  const isRoutedCanvasMode = Boolean(routeJamId && routeJamId.trim());
  const [activeJamId, setActiveJamId] = React.useState(
    routeJamId?.trim() || "",
  );
  const [isCanvasFocusMode, setIsCanvasFocusMode] =
    React.useState(isRoutedCanvasMode);
  const [isSnapEnabled, setIsSnapEnabled] = React.useState(true);

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
              {activeJam && !activeJam.canEdit ? (
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
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {jamDetailQuery.isLoading || !activeJam ? (
              <LoaderComponent />
            ) : (
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

type JamPreviewPoint = { x: number; y: number };
type JamPreviewElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  points: JamPreviewPoint[];
  text: string;
  fontSize: number;
};

const toFinite = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPreviewPoints = (value: unknown): JamPreviewPoint[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) {
        return null;
      }

      const x = toFinite(point[0], 0);
      const y = toFinite(point[1], 0);
      return { x, y };
    })
    .filter((entry): entry is JamPreviewPoint => !!entry);
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
      type: String(element?.type || "rectangle"),
      x: toFinite(element?.x, 0),
      y: toFinite(element?.y, 0),
      width: toFinite(element?.width, 0),
      height: toFinite(element?.height, 0),
      strokeColor:
        typeof element?.strokeColor === "string"
          ? element.strokeColor
          : "#8f8f8f",
      backgroundColor:
        typeof element?.backgroundColor === "string"
          ? element.backgroundColor
          : "transparent",
      strokeWidth: Math.max(1, toFinite(element?.strokeWidth, 1)),
      points: toPreviewPoints(element?.points),
      text: typeof element?.text === "string" ? element.text : "",
      fontSize: Math.max(10, toFinite(element?.fontSize, 16)),
    }))
    .slice(0, 120);
};

const getPreviewElementBounds = (element: JamPreviewElement) => {
  const isPathLike =
    element.type === "line" ||
    element.type === "arrow" ||
    element.type === "draw" ||
    element.type === "freedraw";

  if (isPathLike && element.points.length > 0) {
    const first = element.points[0];
    const initial = {
      minX: element.x + first.x,
      minY: element.y + first.y,
      maxX: element.x + first.x,
      maxY: element.y + first.y,
    };

    return element.points.slice(1).reduce((acc, point) => {
      const absoluteX = element.x + point.x;
      const absoluteY = element.y + point.y;
      return {
        minX: Math.min(acc.minX, absoluteX),
        minY: Math.min(acc.minY, absoluteY),
        maxX: Math.max(acc.maxX, absoluteX),
        maxY: Math.max(acc.maxY, absoluteY),
      };
    }, initial);
  }

  const computedWidth =
    Math.abs(element.width) > 0
      ? element.width
      : element.type === "text"
        ? Math.max(12, element.text.length * (element.fontSize * 0.55))
        : 6;
  const computedHeight =
    Math.abs(element.height) > 0
      ? element.height
      : element.type === "text"
        ? Math.max(12, element.fontSize * 1.4)
        : 6;

  const x2 = element.x + computedWidth;
  const y2 = element.y + computedHeight;
  return {
    minX: Math.min(element.x, x2),
    minY: Math.min(element.y, y2),
    maxX: Math.max(element.x, x2),
    maxY: Math.max(element.y, y2),
  };
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
    (acc, element) => {
      const elementBounds = getPreviewElementBounds(element);
      return {
        minX: Math.min(acc.minX, elementBounds.minX),
        minY: Math.min(acc.minY, elementBounds.minY),
        maxX: Math.max(acc.maxX, elementBounds.maxX),
        maxY: Math.max(acc.maxY, elementBounds.maxY),
      };
    },
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
      className="absolute inset-0 h-full w-full opacity-85"
      preserveAspectRatio="xMidYMid meet"
    >
      {elements.map((element) => {
        const mapX = (value: number) =>
          ((value - bounds.minX) / widthSpan) * 88 + 6;
        const mapY = (value: number) =>
          ((value - bounds.minY) / heightSpan) * 48 + 6;
        const strokeWidth = Math.max(0.5, element.strokeWidth * 0.35);
        const fill =
          element.backgroundColor && element.backgroundColor !== "transparent"
            ? element.backgroundColor
            : "none";

        const rectBounds = getPreviewElementBounds(element);
        const x = mapX(rectBounds.minX);
        const y = mapY(rectBounds.minY);
        const width = Math.max(1.8, mapX(rectBounds.maxX) - x);
        const height = Math.max(1.8, mapY(rectBounds.maxY) - y);

        if (element.type === "text") {
          const previewText = element.text.replace(/\n+/g, " ").trim();
          if (!previewText) {
            return null;
          }

          return (
            <text
              key={element.id}
              x={x}
              y={
                y +
                Math.max(3, Math.min(8, (element.fontSize / heightSpan) * 48))
              }
              fill={element.strokeColor || "#e5e7eb"}
              fontSize={Math.max(2.8, (element.fontSize / heightSpan) * 48)}
              fontWeight={500}
              className="select-none"
            >
              {previewText.slice(0, 120)}
            </text>
          );
        }

        if (
          element.type === "line" ||
          element.type === "arrow" ||
          element.type === "draw" ||
          element.type === "freedraw"
        ) {
          if (!element.points.length) {
            return null;
          }

          const points = element.points
            .map(
              (point) =>
                `${mapX(element.x + point.x)},${mapY(element.y + point.y)}`,
            )
            .join(" ");

          return (
            <polyline
              key={element.id}
              points={points}
              fill="none"
              stroke={element.strokeColor || "#a1a1aa"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
            />
          );
        }

        if (element.type === "ellipse") {
          return (
            <ellipse
              key={element.id}
              cx={x + width / 2}
              cy={y + height / 2}
              rx={Math.max(1.2, width / 2)}
              ry={Math.max(1.2, height / 2)}
              fill={fill}
              stroke={element.strokeColor || "#a1a1aa"}
              strokeWidth={strokeWidth}
              opacity={0.92}
            />
          );
        }

        if (element.type === "diamond") {
          const cx = x + width / 2;
          const cy = y + height / 2;
          return (
            <polygon
              key={element.id}
              points={`${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`}
              fill={fill}
              stroke={element.strokeColor || "#a1a1aa"}
              strokeWidth={strokeWidth}
              opacity={0.92}
            />
          );
        }

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
            strokeWidth={strokeWidth}
            opacity={0.92}
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
        className="relative h-46 w-full text-left"
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

export default JamsPage;
