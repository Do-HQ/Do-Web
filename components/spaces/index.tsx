"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Building2,
  Bell,
  Menu,
  MessageSquareText,
  Pin,
  Phone,
  Plus,
  Search,
  Video,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { useFavoritesStore } from "@/stores";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceSpace from "@/hooks/use-workspace-space";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useFile from "@/hooks/use-file";
import { recordRecentVisit } from "@/lib/helpers/recent-visits";
import { getWorkspaceJamDetail } from "@/lib/services/workspace-jam-service";
import { ROUTES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SpaceMessageDeletedEventPayload,
  SpaceMessageEventPayload,
  getTeamCallRoomStatus,
  getSpacesSocket,
  subscribeWorkspaceSpaces,
  subscribeSpaceRoom,
  unsubscribeWorkspaceSpaces,
  unsubscribeSpaceRoom,
} from "@/lib/realtime/spaces-socket";
import CreateChatDialog from "./components/create-chat-dialog";
import ForwardMessageDialog from "./components/forward-message-dialog";
import MainChatPanel from "./components/main-chat-panel";
import RoomItems from "./components/room-items";
import TeamCallWidget from "./components/team-call-widget";
import ThreadPanel from "./components/thread-panel";
import WorkspaceDetailsDialog from "./components/workspace-details-dialog";
import { SCOPE_META, TEAM_CALL_WIDGET_KEY } from "./constants";
import type {
  ChatAttachment,
  ChatAuthor,
  MentionTokenMeta,
  MentionSuggestion,
  SpaceMessageReaction,
  SpaceUserInfo,
  SpaceMessage,
  SpaceRoom,
  ThreadReply,
  TeamCallWidgetState,
} from "./types";
import {
  clamp,
  createId,
  getInitials,
  isDirectRoom,
  parseTeamCallWidget,
} from "./utils";
import type {
  WorkspaceSpaceKeepUpItem,
  WorkspaceSpaceMessageRecord,
  WorkspaceSpaceRoomRecord,
} from "@/types/space";
import LoaderComponent from "../shared/loader";
import { useDebounce } from "@/hooks/use-debounce";

const roomQueryParams = {
  limit: 30,
} as const;

const messageQueryParams = {
  limit: 30,
} as const;

type ForwardMessageSource = Pick<SpaceMessage, "author" | "content" | "attachments">;

const formatChatTimestamp = (value?: string) => {
  if (!value) {
    return "now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "now";
  }

  const now = new Date();
  const isSameDay = now.toDateString() === date.toDateString();

  if (isSameDay) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const buildTeamCallRoute = ({
  roomId,
  roomName,
  roomScope,
  roomKind,
  directUserId,
  callMode,
  startedAt,
}: {
  roomId: string;
  roomName: string;
  roomScope: string;
  roomKind?: "direct" | "group" | "project" | "task";
  directUserId?: string;
  callMode: "voice" | "video";
  startedAt: number;
}) => {
  const query = new URLSearchParams({
    roomId: String(roomId || ""),
    room: String(roomName || "Team Call"),
    scope: String(roomScope || "team"),
    roomKind: String(roomKind || "group"),
    callMode: callMode === "voice" ? "voice" : "video",
    startedAt: String(startedAt || Date.now()),
  });

  const normalizedDirectUserId = String(directUserId || "").trim();
  if (normalizedDirectUserId) {
    query.set("directUserId", normalizedDirectUserId);
  }

  return `${ROUTES.SPACES_TEAM_CALL}?${query.toString()}`;
};

const mentionSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const mentionInitials = (value: string, fallback = "U") => {
  const normalized = String(value || "")
    .replace(/^(team|project)\s*:/i, "")
    .trim();

  if (!normalized) {
    return fallback;
  }

  const letters = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return letters || fallback;
};

const normalizeAuthor = (
  author: WorkspaceSpaceMessageRecord["author"],
): ChatAuthor => ({
  id: String(author?.id || ""),
  name: String(author?.name || "Unknown"),
  initials: String(author?.initials || "U"),
  avatarUrl: String(author?.avatarUrl || "") || undefined,
  role: author?.role === "agent" ? "agent" : "member",
});

const mapRoomToUi = (room: WorkspaceSpaceRoomRecord): SpaceRoom => ({
  id: String(room.id),
  kind: room.kind,
  name: String(room.name || ""),
  scope: room.scope,
  visibility: room.visibility,
  members: Number(room.members || 0),
  unread: Number(room.unread || 0),
  topic: String(room.topic || ""),
  avatarUrl: String(room.avatarUrl || "").trim() || undefined,
  avatarFallback: String(room.avatarFallback || "").trim() || undefined,
  meta: {
    projectId: room.meta?.projectId || null,
    workflowId: room.meta?.workflowId || null,
    taskId: room.meta?.taskId || null,
    customColor: room.meta?.customColor || null,
    directUserId: room.meta?.directUserId || null,
  },
});

const findProjectRootRoom = (rooms: SpaceRoom[], projectId: string) => {
  const normalizedProjectId = String(projectId || "").trim();
  if (!normalizedProjectId) {
    return null;
  }

  return (
    rooms.find(
      (room) =>
        room.scope === "project" &&
        String(room.meta?.projectId || "") === normalizedProjectId,
    ) || null
  );
};

const mapMessageToUi = (
  message: WorkspaceSpaceMessageRecord,
): SpaceMessage => ({
  id: String(message.id),
  roomId: String(message.roomId),
  parentMessageId: message.parentMessageId,
  author: normalizeAuthor(message.author),
  content: String(message.content || ""),
  sentAt: formatChatTimestamp(message.sentAt),
  sentAtRaw: String(message.sentAt || ""),
  edited: Boolean(message.edited),
  attachments: Array.isArray(message.attachments)
    ? message.attachments.map((attachment) => ({
        id: String(attachment.id),
        name: String(attachment.name),
        kind: attachment.kind,
        url: attachment.url || undefined,
      }))
    : [],
  reactions: Array.isArray(message.reactions)
    ? message.reactions.map((reaction) => ({
        emoji: String(reaction.emoji || ""),
        count: Number(reaction.count || 0),
        reacted: Boolean(reaction.reacted),
      }))
    : [],
  isPinned: Boolean(message.isPinned),
  pinnedAt: message.pinnedAt ? String(message.pinnedAt) : null,
  threadCount: Number(message.threadCount || 0),
});

const resolveIsoTimestamp = (value?: string) => {
  const parsed = new Date(String(value || "").trim()).getTime();
  if (!Number.isFinite(parsed)) {
    return Date.now();
  }

  return parsed;
};

const normalizeReactionEntries = (
  reactions?: SpaceMessageReaction[],
): SpaceMessageReaction[] => {
  if (!Array.isArray(reactions)) {
    return [];
  }

  return reactions
    .map((reaction) => ({
      emoji: String(reaction?.emoji || ""),
      count: Math.max(0, Number(reaction?.count || 0)),
      reacted: Boolean(reaction?.reacted),
    }))
    .filter((reaction) => reaction.emoji.length > 0 && reaction.count > 0);
};

const toggleReactionEntries = (
  reactions: SpaceMessageReaction[] | undefined,
  emoji: string,
): SpaceMessageReaction[] => {
  const normalizedEmoji = String(emoji || "").trim();
  if (!normalizedEmoji) {
    return normalizeReactionEntries(reactions);
  }

  const current = normalizeReactionEntries(reactions);
  const index = current.findIndex((entry) => entry.emoji === normalizedEmoji);

  if (index < 0) {
    return [
      ...current,
      {
        emoji: normalizedEmoji,
        count: 1,
        reacted: true,
      },
    ];
  }

  const target = current[index];
  if (target.reacted) {
    const nextCount = Math.max(0, target.count - 1);
    if (nextCount === 0) {
      return current.filter((_, entryIndex) => entryIndex !== index);
    }

    return current.map((entry, entryIndex) =>
      entryIndex === index
        ? {
            ...entry,
            count: nextCount,
            reacted: false,
          }
        : entry,
    );
  }

  return current.map((entry, entryIndex) =>
    entryIndex === index
      ? {
          ...entry,
          count: entry.count + 1,
          reacted: true,
        }
      : entry,
  );
};

const reactionSignature = (reactions?: SpaceMessageReaction[]) =>
  JSON.stringify(
    normalizeReactionEntries(reactions)
      .slice()
      .sort((left, right) => left.emoji.localeCompare(right.emoji))
      .map((reaction) => ({
        emoji: reaction.emoji,
        count: reaction.count,
        reacted: reaction.reacted,
      })),
  );

const SpacesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const setFavoritesWorkspaceScope = useFavoritesStore(
    (state) => state.setWorkspaceScope,
  );
  const workspaceHook = useWorkspace();
  const spaceHook = useWorkspaceSpace();
  const workspaceProjectHook = useWorkspaceProject();
  const fileHook = useFile();

  const resolvedWorkspaceId =
    workspaceId || String(user?.currentWorkspaceId?._id || "");

  useEffect(() => {
    setFavoritesWorkspaceScope(resolvedWorkspaceId);
  }, [resolvedWorkspaceId, setFavoritesWorkspaceScope]);

  const [roomQuery, setRoomQuery] = useState("");
  const [activeRoomId, setActiveRoomId] = useState("");
  const [selectedThreadMessageId, setSelectedThreadMessageId] = useState<
    string | null
  >(null);

  const [composer, setComposer] = useState("");
  const [threadComposer, setThreadComposer] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<
    ChatAttachment[]
  >([]);
  const [threadAttachments, setThreadAttachments] = useState<ChatAttachment[]>(
    [],
  );
  const [optimisticMessagesByRoom, setOptimisticMessagesByRoom] = useState<
    Record<string, SpaceMessage[]>
  >({});
  const [roomActivityOverrides, setRoomActivityOverrides] = useState<
    Record<string, number>
  >({});
  const [
    optimisticThreadRepliesByMessage,
    setOptimisticThreadRepliesByMessage,
  ] = useState<Record<string, ThreadReply[]>>({});
  const [optimisticReactionsByMessageId, setOptimisticReactionsByMessageId] =
    useState<Record<string, SpaceMessageReaction[]>>({});
  const [optimisticPinnedByMessageId, setOptimisticPinnedByMessageId] =
    useState<Record<string, boolean>>({});

  const [leftPanelWidth, setLeftPanelWidth] = useState(304);
  const [threadPanelWidth, setThreadPanelWidth] = useState(392);
  const [resizingPane, setResizingPane] = useState<"left" | "thread" | null>(
    null,
  );

  const [isRoomsSheetOpen, setIsRoomsSheetOpen] = useState(false);
  const [isThreadSheetOpen, setIsThreadSheetOpen] = useState(false);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [isWorkspaceDetailsOpen, setIsWorkspaceDetailsOpen] = useState(false);
  const [isKeepUpOpen, setIsKeepUpOpen] = useState(false);
  const [isPinsSheetOpen, setIsPinsSheetOpen] = useState(false);
  const [keepUpPage, setKeepUpPage] = useState(1);
  const [keepUpSearch, setKeepUpSearch] = useState("");
  const [anchorMessageId, setAnchorMessageId] = useState<string | null>(null);

  const [teamCallWidget, setTeamCallWidget] =
    useState<TeamCallWidgetState | null>(null);
  const [teamCallDurationSeconds, setTeamCallDurationSeconds] = useState(0);
  const [activeRoomCallStatus, setActiveRoomCallStatus] = useState<{
    active: boolean;
    route?: string;
    startedAt?: number;
    roomKind?: "direct" | "group" | "project" | "task";
    directUserId?: string;
    callMode?: "voice" | "video";
    participants?: number;
  } | null>(null);

  const [pinnedReplyIds, setPinnedReplyIds] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyValue, setEditingReplyValue] = useState("");

  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [newChatGroupName, setNewChatGroupName] = useState("");
  const [newChatSearch, setNewChatSearch] = useState("");
  const [forwardSearch, setForwardSearch] = useState("");
  const [selectedForwardTargetId, setSelectedForwardTargetId] = useState("");
  const [forwardMessageSource, setForwardMessageSource] =
    useState<ForwardMessageSource | null>(null);
  const [selectedCreateMemberIds, setSelectedCreateMemberIds] = useState<
    string[]
  >([]);

  const mainComposerUploadRef = useRef<HTMLInputElement | null>(null);
  const threadComposerUploadRef = useRef<HTMLInputElement | null>(null);
  const roomListDesktopRef = useRef<HTMLDivElement | null>(null);
  const roomListSheetRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const beforeOlderLoadScrollHeightRef = useRef(0);
  const beforeOlderLoadScrollTopRef = useRef(0);
  const suppressMessagePaginationUntilRef = useRef(0);
  const lastMessageScrollTopRef = useRef(0);
  const autoScrollToBottomRef = useRef(true);
  const recentSocketEventRef = useRef<Map<string, number>>(new Map());
  const selectedThreadMessageIdRef = useRef<string | null>(null);
  const missingProjectRoomToastRef = useRef<string | null>(null);
  const lastMarkedReadRef = useRef<{
    workspaceId: string;
    roomId: string;
    at: number;
  } | null>(null);
  const didHydrateRoomFromUrlRef = useRef(false);
  const pendingRoomSyncRef = useRef<string | null>(null);
  const suppressedThreadIdRef = useRef<string | null>(null);

  const workspaceName = user?.currentWorkspaceId?.name ?? "Current Workspace";
  const workspaceSlug = user?.currentWorkspaceId?.slug ?? "workspace";
  const workspaceType = user?.currentWorkspaceId?.type ?? "private";
  const workspaceMembers = user?.currentWorkspaceId?.members?.length ?? 0;

  const currentUser = useMemo<ChatAuthor>(() => {
    return {
      id: user?._id ?? "me",
      name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "You",
      initials: getInitials(user?.firstName, user?.lastName, user?.email),
      avatarUrl: user?.profilePhoto?.url,
      role: "member",
    };
  }, [
    user?._id,
    user?.email,
    user?.firstName,
    user?.lastName,
    user?.profilePhoto?.url,
  ]);

  // Debounce
  const debounced_search = useDebounce(roomQuery, 500);

  const roomsQuery = spaceHook.useWorkspaceSpaceRoomsInfinite(
    resolvedWorkspaceId,
    {
      search: debounced_search,
      kind: "all",
    },
    {
      enabled: Boolean(resolvedWorkspaceId),
      limit: roomQueryParams.limit,
    },
  );

  // Debounce
  const debouncedNewSearch = useDebounce(newChatSearch, 500);

  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(
    resolvedWorkspaceId,
    {
      page: 1,
      limit: 200,
      search: debouncedNewSearch,
    },
  );
  const workspaceMentionPeopleQuery = workspaceHook.useWorkspacePeople(
    resolvedWorkspaceId,
    {
      page: 1,
      limit: 200,
      search: "",
    },
  );

  const rooms = useMemo(() => {
    const pages = roomsQuery.data?.pages ?? [];
    const roomMap = new Map<string, WorkspaceSpaceRoomRecord>();

    pages.forEach((page) => {
      (page.data?.rooms || []).forEach((room) => {
        roomMap.set(String(room.id), room);
      });
    });

    const toTimestamp = (value?: string) => {
      const parsed = new Date(String(value || "").trim()).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Array.from(roomMap.values())
      .sort((left, right) => {
        const rightTime = Math.max(
          Number(roomActivityOverrides[String(right.id)]) || 0,
          toTimestamp(right.updatedAt),
          toTimestamp(right.createdAt),
        );
        const leftTime = Math.max(
          Number(roomActivityOverrides[String(left.id)]) || 0,
          toTimestamp(left.updatedAt),
          toTimestamp(left.createdAt),
        );

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      })
      .map(mapRoomToUi);
  }, [roomActivityOverrides, roomsQuery.data?.pages]);
  const bumpRoomActivity = useCallback((roomId: string, at = Date.now()) => {
    const normalizedRoomId = String(roomId || "").trim();
    if (!normalizedRoomId) {
      return;
    }

    setRoomActivityOverrides((current) => {
      const previous = Number(current[normalizedRoomId]) || 0;
      const next = Math.max(previous, at);
      if (next === previous) {
        return current;
      }

      return {
        ...current,
        [normalizedRoomId]: next,
      };
    });
  }, []);
  const hasRooms = rooms.length > 0;
  const hasMoreRooms = Boolean(roomsQuery.hasNextPage);
  const isLoadingMoreRooms = Boolean(roomsQuery.isFetchingNextPage);
  const searchParamsString = searchParams.toString();
  const urlRoomId = String(searchParams.get("room") || "").trim();
  const urlThreadId = String(searchParams.get("thread") || "").trim();
  const urlProjectId = String(searchParams.get("project") || "").trim();

  useEffect(() => {
    if (!rooms.length) {
      setActiveRoomId("");
      setSelectedThreadMessageId(null);
      didHydrateRoomFromUrlRef.current = false;
      pendingRoomSyncRef.current = null;
      return;
    }

    if (!didHydrateRoomFromUrlRef.current) {
      didHydrateRoomFromUrlRef.current = true;

      if (urlRoomId && rooms.some((room) => room.id === urlRoomId)) {
        setActiveRoomId(urlRoomId);
        return;
      }

      if (urlProjectId) {
        const projectRoom = findProjectRootRoom(rooms, urlProjectId);

        if (projectRoom) {
          setActiveRoomId(projectRoom.id);
          return;
        }
      }

      setActiveRoomId(rooms[0].id);
      return;
    }

    if (!activeRoomId) {
      setActiveRoomId(rooms[0].id);
      setSelectedThreadMessageId(null);
      return;
    }

    if (!rooms.some((room) => room.id === activeRoomId)) {
      if (
        pendingRoomSyncRef.current &&
        pendingRoomSyncRef.current === activeRoomId
      ) {
        return;
      }

      setActiveRoomId(rooms[0].id);
      setSelectedThreadMessageId(null);
    }
  }, [activeRoomId, rooms, urlProjectId, urlRoomId]);

  const activeRoom = useMemo(() => {
    return rooms.find((room) => room.id === activeRoomId) ?? null;
  }, [activeRoomId, rooms]);

  useEffect(() => {
    const scopedWorkspaceId = String(resolvedWorkspaceId || "").trim();
    const roomId = String(activeRoom?.id || "").trim();

    if (!scopedWorkspaceId || !roomId) {
      return;
    }

    recordRecentVisit({
      workspaceId: scopedWorkspaceId,
      key: `space:${roomId}`,
      kind: "space",
      href: `${ROUTES.SPACES}?room=${encodeURIComponent(roomId)}`,
    });
  }, [activeRoom?.id, resolvedWorkspaceId]);

  const activeProjectId = String(activeRoom?.meta?.projectId || "").trim();
  const activeProjectDetailQuery =
    workspaceProjectHook.useWorkspaceProjectDetail(
      resolvedWorkspaceId,
      activeProjectId,
      {
        enabled: Boolean(resolvedWorkspaceId && activeProjectId),
      },
    );

  const messagesQuery = spaceHook.useWorkspaceSpaceRoomMessagesInfinite(
    resolvedWorkspaceId,
    activeRoom?.id || "",
    {
      enabled: Boolean(resolvedWorkspaceId && activeRoom?.id),
      limit: messageQueryParams.limit,
    },
  );

  const serverMessages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const orderedPages = pages.slice().reverse();
    const items = orderedPages.flatMap((page) => page.data?.messages || []);
    return items.map(mapMessageToUi);
  }, [messagesQuery.data?.pages]);

  const activeMessages = useMemo(() => {
    const roomId = activeRoom?.id || "";
    const optimisticMessages = optimisticMessagesByRoom[roomId] || [];
    const combined = [...serverMessages, ...optimisticMessages];
    const messageMap = new Map<string, SpaceMessage>();

    combined.forEach((message) => {
      messageMap.set(message.id, message);
    });

    return Array.from(messageMap.values()).map((message) => {
      const overrideReactions = optimisticReactionsByMessageId[message.id];
      const overridePinned = optimisticPinnedByMessageId[message.id];

      if (!overrideReactions && typeof overridePinned === "undefined") {
        return message;
      }

      return {
        ...message,
        reactions: overrideReactions || message.reactions,
        isPinned:
          typeof overridePinned === "undefined"
            ? Boolean(message.isPinned)
            : Boolean(overridePinned),
      };
    });
  }, [
    activeRoom?.id,
    optimisticMessagesByRoom,
    optimisticPinnedByMessageId,
    optimisticReactionsByMessageId,
    serverMessages,
  ]);

  const selectedThreadMessage = useMemo(() => {
    return (
      activeMessages.find(
        (message) => message.id === selectedThreadMessageId,
      ) ?? null
    );
  }, [activeMessages, selectedThreadMessageId]);

  useEffect(() => {
    setAnchorMessageId(null);
    setIsPinsSheetOpen(false);
  }, [activeRoom?.id]);

  useEffect(() => {
    if (!urlProjectId || urlRoomId || !rooms.length) {
      missingProjectRoomToastRef.current = null;
      return;
    }

    const projectRoom = findProjectRootRoom(rooms, urlProjectId);

    if (projectRoom) {
      if (projectRoom.id !== activeRoomId) {
        pendingRoomSyncRef.current = projectRoom.id;
        setActiveRoomId(projectRoom.id);
      }
      missingProjectRoomToastRef.current = null;
      return;
    }

    if (missingProjectRoomToastRef.current === urlProjectId) {
      return;
    }

    missingProjectRoomToastRef.current = urlProjectId;
    toast("Project chat room not found yet in this workspace.");
  }, [activeRoomId, rooms, urlProjectId, urlRoomId]);

  useEffect(() => {
    const wantsRoom = Boolean(urlRoomId);
    const wantsProjectRoom = Boolean(urlProjectId) && !urlRoomId;

    if (!wantsRoom && !wantsProjectRoom) {
      return;
    }

    const hasTargetRoom = wantsRoom
      ? rooms.some((room) => room.id === urlRoomId)
      : Boolean(findProjectRootRoom(rooms, urlProjectId));

    if (hasTargetRoom || !hasMoreRooms || isLoadingMoreRooms) {
      return;
    }

    void roomsQuery.fetchNextPage();
  }, [
    rooms,
    hasMoreRooms,
    isLoadingMoreRooms,
    roomsQuery,
    roomsQuery.fetchNextPage,
    urlProjectId,
    urlRoomId,
  ]);

  useEffect(() => {
    if (!activeRoom?.id || !urlThreadId) {
      if (!urlThreadId) {
        suppressedThreadIdRef.current = null;
      }
      return;
    }

    if (
      suppressedThreadIdRef.current &&
      suppressedThreadIdRef.current === urlThreadId
    ) {
      return;
    }

    if (selectedThreadMessageId === urlThreadId) {
      return;
    }

    if (
      !selectedThreadMessageId &&
      activeMessages.some((message) => message.id === urlThreadId)
    ) {
      setSelectedThreadMessageId(urlThreadId);
    }
  }, [activeMessages, activeRoom?.id, selectedThreadMessageId, urlThreadId]);

  useEffect(() => {
    if (!didHydrateRoomFromUrlRef.current) {
      return;
    }

    if (!urlRoomId || !rooms.some((room) => room.id === urlRoomId)) {
      return;
    }

    if (urlRoomId === activeRoomId) {
      if (pendingRoomSyncRef.current === urlRoomId) {
        pendingRoomSyncRef.current = null;
      }
      return;
    }

    if (
      pendingRoomSyncRef.current &&
      pendingRoomSyncRef.current !== urlRoomId
    ) {
      return;
    }

    setActiveRoomId(urlRoomId);
    setSelectedThreadMessageId(null);
  }, [activeRoomId, rooms, urlRoomId]);

  const threadRepliesQuery = spaceHook.useWorkspaceSpaceThreadReplies(
    resolvedWorkspaceId,
    activeRoom?.id || "",
    selectedThreadMessage?.id || "",
    messageQueryParams,
    {
      enabled: Boolean(
        resolvedWorkspaceId && activeRoom?.id && selectedThreadMessage?.id,
      ),
    },
  );

  const serverThreadReplies = useMemo<ThreadReply[]>(() => {
    const replies = threadRepliesQuery.data?.data?.replies ?? [];

    return replies.map((reply) => {
      const mapped = mapMessageToUi(reply);
      return {
        id: mapped.id,
        messageId: mapped.parentMessageId || "",
        author: mapped.author,
        content: mapped.content,
        sentAt: mapped.sentAt,
        sentAtRaw: mapped.sentAtRaw,
        edited: mapped.edited,
        attachments: mapped.attachments,
        reactions: mapped.reactions,
      };
    });
  }, [threadRepliesQuery.data?.data?.replies]);

  const activeThreadReplies = useMemo<ThreadReply[]>(() => {
    const threadId = selectedThreadMessage?.id || "";
    const optimisticReplies = optimisticThreadRepliesByMessage[threadId] || [];
    const combined = [...serverThreadReplies, ...optimisticReplies];
    const replyMap = new Map<string, ThreadReply>();

    combined.forEach((reply) => {
      replyMap.set(reply.id, reply);
    });

    return Array.from(replyMap.values()).map((reply) => {
      const overrideReactions = optimisticReactionsByMessageId[reply.id];
      if (!overrideReactions) {
        return reply;
      }

      return {
        ...reply,
        reactions: overrideReactions,
      };
    });
  }, [
    optimisticReactionsByMessageId,
    optimisticThreadRepliesByMessage,
    selectedThreadMessage?.id,
    serverThreadReplies,
  ]);

  useEffect(() => {
    if (!Object.keys(optimisticReactionsByMessageId).length) {
      return;
    }

    const serverReactionByMessageId = new Map<string, SpaceMessageReaction[]>();

    serverMessages.forEach((message) => {
      serverReactionByMessageId.set(message.id, message.reactions || []);
    });

    serverThreadReplies.forEach((reply) => {
      serverReactionByMessageId.set(reply.id, reply.reactions || []);
    });

    setOptimisticReactionsByMessageId((prev) => {
      const next = { ...prev };
      let hasChange = false;

      Object.entries(prev).forEach(([messageId, reactions]) => {
        if (!serverReactionByMessageId.has(messageId)) {
          return;
        }

        const serverReactions = serverReactionByMessageId.get(messageId) || [];
        if (reactionSignature(reactions) === reactionSignature(serverReactions)) {
          delete next[messageId];
          hasChange = true;
        }
      });

      return hasChange ? next : prev;
    });
  }, [optimisticReactionsByMessageId, serverMessages, serverThreadReplies]);

  useEffect(() => {
    if (!Object.keys(optimisticPinnedByMessageId).length) {
      return;
    }

    const serverPinnedByMessageId = new Map<string, boolean>();
    serverMessages.forEach((message) => {
      serverPinnedByMessageId.set(message.id, Boolean(message.isPinned));
    });

    setOptimisticPinnedByMessageId((prev) => {
      const next = { ...prev };
      let hasChange = false;

      Object.entries(prev).forEach(([messageId, isPinned]) => {
        if (!serverPinnedByMessageId.has(messageId)) {
          return;
        }

        if (Boolean(isPinned) === Boolean(serverPinnedByMessageId.get(messageId))) {
          delete next[messageId];
          hasChange = true;
        }
      });

      return hasChange ? next : prev;
    });
  }, [optimisticPinnedByMessageId, serverMessages]);

  useEffect(() => {
    if (!activeRoom?.id) {
      return;
    }

    if (!serverMessages.length) {
      return;
    }

    const serverMessageIds = new Set(
      serverMessages.map((message) => message.id),
    );

    setOptimisticMessagesByRoom((prev) => {
      const current = prev[activeRoom.id] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.filter(
        (message) => !serverMessageIds.has(message.id),
      );
      if (next.length === current.length) {
        return prev;
      }

      const cloned = { ...prev };
      if (next.length) {
        cloned[activeRoom.id] = next;
      } else {
        delete cloned[activeRoom.id];
      }
      return cloned;
    });
  }, [activeRoom?.id, serverMessages]);

  useEffect(() => {
    if (!selectedThreadMessage?.id) {
      return;
    }

    if (!serverThreadReplies.length) {
      return;
    }

    const serverReplyIds = new Set(
      serverThreadReplies.map((reply) => reply.id),
    );

    setOptimisticThreadRepliesByMessage((prev) => {
      const current = prev[selectedThreadMessage.id] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.filter((reply) => !serverReplyIds.has(reply.id));
      if (next.length === current.length) {
        return prev;
      }

      const cloned = { ...prev };
      if (next.length) {
        cloned[selectedThreadMessage.id] = next;
      } else {
        delete cloned[selectedThreadMessage.id];
      }
      return cloned;
    });
  }, [selectedThreadMessage?.id, serverThreadReplies]);

  const keepUpQuery = spaceHook.useWorkspaceSpaceKeepUp(
    resolvedWorkspaceId,
    {
      page: keepUpPage,
      limit: 20,
    },
    {
      enabled: Boolean(resolvedWorkspaceId && isKeepUpOpen),
    },
  );

  const keepUpBadgeQuery = spaceHook.useWorkspaceSpaceKeepUp(
    resolvedWorkspaceId,
    {
      page: 1,
      limit: 1,
    },
    {
      enabled: Boolean(resolvedWorkspaceId),
    },
  );

  const pinnedMessagesQuery = spaceHook.useWorkspaceSpacePinnedMessages(
    resolvedWorkspaceId,
    activeRoom?.id || "",
    {
      page: 1,
      limit: 100,
    },
    {
      enabled: Boolean(resolvedWorkspaceId && activeRoom?.id),
    },
  );

  const createRoomMutation = spaceHook.useCreateWorkspaceSpaceRoom();
  const createMessageMutation = spaceHook.useCreateWorkspaceSpaceMessage();
  const updateMessageMutation = spaceHook.useUpdateWorkspaceSpaceMessage();
  const deleteMessageMutation = spaceHook.useDeleteWorkspaceSpaceMessage();
  const toggleMessageReactionMutation =
    spaceHook.useToggleWorkspaceSpaceMessageReaction();
  const toggleMessagePinMutation = spaceHook.useToggleWorkspaceSpaceMessagePin();
  const createThreadReplyMutation =
    spaceHook.useCreateWorkspaceSpaceThreadReply();
  const markReadMutation = spaceHook.useMarkWorkspaceSpaceRoomRead();
  const markKeepUpSeenMutation = spaceHook.useMarkWorkspaceSpaceKeepUpSeen();
  const uploadAssetMutation = fileHook.useUploadAsset();

  const isPersonalChat = activeRoom ? isDirectRoom(activeRoom) : false;
  const canSendMessage =
    composer.trim().length > 0 || composerAttachments.length > 0;
  const canSendThreadReply =
    threadComposer.trim().length > 0 || threadAttachments.length > 0;
  const canCreateTaskFromChat =
    activeRoom?.scope === "project" ||
    activeRoom?.scope === "workflow" ||
    activeRoom?.scope === "task";

  const keepUpCount = keepUpBadgeQuery.data?.data?.pagination?.total ?? 0;
  const pinnedMessages = useMemo(
    () => {
      const pinnedById = new Map<string, SpaceMessage>();

      (pinnedMessagesQuery.data?.data?.messages || [])
        .map(mapMessageToUi)
        .forEach((message) => {
          pinnedById.set(message.id, message);
        });

      activeMessages.forEach((message) => {
        if (message.isPinned) {
          pinnedById.set(message.id, message);
          return;
        }

        if (pinnedById.has(message.id)) {
          pinnedById.delete(message.id);
        }
      });

      return Array.from(pinnedById.values()).sort((left, right) => {
        const rightTs = resolveIsoTimestamp(right.pinnedAt || right.sentAtRaw);
        const leftTs = resolveIsoTimestamp(left.pinnedAt || left.sentAtRaw);
        return rightTs - leftTs;
      });
    },
    [activeMessages, pinnedMessagesQuery.data?.data?.messages],
  );
  const pinnedMessagesCount = pinnedMessages.length;
  const featuredPinnedMessage = pinnedMessages[0] || null;
  const keepUpItems = useMemo(
    () => keepUpQuery.data?.data?.items ?? [],
    [keepUpQuery.data?.data?.items],
  );
  const keepUpPagination = keepUpQuery.data?.data?.pagination;
  const keepUpFilteredItems = useMemo(() => {
    const query = keepUpSearch.trim().toLowerCase();
    if (!query) {
      return keepUpItems;
    }

    return keepUpItems.filter((item) => {
      const authorName = String(item.author?.name || "").toLowerCase();
      const roomName = String(item.roomName || "").toLowerCase();
      const content = String(item.content || "").toLowerCase();
      const parentPreview = String(
        item.parentMessagePreview || "",
      ).toLowerCase();

      return (
        authorName.includes(query) ||
        roomName.includes(query) ||
        content.includes(query) ||
        parentPreview.includes(query)
      );
    });
  }, [keepUpItems, keepUpSearch]);
  const hasOlderMessages = Boolean(messagesQuery.hasNextPage);
  const isLoadingOlderMessages = Boolean(messagesQuery.isFetchingNextPage);

  const createDialogMembers = useMemo(() => {
    const members = workspacePeopleQuery.data?.data?.members ?? [];

    return members
      .filter(
        (entry) =>
          String(entry?.userId?._id || "") !== String(currentUser.id || ""),
      )
      .map((entry) => ({
        id: String(entry.userId._id),
        name:
          `${entry?.userId?.firstName || ""} ${entry?.userId?.lastName || ""}`.trim() ||
          entry?.userId?.email ||
          "Unknown",
        email: String(entry?.userId?.email || ""),
      }));
  }, [workspacePeopleQuery.data?.data?.members, currentUser.id]);

  const forwardTargetOptions = useMemo(() => {
    const normalizedQuery = forwardSearch.trim().toLowerCase();
    const options: Array<{
      id: string;
      name: string;
      subtitle: string;
      kind: "person" | "group";
      avatarUrl?: string;
      avatarFallback?: string;
    }> = [];

    createDialogMembers.forEach((member) => {
      const matchSource = `${member.name} ${member.email}`.toLowerCase();
      if (normalizedQuery && !matchSource.includes(normalizedQuery)) {
        return;
      }

      options.push({
        id: `person:${member.id}`,
        name: member.name,
        subtitle: member.email || "Workspace member",
        kind: "person",
        avatarFallback: mentionInitials(member.name, "U"),
      });
    });

    rooms
      .filter((room) => !isDirectRoom(room))
      .forEach((room) => {
        const subtitle = `${room.scope} • ${room.visibility}`;
        const matchSource = `${room.name} ${subtitle}`.toLowerCase();
        if (normalizedQuery && !matchSource.includes(normalizedQuery)) {
          return;
        }

        options.push({
          id: `room:${room.id}`,
          name: room.name,
          subtitle,
          kind: "group",
          avatarUrl: room.avatarUrl,
          avatarFallback: room.avatarFallback || mentionInitials(room.name, "SP"),
        });
      });

    return options;
  }, [createDialogMembers, forwardSearch, rooms]);

  const mentionLookup = useMemo<{
    suggestions: MentionSuggestion[];
    byToken: Record<string, MentionTokenMeta>;
  }>(() => {
    const entries: MentionSuggestion[] = [];
    const byToken: Record<string, MentionTokenMeta> = {};
    const seenIds = new Set<string>();
    const members = workspaceMentionPeopleQuery.data?.data?.members ?? [];

    members.forEach((entry) => {
      const display =
        `${entry?.userId?.firstName || ""} ${entry?.userId?.lastName || ""}`.trim() ||
        entry?.userId?.email ||
        "Unknown";
      const emailAlias =
        String(entry?.userId?.email || "").split("@")[0] || display;
      const id = mentionSlug(display) || mentionSlug(emailAlias);

      if (!id) {
        return;
      }

      byToken[id] = {
        token: id,
        label: display,
        kind: "user",
        avatarUrl: String(entry?.userId?.profilePhoto?.url || "") || undefined,
        avatarFallback: getInitials(
          String(entry?.userId?.firstName || ""),
          String(entry?.userId?.lastName || ""),
          String(entry?.userId?.email || ""),
        ),
        subtitle: "Member",
        user: {
          id: String(entry?.userId?._id || ""),
          name: display,
          email: String(entry?.userId?.email || ""),
          avatarUrl:
            String(entry?.userId?.profilePhoto?.url || "") || undefined,
          role:
            Array.isArray(entry?.roles) && entry.roles.length
              ? entry.roles
                  .map((role) => String(role?.name || ""))
                  .filter(Boolean)
                  .join(", ")
              : "Member",
          team:
            Array.isArray(entry?.teams) && entry.teams.length
              ? entry.teams
                  .map((team) => String(team?.name || ""))
                  .filter(Boolean)
                  .join(", ")
              : undefined,
        },
      };

      if (String(entry?.userId?._id || "") === String(currentUser.id || "")) {
        return;
      }

      if (seenIds.has(id)) {
        return;
      }

      seenIds.add(id);
      const firstName = String(entry?.userId?.firstName || "");
      const lastName = String(entry?.userId?.lastName || "");
      const email = String(entry?.userId?.email || "");

      entries.push({
        id,
        display,
        kind: "user",
        avatarUrl: String(entry?.userId?.profilePhoto?.url || "") || undefined,
        avatarFallback: getInitials(firstName, lastName, email),
        subtitle: "Member",
      });
    });

    const projectName = String(
      activeProjectDetailQuery.data?.data?.project?.name ||
        activeRoom?.name ||
        "",
    ).trim();
    const projectId = mentionSlug(projectName);

    if (projectId && !seenIds.has(`project-${projectId}`)) {
      seenIds.add(`project-${projectId}`);
      entries.push({
        id: `project-${projectId}`,
        display: `project:${projectName || "current-project"}`,
        kind: "project",
        avatarFallback: mentionInitials(projectName || "project", "PR"),
        subtitle: "Project",
      });
      byToken[`project-${projectId}`] = {
        token: `project-${projectId}`,
        label: `project:${projectName || "current-project"}`,
        kind: "project",
        avatarFallback: mentionInitials(projectName || "project", "PR"),
        subtitle: "Project",
      };
    }

    const projectTeams =
      activeProjectDetailQuery.data?.data?.project?.record?.teams || [];

    projectTeams.forEach((team) => {
      const teamName = String(team?.name || "").trim();
      const teamSlug = mentionSlug(teamName);
      const id = `team-${teamSlug}`;

      if (!teamSlug || seenIds.has(id)) {
        return;
      }

      seenIds.add(id);
      entries.push({
        id,
        display: `team:${teamName}`,
        kind: "team",
        avatarFallback: mentionInitials(teamName, "T"),
        subtitle: "Team",
      });
      byToken[id] = {
        token: id,
        label: `team:${teamName}`,
        kind: "team",
        avatarFallback: mentionInitials(teamName, "T"),
        subtitle: "Team",
      };
    });

    if (activeRoom?.scope === "team") {
      const teamSlug = mentionSlug(activeRoom.name);
      const id = `team-${teamSlug}`;

      if (teamSlug && !seenIds.has(id)) {
        seenIds.add(id);
        entries.push({
          id,
          display: `team:${activeRoom.name}`,
          kind: "team",
          avatarFallback: mentionInitials(activeRoom.name, "T"),
          subtitle: "Team",
        });
        byToken[id] = {
          token: id,
          label: `team:${activeRoom.name}`,
          kind: "team",
          avatarFallback: mentionInitials(activeRoom.name, "T"),
          subtitle: "Team",
        };
      }
    }

    return {
      suggestions: entries.slice(0, 100),
      byToken,
    };
  }, [
    workspaceMentionPeopleQuery.data?.data?.members,
    currentUser.id,
    activeProjectDetailQuery.data?.data?.project?.name,
    activeProjectDetailQuery.data?.data?.project?.record?.teams,
    activeRoom?.name,
    activeRoom?.scope,
  ]);

  const mentionSuggestions = mentionLookup.suggestions;
  const mentionMetaByToken = mentionLookup.byToken;
  const authorInfoById = useMemo<Record<string, SpaceUserInfo>>(() => {
    const infoById: Record<string, SpaceUserInfo> = {};
    const members = workspaceMentionPeopleQuery.data?.data?.members ?? [];

    members.forEach((entry) => {
      const userId = String(entry?.userId?._id || "").trim();
      if (!userId) {
        return;
      }

      const name =
        `${entry?.userId?.firstName || ""} ${entry?.userId?.lastName || ""}`.trim() ||
        entry?.userId?.email ||
        "Unknown";

      infoById[userId] = {
        id: userId,
        name,
        email: String(entry?.userId?.email || ""),
        avatarUrl: String(entry?.userId?.profilePhoto?.url || "") || undefined,
        role:
          Array.isArray(entry?.roles) && entry.roles.length
            ? entry.roles
                .map((role) => String(role?.name || ""))
                .filter(Boolean)
                .join(", ")
            : "Member",
        team:
          Array.isArray(entry?.teams) && entry.teams.length
            ? entry.teams
                .map((team) => String(team?.name || ""))
                .filter(Boolean)
                .join(", ")
            : undefined,
      };
    });

    if (currentUser.id && !infoById[currentUser.id]) {
      infoById[currentUser.id] = {
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
      };
    }

    return infoById;
  }, [
    currentUser.avatarUrl,
    currentUser.id,
    currentUser.name,
    workspaceMentionPeopleQuery.data?.data?.members,
  ]);

  const canCreateChat =
    newChatMode === "direct"
      ? selectedCreateMemberIds.length === 1
      : Boolean(newChatGroupName.trim()) && selectedCreateMemberIds.length >= 1;

  const isDesktopThreadOpen = Boolean(selectedThreadMessage);
  const isActiveCallForRoom =
    Boolean(teamCallWidget?.roomId) &&
    String(teamCallWidget?.roomId || "") === String(activeRoom?.id || "");
  const hasOngoingCallForActiveRoom = Boolean(activeRoomCallStatus?.active);
  const activeRoomCallRoute = String(activeRoomCallStatus?.route || "").trim();

  useEffect(() => {
    selectedThreadMessageIdRef.current = selectedThreadMessageId;
  }, [selectedThreadMessageId]);

  useEffect(() => {
    autoScrollToBottomRef.current = true;
    isLoadingOlderMessagesRef.current = false;
    beforeOlderLoadScrollHeightRef.current = 0;
    beforeOlderLoadScrollTopRef.current = 0;
    suppressMessagePaginationUntilRef.current = Date.now() + 350;
    lastMessageScrollTopRef.current = 0;
  }, [activeRoom?.id]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    if (isLoadingOlderMessagesRef.current) {
      const delta =
        container.scrollHeight - beforeOlderLoadScrollHeightRef.current;
      container.scrollTop =
        beforeOlderLoadScrollTopRef.current + Math.max(0, delta);
      isLoadingOlderMessagesRef.current = false;
      suppressMessagePaginationUntilRef.current = Date.now() + 250;
      lastMessageScrollTopRef.current = container.scrollTop;
      return;
    }

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom <= 120;

    if (!autoScrollToBottomRef.current && !isNearBottom) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: autoScrollToBottomRef.current ? "auto" : "smooth",
    });
    autoScrollToBottomRef.current = false;
    lastMessageScrollTopRef.current = container.scrollTop;
  }, [activeMessages.length]);

  useEffect(() => {
    const container = threadListRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [activeThreadReplies.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextWidget = parseTeamCallWidget(
        window.sessionStorage.getItem(TEAM_CALL_WIDGET_KEY),
      );

      if (!nextWidget) {
        window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
        return;
      }

      setTeamCallWidget(nextWidget);
      setTeamCallDurationSeconds(
        Math.max(0, Math.floor((Date.now() - nextWidget.startedAt) / 1000)),
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!teamCallWidget?.startedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setTeamCallDurationSeconds(
        Math.max(0, Math.floor((Date.now() - teamCallWidget.startedAt) / 1000)),
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [teamCallWidget?.startedAt]);

  useEffect(() => {
    if (!resolvedWorkspaceId || !activeRoom?.id) {
      setActiveRoomCallStatus(null);
      return;
    }

    let cancelled = false;
    const roomId = String(activeRoom.id || "").trim();

    const refreshCallStatus = async () => {
      try {
        const response = await getTeamCallRoomStatus({
          workspaceId: resolvedWorkspaceId,
          roomId,
        });

        if (cancelled) {
          return;
        }

        if (!response?.ok || !response?.active || !response?.call) {
          setActiveRoomCallStatus({
            active: false,
          });
          return;
        }

        setActiveRoomCallStatus({
          active: true,
          route: String(response.call.route || "").trim(),
          startedAt: Number(response.call.startedAt || Date.now()),
          roomKind:
            String(response.call.roomKind || "").trim() === "direct"
              ? "direct"
              : String(response.call.roomKind || "").trim() === "project"
                ? "project"
                : String(response.call.roomKind || "").trim() === "task"
                  ? "task"
                  : "group",
          directUserId: String(response.call.directUserId || "").trim(),
          callMode: response.call.callMode === "voice" ? "voice" : "video",
          participants: Number(response.call.participants || 0),
        });
      } catch {
        if (!cancelled) {
          setActiveRoomCallStatus({
            active: false,
          });
        }
      }
    };

    void refreshCallStatus();
    const intervalId = window.setInterval(() => {
      void refreshCallStatus();
    }, 12_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeRoom?.id, resolvedWorkspaceId]);

  useEffect(() => {
    if (!resizingPane) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const layout = layoutRef.current;
      if (!layout) {
        return;
      }

      const rect = layout.getBoundingClientRect();
      const minMainWidth = 430;

      if (resizingPane === "left") {
        const rawWidth = event.clientX - rect.left;
        const maxLeftWidth =
          rect.width -
          (isDesktopThreadOpen
            ? threadPanelWidth + minMainWidth
            : minMainWidth);
        setLeftPanelWidth(clamp(rawWidth, 240, Math.max(300, maxLeftWidth)));
      }

      if (resizingPane === "thread") {
        const rawWidth = rect.right - event.clientX;
        const maxThreadWidth = rect.width - leftPanelWidth - minMainWidth;
        setThreadPanelWidth(
          clamp(rawWidth, 320, Math.max(360, maxThreadWidth)),
        );
      }
    };

    const handleMouseUp = () => {
      setResizingPane(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDesktopThreadOpen, leftPanelWidth, resizingPane, threadPanelWidth]);

  useEffect(() => {
    if (!activeRoom?.id) {
      return;
    }

    const hasLocalPendingRoomSync =
      pendingRoomSyncRef.current === activeRoom.id;
    const projectTargetRoom =
      !urlRoomId && urlProjectId
        ? findProjectRootRoom(rooms, urlProjectId)
        : null;
    const urlRoomNotResolved =
      Boolean(urlRoomId) &&
      urlRoomId !== activeRoom.id &&
      !hasLocalPendingRoomSync;
    const urlProjectNotResolved =
      !urlRoomId &&
      Boolean(urlProjectId) &&
      (!projectTargetRoom || projectTargetRoom.id !== activeRoom.id) &&
      !hasLocalPendingRoomSync;

    if (urlRoomNotResolved || urlProjectNotResolved) {
      return;
    }

    const currentRoomParam = urlRoomId;
    const currentThreadParam = urlThreadId;
    const nextThreadParam = selectedThreadMessageId || "";

    if (
      currentRoomParam === activeRoom.id &&
      currentThreadParam === nextThreadParam
    ) {
      if (pendingRoomSyncRef.current === activeRoom.id) {
        pendingRoomSyncRef.current = null;
      }
      return;
    }

    const next = new URLSearchParams(searchParamsString);
    next.set("room", activeRoom.id);
    next.delete("project");

    if (selectedThreadMessageId) {
      next.set("thread", selectedThreadMessageId);
    } else {
      next.delete("thread");
    }

    const nextRoute = `${ROUTES.SPACES}?${next.toString()}`;
    router.replace(nextRoute, { scroll: false });
  }, [
    activeRoom?.id,
    rooms,
    router,
    searchParamsString,
    selectedThreadMessageId,
    urlProjectId,
    urlRoomId,
    urlThreadId,
  ]);

  useEffect(() => {
    if (!resolvedWorkspaceId) {
      return;
    }

    const socket = subscribeWorkspaceSpaces({
      workspaceId: resolvedWorkspaceId,
    });
    if (activeRoom?.id) {
      subscribeSpaceRoom({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
      });
    }

    const dedupeSocketEvent = (key: string) => {
      const now = Date.now();
      const buffer = recentSocketEventRef.current;

      buffer.forEach((seenAt, eventKey) => {
        if (now - seenAt > 90_000) {
          buffer.delete(eventKey);
        }
      });

      if (buffer.has(key)) {
        return true;
      }

      buffer.set(key, now);
      return false;
    };

    const handleMessageCreated = ({
      workspaceId,
      roomId,
      message,
    }: SpaceMessageEventPayload) => {
      if (String(workspaceId) !== String(resolvedWorkspaceId)) {
        return;
      }

      const normalizedRoomId = String(roomId || "").trim();
      if (!normalizedRoomId) {
        return;
      }

      const messageId = String(message?.id || "").trim();
      if (
        messageId &&
        dedupeSocketEvent(
          `created:${resolvedWorkspaceId}:${normalizedRoomId}:${messageId}`,
        )
      ) {
        return;
      }

      bumpRoomActivity(
        normalizedRoomId,
        resolveIsoTimestamp(String(message?.sentAt || "")),
      );

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-rooms", resolvedWorkspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-keep-up", resolvedWorkspaceId],
      });

      if (normalizedRoomId !== String(activeRoom?.id || "")) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages-infinite",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
    };

    const handleMessageUpdated = ({
      workspaceId,
      roomId,
      message,
    }: SpaceMessageEventPayload) => {
      if (String(workspaceId) !== String(resolvedWorkspaceId)) {
        return;
      }

      const normalizedRoomId = String(roomId || "").trim();
      if (!normalizedRoomId) {
        return;
      }

      const messageId = String(message?.id || "").trim();
      if (
        messageId &&
        dedupeSocketEvent(
          `updated:${resolvedWorkspaceId}:${normalizedRoomId}:${messageId}`,
        )
      ) {
        return;
      }

      if (normalizedRoomId !== String(activeRoom?.id || "")) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages-infinite",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-pins",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
    };

    const handleMessageDeleted = ({
      workspaceId,
      roomId,
      messageId,
      parentMessageId,
    }: SpaceMessageDeletedEventPayload) => {
      if (String(workspaceId) !== String(resolvedWorkspaceId)) {
        return;
      }

      const normalizedRoomId = String(roomId || "").trim();
      if (!normalizedRoomId) {
        return;
      }

      const normalizedMessageId = String(messageId || "").trim();
      if (
        normalizedMessageId &&
        dedupeSocketEvent(
          `deleted:${resolvedWorkspaceId}:${normalizedRoomId}:${normalizedMessageId}`,
        )
      ) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-rooms", resolvedWorkspaceId],
      });

      if (normalizedRoomId !== String(activeRoom?.id || "")) {
        return;
      }

      if (
        selectedThreadMessageIdRef.current === normalizedMessageId ||
        selectedThreadMessageIdRef.current === String(parentMessageId || "")
      ) {
        setSelectedThreadMessageId(null);
      }

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages-infinite",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-pins",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          normalizedRoomId,
        ],
      });
    };

    socket.on("spaces:message:created", handleMessageCreated);
    socket.on("spaces:message:updated", handleMessageUpdated);
    socket.on("spaces:message:deleted", handleMessageDeleted);

    return () => {
      socket.off("spaces:message:created", handleMessageCreated);
      socket.off("spaces:message:updated", handleMessageUpdated);
      socket.off("spaces:message:deleted", handleMessageDeleted);
      unsubscribeWorkspaceSpaces({
        workspaceId: resolvedWorkspaceId,
      });
      if (activeRoom?.id) {
        unsubscribeSpaceRoom({
          workspaceId: resolvedWorkspaceId,
          roomId: activeRoom.id,
        });
      }
    };
  }, [activeRoom?.id, bumpRoomActivity, queryClient, resolvedWorkspaceId]);

  useEffect(() => {
    if (!resolvedWorkspaceId || !activeRoom?.id) {
      return;
    }

    const now = Date.now();
    if (
      lastMarkedReadRef.current &&
      lastMarkedReadRef.current.workspaceId === resolvedWorkspaceId &&
      lastMarkedReadRef.current.roomId === activeRoom.id &&
      now - lastMarkedReadRef.current.at < 30_000
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      markReadMutation.mutate({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
      });
      lastMarkedReadRef.current = {
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        at: Date.now(),
      };
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeRoom?.id, resolvedWorkspaceId, markReadMutation]);

  const clearCreateChatForm = () => {
    setNewChatMode("direct");
    setNewChatGroupName("");
    setNewChatSearch("");
    setSelectedCreateMemberIds([]);
  };

  const closeThread = () => {
    suppressedThreadIdRef.current = selectedThreadMessageId;
    setSelectedThreadMessageId(null);
    setIsThreadSheetOpen(false);
    setThreadComposer("");
    setThreadAttachments([]);
    setEditingReplyId(null);
    setEditingReplyValue("");
  };

  const formatCallDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const clearTeamCallWidget = () => {
    window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
    setTeamCallWidget(null);
    setTeamCallDurationSeconds(0);
  };

  const openTeamCallForRoom = (
    room: SpaceRoom | null,
    mode: "voice" | "video" = "video",
  ) => {
    if (!room) {
      return;
    }

    clearTeamCallWidget();
    pendingRoomSyncRef.current = room.id;
    setActiveRoomId(room.id);

    const startedAt = Date.now();

    if (resolvedWorkspaceId) {
      const socket = getSpacesSocket();
      if (!socket.connected) {
        socket.connect();
      }

      socket.emit("team-call:start", {
        workspaceId: resolvedWorkspaceId,
        roomId: room.id,
        roomName: room.name,
        roomScope: room.scope,
        roomKind:
          room.kind === "direct" ||
          room.kind === "group" ||
          room.kind === "project" ||
          room.kind === "task"
            ? room.kind
            : "group",
        callMode: mode,
        startedAt,
        startedByName: currentUser.name,
        startedByInitials: currentUser.initials,
      }, (response?: { ok?: boolean; route?: string; active?: boolean; threadMessageId?: string }) => {
        if (!response?.ok) {
          return;
        }

        if (response?.active) {
          setActiveRoomCallStatus((prev) => ({
            active: true,
            route: String(response.route || "").trim() || prev?.route,
            startedAt: startedAt,
            callMode: mode,
            participants: prev?.participants,
          }));
        }
      });
    }

    router.push(
      buildTeamCallRoute({
        roomId: room.id,
        roomName: room.name,
        roomScope: room.scope,
        roomKind:
          room.kind === "direct" ||
          room.kind === "group" ||
          room.kind === "project" ||
          room.kind === "task"
            ? room.kind
            : "group",
        directUserId:
          room.kind === "direct"
            ? String(room.meta?.directUserId || "").trim()
            : "",
        callMode: mode,
        startedAt,
      }),
    );
  };

  const openTeamCall = (mode: "voice" | "video" = "video") => {
    openTeamCallForRoom(activeRoom, mode);
  };

  const joinOngoingCallForActiveRoom = () => {
    if (!activeRoom) {
      return;
    }

    if (activeRoomCallRoute) {
      router.push(activeRoomCallRoute);
      return;
    }

    router.push(
      buildTeamCallRoute({
        roomId: activeRoom.id,
        roomName: activeRoom.name,
        roomScope: activeRoom.scope,
        roomKind:
          activeRoomCallStatus?.roomKind === "direct" ||
          activeRoomCallStatus?.roomKind === "project" ||
          activeRoomCallStatus?.roomKind === "task"
            ? activeRoomCallStatus.roomKind
            : activeRoom?.kind === "direct" ||
                activeRoom?.kind === "project" ||
                activeRoom?.kind === "task"
              ? activeRoom.kind
              : "group",
        directUserId:
          activeRoom?.kind === "direct" ||
          activeRoomCallStatus?.roomKind === "direct"
            ? String(
                activeRoomCallStatus?.directUserId ||
                  activeRoom.meta?.directUserId ||
                  "",
              ).trim()
            : "",
        callMode: activeRoomCallStatus?.callMode === "voice" ? "voice" : "video",
        startedAt: Number(activeRoomCallStatus?.startedAt || Date.now()),
      }),
    );
  };

  const rejoinTeamCall = () => {
    if (!teamCallWidget) {
      return;
    }

    const query = new URLSearchParams({
      room: teamCallWidget.roomName,
      scope: teamCallWidget.roomScope,
      roomKind:
        teamCallWidget.roomKind ||
        (activeRoom?.kind === "direct" ||
        activeRoom?.kind === "group" ||
        activeRoom?.kind === "project" ||
        activeRoom?.kind === "task"
          ? activeRoom.kind
          : "group"),
      callMode: teamCallWidget.callMode || "video",
      startedAt: `${teamCallWidget.startedAt}`,
    });
    if (
      (teamCallWidget.roomKind || activeRoom?.kind) === "direct" &&
      activeRoom?.meta?.directUserId
    ) {
      query.set("directUserId", String(activeRoom.meta.directUserId).trim());
    }
    if (teamCallWidget.roomId) {
      query.set("roomId", teamCallWidget.roomId);
    }
    router.push(`${ROUTES.SPACES_TEAM_CALL}?${query.toString()}`);
  };

  const handleStartCall = (mode: "voice" | "video") => {
    if (hasOngoingCallForActiveRoom) {
      joinOngoingCallForActiveRoom();
      return;
    }

    openTeamCallForRoom(activeRoom, mode);
  };

  const handleJoinCallFromMessage = (route?: string) => {
    const normalizedRoute = String(route || "").trim();

    if (normalizedRoute) {
      router.push(normalizedRoute);
      return;
    }

    if (hasOngoingCallForActiveRoom) {
      joinOngoingCallForActiveRoom();
    }
  };

  const attachFiles = (files: FileList, target: "main" | "thread") => {
    const nextAttachments: ChatAttachment[] = Array.from(files).map((file) => {
      const isImage = file.type.startsWith("image/");

      return {
        id: createId(),
        name: file.name,
        kind: isImage ? "image" : "file",
        url: isImage ? URL.createObjectURL(file) : undefined,
        file,
      };
    });

    if (target === "main") {
      setComposerAttachments((prev) => [...prev, ...nextAttachments]);
      return;
    }

    setThreadAttachments((prev) => [...prev, ...nextAttachments]);
  };

  const revokeAttachmentObjectUrls = (attachments: ChatAttachment[]) => {
    attachments.forEach((attachment) => {
      const url = String(attachment.url || "");
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
  };

  const uploadDraftAttachments = async (
    draftAttachments: ChatAttachment[],
  ): Promise<
    Array<{ id: string; name: string; kind: "image" | "file"; url?: string }>
  > => {
    if (!draftAttachments.length) {
      return [];
    }

    const uploaded = await Promise.all(
      draftAttachments.map(async (attachment) => {
        const localFile = attachment.file;
        const localUrl = String(attachment.url || "");
        const isLocalBlob = localUrl.startsWith("blob:");

        if (!localFile || !isLocalBlob) {
          return {
            id: attachment.id,
            name: attachment.name,
            kind: attachment.kind,
            url: attachment.url,
          };
        }

        const formData = new FormData();
        formData.append("file", localFile);
        if (resolvedWorkspaceId) {
          formData.append("workspaceId", resolvedWorkspaceId);
        }
        formData.append("folder", "general");

        const uploadResponse = (await uploadAssetMutation.mutateAsync(
          formData,
        )) as unknown as {
          data?: {
            asset?: {
              _id?: string;
              fileName?: string;
              mimeType?: string;
              resourceType?: string;
              url?: string;
            };
          };
        };
        const asset = uploadResponse?.data?.asset;
        const assetMimeType = String(asset?.mimeType || "").toLowerCase();
        const assetResourceType = String(
          asset?.resourceType || "",
        ).toLowerCase();
        const kind: "image" | "file" =
          assetMimeType.startsWith("image/") || assetResourceType === "image"
            ? "image"
            : "file";

        return {
          id: String(asset?._id || attachment.id),
          name: String(asset?.fileName || attachment.name || "Attachment"),
          kind,
          url: String(asset?.url || attachment.url || ""),
        };
      }),
    );

    return uploaded;
  };

  const handleUploadFromInput = (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "main" | "thread",
  ) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    attachFiles(files, target);
    event.target.value = "";
  };

  const removeDraftAttachment = (
    attachmentId: string,
    target: "main" | "thread",
  ) => {
    if (target === "main") {
      setComposerAttachments((prev) => {
        const removed = prev.find((file) => file.id === attachmentId);
        if (removed) {
          revokeAttachmentObjectUrls([removed]);
        }
        return prev.filter((file) => file.id !== attachmentId);
      });
      return;
    }

    setThreadAttachments((prev) => {
      const removed = prev.find((file) => file.id === attachmentId);
      if (removed) {
        revokeAttachmentObjectUrls([removed]);
      }
      return prev.filter((file) => file.id !== attachmentId);
    });
  };

  const handleSelectRoom = (roomId: string) => {
    pendingRoomSyncRef.current = roomId;
    suppressedThreadIdRef.current = null;
    setActiveRoomId(roomId);
    setIsRoomsSheetOpen(false);
    setEditingMessageId(null);
    setEditingMessageValue("");
    closeThread();
  };

  const openThreadForMessage = (messageId: string) => {
    setSelectedThreadMessageId(messageId);

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setIsThreadSheetOpen(true);
    }
  };

  const loadOlderMessages = () => {
    if (
      !messagesQuery.hasNextPage ||
      messagesQuery.isFetchingNextPage ||
      isLoadingOlderMessagesRef.current
    ) {
      return;
    }

    const container = messageListRef.current;
    if (!container) {
      return;
    }

    beforeOlderLoadScrollHeightRef.current = container.scrollHeight;
    beforeOlderLoadScrollTopRef.current = container.scrollTop;
    isLoadingOlderMessagesRef.current = true;
    suppressMessagePaginationUntilRef.current = Date.now() + 250;
    void messagesQuery.fetchNextPage();
  };

  const loadMoreRooms = () => {
    if (!roomsQuery.hasNextPage || roomsQuery.isFetchingNextPage) {
      return;
    }

    void roomsQuery.fetchNextPage();
  };

  const handleRoomListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom <= 120) {
      loadMoreRooms();
    }
  };

  const handleMessageListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const now = Date.now();
    const previousTop = lastMessageScrollTopRef.current;
    const currentTop = target.scrollTop;
    const isScrollingUp = currentTop < previousTop - 2;
    lastMessageScrollTopRef.current = currentTop;

    if (now < suppressMessagePaginationUntilRef.current) {
      return;
    }

    if (currentTop <= 80 && isScrollingUp) {
      loadOlderMessages();
    }
  };

  const upsertMessageCache = (roomId: string) => {
    queryClient.invalidateQueries({
      queryKey: ["workspace-spaces-room-messages", resolvedWorkspaceId, roomId],
    });
    queryClient.invalidateQueries({
      queryKey: [
        "workspace-spaces-room-messages-infinite",
        resolvedWorkspaceId,
        roomId,
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["workspace-spaces-rooms", resolvedWorkspaceId],
    });
  };

  const appendOptimisticRoomMessage = (
    roomId: string,
    message: SpaceMessage,
  ) => {
    setOptimisticMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), message],
    }));
  };

  const replaceOptimisticRoomMessage = (
    roomId: string,
    optimisticMessageId: string,
    nextMessage: SpaceMessage,
  ) => {
    setOptimisticMessagesByRoom((prev) => {
      const current = prev[roomId] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.map((message) =>
        message.id === optimisticMessageId ? nextMessage : message,
      );

      return {
        ...prev,
        [roomId]: next,
      };
    });
  };

  const removeOptimisticRoomMessage = (roomId: string, messageId: string) => {
    setOptimisticMessagesByRoom((prev) => {
      const current = prev[roomId] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.filter((message) => message.id !== messageId);
      if (next.length === current.length) {
        return prev;
      }

      const cloned = { ...prev };
      if (next.length) {
        cloned[roomId] = next;
      } else {
        delete cloned[roomId];
      }
      return cloned;
    });
  };

  const appendOptimisticThreadReply = (
    messageId: string,
    reply: ThreadReply,
  ) => {
    setOptimisticThreadRepliesByMessage((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), reply],
    }));
  };

  const replaceOptimisticThreadReply = (
    messageId: string,
    optimisticReplyId: string,
    nextReply: ThreadReply,
  ) => {
    setOptimisticThreadRepliesByMessage((prev) => {
      const current = prev[messageId] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.map((reply) =>
        reply.id === optimisticReplyId ? nextReply : reply,
      );

      return {
        ...prev,
        [messageId]: next,
      };
    });
  };

  const removeOptimisticThreadReply = (messageId: string, replyId: string) => {
    setOptimisticThreadRepliesByMessage((prev) => {
      const current = prev[messageId] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.filter((reply) => reply.id !== replyId);
      if (next.length === current.length) {
        return prev;
      }

      const cloned = { ...prev };
      if (next.length) {
        cloned[messageId] = next;
      } else {
        delete cloned[messageId];
      }
      return cloned;
    });
  };

  const handleCreateChat = async () => {
    if (!resolvedWorkspaceId || !canCreateChat) {
      return;
    }

    const payload =
      newChatMode === "direct"
        ? {
            kind: "direct" as const,
            memberUserIds: selectedCreateMemberIds.slice(0, 1),
          }
        : {
            kind: "group" as const,
            name: newChatGroupName.trim(),
            topic: "Custom group chat",
            visibility: "private" as const,
            memberUserIds: selectedCreateMemberIds,
          };

    try {
      const response = await createRoomMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        payload,
      });

      const createdRoom = response.data.room;
      clearCreateChatForm();
      setIsCreateChatOpen(false);
      setRoomQuery("");
      pendingRoomSyncRef.current = createdRoom.id;
      setActiveRoomId(createdRoom.id);

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-rooms", resolvedWorkspaceId],
      });
    } catch {
      // handled by shared hook
    }
  };

  const handleSendMessage = async () => {
    if (!resolvedWorkspaceId || !activeRoom) {
      return;
    }

    const content = composer.trim();
    const draftAttachments = [...composerAttachments];
    if (!content && draftAttachments.length === 0) {
      return;
    }

    const roomId = activeRoom.id;
    const optimisticMessageId = `optimistic-message-${createId()}`;

    const optimisticMessage: SpaceMessage = {
      id: optimisticMessageId,
      roomId,
      parentMessageId: null,
      author: currentUser,
      content,
      sentAt: "Just now",
      sentAtRaw: new Date().toISOString(),
      edited: false,
      attachments: draftAttachments,
      reactions: [],
      threadCount: 0,
    };

    autoScrollToBottomRef.current = true;
    setComposer("");
    setComposerAttachments([]);
    appendOptimisticRoomMessage(roomId, optimisticMessage);
    bumpRoomActivity(roomId);

    try {
      const payloadAttachments = await uploadDraftAttachments(draftAttachments);
      const response = await createMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId,
        payload: {
          content,
          attachments: payloadAttachments,
        },
      });
      const persistedMessage = response?.data?.chatMessage
        ? mapMessageToUi(response.data.chatMessage)
        : null;

      if (persistedMessage) {
        replaceOptimisticRoomMessage(
          roomId,
          optimisticMessageId,
          persistedMessage,
        );
      } else {
        removeOptimisticRoomMessage(roomId, optimisticMessageId);
      }

      revokeAttachmentObjectUrls(draftAttachments);
      upsertMessageCache(roomId);
    } catch {
      removeOptimisticRoomMessage(roomId, optimisticMessageId);
      setComposer((prev) => (prev.trim().length ? prev : content));
      setComposerAttachments((prev) => (prev.length ? prev : draftAttachments));
    }
  };

  const handleSendThreadReply = async () => {
    if (!resolvedWorkspaceId || !activeRoom || !selectedThreadMessage) {
      return;
    }

    const content = threadComposer.trim();
    const draftAttachments = [...threadAttachments];
    if (!content && draftAttachments.length === 0) {
      return;
    }

    const roomId = activeRoom.id;
    const messageId = selectedThreadMessage.id;
    const optimisticReplyId = `optimistic-reply-${createId()}`;

    const optimisticReply: ThreadReply = {
      id: optimisticReplyId,
      messageId,
      author: currentUser,
      content,
      sentAt: "Just now",
      sentAtRaw: new Date().toISOString(),
      edited: false,
      attachments: draftAttachments,
      reactions: [],
    };

    setThreadComposer("");
    setThreadAttachments([]);
    appendOptimisticThreadReply(messageId, optimisticReply);
    bumpRoomActivity(roomId);

    try {
      const payloadAttachments = await uploadDraftAttachments(draftAttachments);
      const response = await createThreadReplyMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId,
        messageId,
        payload: {
          content,
          attachments: payloadAttachments,
        },
      });

      const persistedReplyRecord = response?.data?.reply;
      if (persistedReplyRecord) {
        const mappedReply = mapMessageToUi(persistedReplyRecord);
        replaceOptimisticThreadReply(messageId, optimisticReplyId, {
          id: mappedReply.id,
          messageId: mappedReply.parentMessageId || messageId,
          author: mappedReply.author,
          content: mappedReply.content,
          sentAt: mappedReply.sentAt,
          sentAtRaw: mappedReply.sentAtRaw,
          edited: mappedReply.edited,
          attachments: mappedReply.attachments,
          reactions: mappedReply.reactions,
        });
      } else {
        removeOptimisticThreadReply(messageId, optimisticReplyId);
      }

      upsertMessageCache(roomId);
      revokeAttachmentObjectUrls(draftAttachments);
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          roomId,
          messageId,
        ],
      });
    } catch {
      removeOptimisticThreadReply(messageId, optimisticReplyId);
      setThreadComposer((prev) => (prev.trim().length ? prev : content));
      setThreadAttachments((prev) => (prev.length ? prev : draftAttachments));
    }
  };

  const copyTextToClipboard = (value: string) => {
    if (!value.trim()) {
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(value);
    }
  };

  const openForwardMessageDialog = (source: ForwardMessageSource) => {
    const forwardedContent = source.content.trim();
    if (
      !forwardedContent &&
      (!source.attachments || source.attachments.length === 0)
    ) {
      return;
    }

    setForwardMessageSource(source);
    setForwardSearch("");
    setSelectedForwardTargetId("");
    setIsForwardDialogOpen(true);
  };

  const handleSubmitForwardMessage = async () => {
    if (!resolvedWorkspaceId || !forwardMessageSource || !selectedForwardTargetId) {
      return;
    }

    const [targetKind, targetId] = selectedForwardTargetId.split(":");
    const normalizedTargetId = String(targetId || "").trim();
    if (!normalizedTargetId) {
      return;
    }

    const forwardedText = forwardMessageSource.content.trim();
    const contentHeader = `Forwarded from ${forwardMessageSource.author.name}`;
    const payloadContent = forwardedText
      ? `${contentHeader}\n${forwardedText}`
      : contentHeader;

    try {
      let destinationRoomId = "";

      if (targetKind === "person") {
        const roomResponse = await createRoomMutation.mutateAsync({
          workspaceId: resolvedWorkspaceId,
          payload: {
            kind: "direct",
            memberUserIds: [normalizedTargetId],
          },
        });
        destinationRoomId = String(roomResponse?.data?.room?.id || "").trim();
      } else if (targetKind === "room") {
        destinationRoomId = normalizedTargetId;
      }

      if (!destinationRoomId) {
        return;
      }

      await createMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: destinationRoomId,
        payload: {
          content: payloadContent,
          attachments: forwardMessageSource.attachments || [],
        },
      });

      upsertMessageCache(destinationRoomId);
      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-rooms", resolvedWorkspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages",
          resolvedWorkspaceId,
          destinationRoomId,
        ],
      });

      setIsForwardDialogOpen(false);
      setForwardMessageSource(null);
      setForwardSearch("");
      setSelectedForwardTargetId("");
      toast.success("Message forwarded");
    } catch {
      // handled by shared hooks
    }
  };

  const createTaskFromMessage = () => {
    toast.info("Create task from chat will be wired to project tasks next.");
  };

  const startEditingMessage = (message: SpaceMessage) => {
    if (String(message.author.id || "") !== String(currentUser.id || "")) {
      return;
    }
    setEditingMessageId(message.id);
    setEditingMessageValue(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageValue("");
  };

  const saveEditedMessage = async (messageId: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      updateMessageMutation.isPending
    ) {
      return;
    }

    const targetMessage = activeMessages.find(
      (message) => message.id === messageId,
    );
    if (
      !targetMessage ||
      String(targetMessage.author.id || "") !== String(currentUser.id || "")
    ) {
      return;
    }

    const nextContent = editingMessageValue.trim();
    if (!nextContent) {
      return;
    }

    try {
      await updateMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId,
        updates: {
          content: nextContent,
        },
      });

      cancelEditingMessage();
      upsertMessageCache(activeRoom.id);
    } catch {
      // handled by shared hook
    }
  };

  const deleteMessageFromChat = async (messageId: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      deleteMessageMutation.isPending
    ) {
      return;
    }

    const targetMessage = activeMessages.find(
      (message) => message.id === messageId,
    );
    if (
      !targetMessage ||
      String(targetMessage.author.id || "") !== String(currentUser.id || "")
    ) {
      return;
    }

    try {
      await deleteMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId,
      });

      if (selectedThreadMessageId === messageId) {
        closeThread();
      }

      if (editingMessageId === messageId) {
        cancelEditingMessage();
      }

      upsertMessageCache(activeRoom.id);
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-pins",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });
    } catch {
      // handled by shared hook
    }
  };

  const togglePinnedMessage = async (messageId: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      !messageId
    ) {
      return;
    }

    const targetMessage = activeMessages.find((entry) => entry.id === messageId);
    if (!targetMessage) {
      return;
    }

    const previousPinned = Boolean(targetMessage.isPinned);
    const nextPinned = !previousPinned;

    setOptimisticPinnedByMessageId((prev) => ({
      ...prev,
      [messageId]: nextPinned,
    }));

    try {
      await toggleMessagePinMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId,
      });

      upsertMessageCache(activeRoom.id);
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-pins",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });
    } catch {
      setOptimisticPinnedByMessageId((prev) => {
        const next = { ...prev };
        next[messageId] = previousPinned;
        return next;
      });
      // handled by shared hook
    }
  };

  const getPinnedMessagePreview = (message: SpaceMessage) => {
    const normalized = String(message.content || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "Pinned message";
    }

    return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
  };

  const openPinnedMessage = (messageId: string) => {
    if (!messageId) {
      return;
    }

    setIsPinsSheetOpen(false);
    setAnchorMessageId(null);
    window.setTimeout(() => {
      setAnchorMessageId(messageId);
    }, 0);
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      !messageId
    ) {
      return;
    }

    const targetMessage = activeMessages.find((entry) => entry.id === messageId);
    if (!targetMessage) {
      return;
    }

    const previousReactions = normalizeReactionEntries(targetMessage.reactions);
    const optimisticReactions = toggleReactionEntries(previousReactions, emoji);

    setOptimisticReactionsByMessageId((prev) => ({
      ...prev,
      [messageId]: optimisticReactions,
    }));

    try {
      await toggleMessageReactionMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId,
        emoji,
      });

      upsertMessageCache(activeRoom.id);
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });
    } catch {
      setOptimisticReactionsByMessageId((prev) => {
        const next = { ...prev };
        if (previousReactions.length) {
          next[messageId] = previousReactions;
        } else {
          delete next[messageId];
        }
        return next;
      });
      // handled by shared hook
    }
  };

  const startEditingReply = (reply: ThreadReply) => {
    if (String(reply.author.id || "") !== String(currentUser.id || "")) {
      return;
    }
    setEditingReplyId(reply.id);
    setEditingReplyValue(reply.content);
  };

  const cancelEditingReply = () => {
    setEditingReplyId(null);
    setEditingReplyValue("");
  };

  const saveEditedReply = async (replyId: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      updateMessageMutation.isPending
    ) {
      return;
    }

    const targetReply = activeThreadReplies.find(
      (reply) => reply.id === replyId,
    );
    if (
      !targetReply ||
      String(targetReply.author.id || "") !== String(currentUser.id || "")
    ) {
      return;
    }

    const nextContent = editingReplyValue.trim();
    if (!nextContent) {
      return;
    }

    try {
      await updateMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId: replyId,
        updates: {
          content: nextContent,
        },
      });

      cancelEditingReply();
      upsertMessageCache(activeRoom.id);

      if (selectedThreadMessage) {
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-spaces-thread-replies",
            resolvedWorkspaceId,
            activeRoom.id,
            selectedThreadMessage.id,
          ],
        });
      }
    } catch {
      // handled by shared hook
    }
  };

  const deleteThreadReply = async (replyId: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      deleteMessageMutation.isPending
    ) {
      return;
    }

    const targetReply = activeThreadReplies.find(
      (reply) => reply.id === replyId,
    );
    if (
      !targetReply ||
      String(targetReply.author.id || "") !== String(currentUser.id || "")
    ) {
      return;
    }

    try {
      await deleteMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId: replyId,
      });

      setPinnedReplyIds((prev) => prev.filter((id) => id !== replyId));

      if (editingReplyId === replyId) {
        cancelEditingReply();
      }

      if (selectedThreadMessage) {
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-spaces-thread-replies",
            resolvedWorkspaceId,
            activeRoom.id,
            selectedThreadMessage.id,
          ],
        });
      }
      upsertMessageCache(activeRoom.id);
    } catch {
      // handled by shared hook
    }
  };

  const togglePinnedReply = (replyId: string) => {
    setPinnedReplyIds((prev) =>
      prev.includes(replyId)
        ? prev.filter((id) => id !== replyId)
        : [replyId, ...prev],
    );
  };

  const reactToThreadReply = async (replyId: string, emoji: string) => {
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      !replyId
    ) {
      return;
    }

    const targetReply = activeThreadReplies.find((entry) => entry.id === replyId);
    if (!targetReply) {
      return;
    }

    const previousReactions = normalizeReactionEntries(targetReply.reactions);
    const optimisticReactions = toggleReactionEntries(previousReactions, emoji);

    setOptimisticReactionsByMessageId((prev) => ({
      ...prev,
      [replyId]: optimisticReactions,
    }));

    try {
      await toggleMessageReactionMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId: replyId,
        emoji,
      });

      upsertMessageCache(activeRoom.id);
      if (selectedThreadMessage) {
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-spaces-thread-replies",
            resolvedWorkspaceId,
            activeRoom.id,
            selectedThreadMessage.id,
          ],
        });
      }
    } catch {
      setOptimisticReactionsByMessageId((prev) => {
        const next = { ...prev };
        if (previousReactions.length) {
          next[replyId] = previousReactions;
        } else {
          delete next[replyId];
        }
        return next;
      });
      // handled by shared hook
    }
  };

  const getThreadCount = (messageId: string) => {
    const message = activeMessages.find((entry) => entry.id === messageId);

    if (message?.threadCount) {
      return message.threadCount;
    }

    if (selectedThreadMessageId === messageId) {
      return activeThreadReplies.length;
    }

    return 0;
  };

  const handleOpenKeepUpItem = (item: WorkspaceSpaceKeepUpItem) => {
    pendingRoomSyncRef.current = item.roomId;
    setActiveRoomId(item.roomId);
    setSelectedThreadMessageId(item.parentMessageId);
    setIsKeepUpOpen(false);

    if (window.matchMedia("(max-width: 1023px)").matches) {
      setIsThreadSheetOpen(true);
    }
  };

  const openMentionDirectChat = async (targetUserId: string) => {
    if (!resolvedWorkspaceId) {
      return;
    }

    const normalizedTargetUserId = String(targetUserId || "").trim();
    if (
      !normalizedTargetUserId ||
      normalizedTargetUserId === String(currentUser.id || "")
    ) {
      return;
    }

    try {
      const response = await createRoomMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        payload: {
          kind: "direct",
          memberUserIds: [normalizedTargetUserId],
        },
      });

      const roomId = String(response?.data?.room?.id || "").trim();
      if (!roomId) {
        return;
      }

      pendingRoomSyncRef.current = roomId;
      suppressedThreadIdRef.current = null;
      setActiveRoomId(roomId);
      closeThread();
    } catch {
      // handled by shared hook
    }
  };

  const openSharedJamFromMessage = useCallback(
    async (jamId: string) => {
      const normalizedJamId = String(jamId || "").trim();
      if (!resolvedWorkspaceId || !normalizedJamId) {
        return;
      }

      try {
        await getWorkspaceJamDetail(
          resolvedWorkspaceId,
          normalizedJamId,
          false,
        );
        router.push(`/jams/${encodeURIComponent(normalizedJamId)}`);
      } catch (error) {
        const axiosError = error as AxiosError<{
          message?: string;
          description?: string;
        }>;
        const fallbackDescription =
          axiosError?.response?.data?.description ||
          "You do not have access to view this jam.";
        toast.error(fallbackDescription);
      }
    },
    [resolvedWorkspaceId, router],
  );

  const handleMarkKeepUpSeen = async () => {
    if (!resolvedWorkspaceId || markKeepUpSeenMutation.isPending) {
      return;
    }

    try {
      await markKeepUpSeenMutation.mutateAsync(resolvedWorkspaceId);
      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-keep-up", resolvedWorkspaceId],
      });
    } catch {
      // handled by hook
    }
  };

  useEffect(() => {
    if (!isKeepUpOpen) {
      return;
    }

    setKeepUpPage(1);
  }, [isKeepUpOpen]);

  const activeRoomAvatarFallback = activeRoom
    ? String(activeRoom.avatarFallback || "")
        .trim()
        .slice(0, 2)
        .toUpperCase() || mentionInitials(activeRoom.name, "SP")
    : "SP";

  const handleQuickDirectCall = (room: SpaceRoom) => {
    openTeamCallForRoom(room, "voice");
  };

  return (
    <>
      <div
        ref={layoutRef}
        data-tour="spaces-shell"
        className="flex h-full min-h-0 w-full flex-1 overflow-hidden"
      >
        <aside
          data-tour="spaces-list"
          style={{ width: leftPanelWidth }}
          className="hidden min-h-0 flex-col overflow-hidden rounded-md border border-border/35 bg-card/70 lg:flex"
        >
          <div className="border-b border-border/35 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Spaces</p>
                <p className="text-muted-foreground text-[12px]">
                  Personal chats, project rooms, task threads
                </p>
              </div>
              <Button
                data-tour="spaces-create"
                size="icon-sm"
                variant="outline"
                className="size-7"
                onClick={() => setIsCreateChatOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
              <Input
                value={roomQuery}
                onChange={(event) => setRoomQuery(event.target.value)}
                placeholder="Search chats"
                className="h-9 pl-7 text-sm"
              />
            </div>
          </div>

          <div
            ref={roomListDesktopRef}
            onScroll={handleRoomListScroll}
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2"
          >
            {roomsQuery.isLoading ? (
              <div className="flex h-full min-h-[14rem] items-center justify-center">
                <LoaderComponent />
              </div>
            ) : hasRooms ? (
              <>
                <RoomItems
                  roomEntries={rooms}
                  activeRoomId={activeRoom?.id || ""}
                  onPick={handleSelectRoom}
                  onQuickCall={handleQuickDirectCall}
                />
                {isLoadingMoreRooms ? (
                  <div className="flex justify-center py-1.5">
                    <LoaderComponent />
                  </div>
                ) : hasMoreRooms ? (
                  <div className="text-muted-foreground py-1 text-center text-[11px]">
                    Scroll for more spaces
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full min-h-[14rem] items-center justify-center px-2">
                <Empty className="border-0 p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageSquareText className="size-4 text-primary/85" />
                    </EmptyMedia>
                    <EmptyDescription className="text-center text-[12px]">
                      {roomQuery.trim()
                        ? "No chats match this search."
                        : "No spaces yet. Create your first chat to get started."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </div>
        </aside>

        <button
          type="button"
          aria-label="Resize chat list"
          onMouseDown={() => setResizingPane("left")}
          className="relative hidden w-2 cursor-col-resize lg:block"
        >
          <span className="bg-border/70 hover:bg-primary/60 absolute top-1/2 left-1/2 h-12 w-px -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors" />
        </button>

        <section
          data-tour="spaces-chat"
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-border/35 border-x-0 border-b-0 bg-card/70 sm:rounded-md sm:border-x sm:border-b"
        >
          <div className="border-b border-border/35 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-[13px] lg:hidden"
                onClick={() => setIsRoomsSheetOpen(true)}
              >
                <Menu className="size-4" />
                Chats
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 max-w-[11.5rem] px-2.5 text-[13px] sm:max-w-none"
                onClick={() => setIsWorkspaceDetailsOpen(true)}
              >
                <Building2 className="size-4" />
                {workspaceName}
              </Button>

              <Badge
                variant="outline"
                className="hidden text-[11px] sm:inline-flex capitalize"
              >
                {workspaceType}
              </Badge>

              <Badge
                variant="secondary"
                className="hidden text-[11px] min-[440px]:inline-flex"
              >
                {rooms.length} chats
              </Badge>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  data-tour="spaces-keepup"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-[13px]"
                  onClick={() => setIsKeepUpOpen(true)}
                >
                  <Bell className="size-4" />
                  Keep-up
                  {keepUpCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 rounded-full px-1.5 py-0 text-[11px]"
                    >
                      {keepUpCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-[13px]"
                  onClick={() => setIsPinsSheetOpen(true)}
                  disabled={!activeRoom}
                >
                  <Pin className="size-4" />
                  Pins
                  {pinnedMessagesCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 rounded-full px-1.5 py-0 text-[11px]"
                    >
                      {pinnedMessagesCount}
                    </Badge>
                  )}
                </Button>

                {isPersonalChat ? (
                  <Button
                    size="sm"
                    variant={hasOngoingCallForActiveRoom ? "default" : "ghost"}
                    className={cn(
                      "h-8 px-2.5 text-[13px]",
                      hasOngoingCallForActiveRoom &&
                        "bg-orange-500/90 text-white hover:bg-orange-500",
                    )}
                    onClick={() => handleStartCall("voice")}
                  >
                    <Phone className="size-4" />
                    {hasOngoingCallForActiveRoom || isActiveCallForRoom
                      ? "Join Call"
                      : "Call"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={hasOngoingCallForActiveRoom ? "default" : "outline"}
                    className={cn(
                      "h-8 px-2.5 text-[13px]",
                      hasOngoingCallForActiveRoom &&
                        "bg-orange-500/90 text-white hover:bg-orange-500",
                    )}
                    onClick={() =>
                      hasOngoingCallForActiveRoom
                        ? joinOngoingCallForActiveRoom()
                        : openTeamCall("video")
                    }
                    disabled={!activeRoom}
                  >
                    <Video className="size-4" />
                    {hasOngoingCallForActiveRoom ? "Join Call" : "Team Call"}
                  </Button>
                )}
              </div>
            </div>

            {activeRoom && (
              <div className="mt-2 flex flex-wrap items-start gap-2">
                <Avatar className="mt-0.5 size-6 rounded-sm">
                  <AvatarImage
                    src={activeRoom.avatarUrl}
                    alt={activeRoom.name}
                  />
                  <AvatarFallback className="rounded-sm text-[10px]">
                    {activeRoomAvatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {activeRoom.name}
                  </p>
                  <p className="text-muted-foreground truncate text-[12px]">
                    {activeRoom.topic || "No topic yet"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="ml-auto hidden text-[11px] min-[440px]:inline-flex"
                >
                  {SCOPE_META[activeRoom.scope].label}
                </Badge>
                {isPersonalChat && (
                  <Badge
                    variant="secondary"
                    className="hidden text-[11px] min-[440px]:inline-flex"
                  >
                    Direct chat
                  </Badge>
                )}
              </div>
            )}

            {activeRoom && featuredPinnedMessage && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
                <Badge variant="outline" className="text-[10px]">
                  <Pin className="size-3.5" />
                  {pinnedMessagesCount}
                </Badge>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => openPinnedMessage(featuredPinnedMessage.id)}
                >
                  {getPinnedMessagePreview(featuredPinnedMessage)}
                </button>
                {pinnedMessagesCount > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setIsPinsSheetOpen(true)}
                  >
                    View all
                  </Button>
                )}
              </div>
            )}

          </div>

          {teamCallWidget && (
            <TeamCallWidget
              teamCallWidget={teamCallWidget}
              teamCallDurationSeconds={teamCallDurationSeconds}
              formatCallDuration={formatCallDuration}
              className="top-3"
              onRejoin={rejoinTeamCall}
              onClear={clearTeamCallWidget}
            />
          )}

          {hasRooms && activeRoom ? (
            <MainChatPanel
              activeMessages={activeMessages}
              selectedThreadMessageId={selectedThreadMessageId}
              anchorMessageId={anchorMessageId}
              editingMessageId={editingMessageId}
              editingMessageValue={editingMessageValue}
              composer={composer}
              composerAttachments={composerAttachments}
              canSendMessage={canSendMessage}
              canCreateTaskFromChat={Boolean(canCreateTaskFromChat)}
              currentUserId={String(currentUser.id || "")}
              currentUserAvatarUrl={currentUser.avatarUrl}
              mentionSuggestions={mentionSuggestions}
              mentionMetaByToken={mentionMetaByToken}
              authorInfoById={authorInfoById}
              onOpenMentionUser={openMentionDirectChat}
              messageListRef={messageListRef}
              mainComposerUploadRef={mainComposerUploadRef}
              onGetThreadCount={getThreadCount}
              onOpenThread={openThreadForMessage}
              onEditingMessageValueChange={setEditingMessageValue}
              onSaveEditedMessage={saveEditedMessage}
              onCancelEditingMessage={cancelEditingMessage}
              onStartEditingMessage={startEditingMessage}
              onCopyText={copyTextToClipboard}
              onReactToMessage={reactToMessage}
              onTogglePinnedMessage={togglePinnedMessage}
              onForwardMessage={openForwardMessageDialog}
              onCreateTaskFromMessage={createTaskFromMessage}
              onDeleteMessage={deleteMessageFromChat}
              onOpenJamFromMessage={openSharedJamFromMessage}
              onJoinCallFromMessage={handleJoinCallFromMessage}
              onComposerChange={setComposer}
              onSendMessage={handleSendMessage}
              onUploadFromInput={(event) =>
                handleUploadFromInput(event, "main")
              }
              onRemoveAttachment={removeDraftAttachment}
              onMessageListScroll={handleMessageListScroll}
              hasOlderMessages={hasOlderMessages}
              isLoadingOlderMessages={isLoadingOlderMessages}
              isMessagesLoading={messagesQuery.isLoading}
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
              <Empty className="border-0 p-0 md:p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareText className="size-4 text-primary/85" />
                  </EmptyMedia>
                  <EmptyDescription className="text-center text-[12px]">
                    {roomsQuery.isLoading ? (
                      <LoaderComponent />
                    ) : hasRooms ? (
                      "Select a space to start chatting."
                    ) : (
                      "No spaces yet. Create a direct chat or group to begin."
                    )}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </section>

        <div
          className={cn(
            "hidden min-h-0 overflow-hidden xl:flex transition-[width,opacity] duration-300 ease-out",
            isDesktopThreadOpen
              ? "opacity-100"
              : "opacity-0 pointer-events-none",
          )}
          style={{ width: isDesktopThreadOpen ? threadPanelWidth + 8 : 0 }}
        >
          {isDesktopThreadOpen && (
            <>
              <button
                type="button"
                aria-label="Resize thread panel"
                onMouseDown={() => setResizingPane("thread")}
                className="relative w-2 cursor-col-resize"
              >
                <span className="bg-border/70 hover:bg-primary/60 absolute top-1/2 left-1/2 h-12 w-px -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors" />
              </button>

              <aside
                style={{ width: threadPanelWidth }}
                className="animate-in slide-in-from-right-2 fade-in duration-300 flex min-h-0 flex-col overflow-hidden rounded-md border border-border/35 bg-card/70"
              >
                <ThreadPanel
                  desktop
                  selectedThreadMessage={selectedThreadMessage}
                  activeThreadReplies={activeThreadReplies}
                  pinnedReplyIds={pinnedReplyIds}
                  editingReplyId={editingReplyId}
                  editingReplyValue={editingReplyValue}
                  threadComposer={threadComposer}
                  threadAttachments={threadAttachments}
                  canSendThreadReply={canSendThreadReply}
                  canCreateTaskFromChat={Boolean(canCreateTaskFromChat)}
                  currentUserId={String(currentUser.id || "")}
                  currentUserAvatarUrl={currentUser.avatarUrl}
                  mentionSuggestions={mentionSuggestions}
                  mentionMetaByToken={mentionMetaByToken}
                  authorInfoById={authorInfoById}
                  onOpenMentionUser={openMentionDirectChat}
                  threadComposerUploadRef={threadComposerUploadRef}
                  threadListRef={threadListRef}
                  onCloseThread={closeThread}
                  onEditingReplyValueChange={setEditingReplyValue}
                  onSaveEditedReply={saveEditedReply}
                  onCancelEditingReply={cancelEditingReply}
                  onStartEditingReply={startEditingReply}
                  onCopyText={copyTextToClipboard}
                  onReactToReply={reactToThreadReply}
                  onTogglePinnedReply={togglePinnedReply}
                  onForwardReply={openForwardMessageDialog}
                  onCreateTaskFromReply={createTaskFromMessage}
                  onDeleteThreadReply={deleteThreadReply}
                  onOpenJamFromMessage={openSharedJamFromMessage}
                  onThreadComposerChange={setThreadComposer}
                  onSendThreadReply={handleSendThreadReply}
                  onUploadFromInput={(event) =>
                    handleUploadFromInput(event, "thread")
                  }
                  onRemoveAttachment={removeDraftAttachment}
                />
              </aside>
            </>
          )}
        </div>
      </div>

      <Sheet open={isRoomsSheetOpen} onOpenChange={setIsRoomsSheetOpen}>
        <SheetContent side="left" className="w-full max-w-none p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border/35 pb-2">
            <SheetTitle>Spaces</SheetTitle>
            <SheetDescription>
              Select a personal, project, workflow, or task chat room.
            </SheetDescription>
          </SheetHeader>

          <div className="border-b border-border/35 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Chats</p>
              <Button
                size="icon-sm"
                variant="outline"
                className="size-7"
                onClick={() => setIsCreateChatOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
              <Input
                value={roomQuery}
                onChange={(event) => setRoomQuery(event.target.value)}
                placeholder="Search chats"
                className="h-9 pl-7 text-sm"
              />
            </div>
          </div>

          <div
            ref={roomListSheetRef}
            onScroll={handleRoomListScroll}
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2"
          >
            {roomsQuery.isLoading ? (
              <div className="flex h-full min-h-[14rem] items-center justify-center">
                <LoaderComponent />
              </div>
            ) : hasRooms ? (
              <>
                <RoomItems
                  roomEntries={rooms}
                  activeRoomId={activeRoom?.id || ""}
                  onPick={handleSelectRoom}
                  onQuickCall={handleQuickDirectCall}
                />
                {isLoadingMoreRooms ? (
                  <div className="flex justify-center py-1.5">
                    <LoaderComponent />
                  </div>
                ) : hasMoreRooms ? (
                  <div className="text-muted-foreground py-1 text-center text-[11px]">
                    Scroll for more spaces
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full min-h-[14rem] items-center justify-center px-2">
                <Empty className="border-0 p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageSquareText className="size-4 text-primary/85" />
                    </EmptyMedia>
                    <EmptyDescription className="text-center text-[12px]">
                      {roomQuery.trim()
                        ? "No chats match this search."
                        : "No spaces yet. Create your first chat to get started."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isThreadSheetOpen}
        onOpenChange={(open) => {
          setIsThreadSheetOpen(open);
          if (!open) {
            setSelectedThreadMessageId(null);
            setEditingReplyId(null);
            setEditingReplyValue("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-none overflow-hidden p-0 sm:max-w-sm"
        >
          <ThreadPanel
            selectedThreadMessage={selectedThreadMessage}
            activeThreadReplies={activeThreadReplies}
            pinnedReplyIds={pinnedReplyIds}
            editingReplyId={editingReplyId}
            editingReplyValue={editingReplyValue}
            threadComposer={threadComposer}
            threadAttachments={threadAttachments}
            canSendThreadReply={canSendThreadReply}
            canCreateTaskFromChat={Boolean(canCreateTaskFromChat)}
            currentUserId={String(currentUser.id || "")}
            currentUserAvatarUrl={currentUser.avatarUrl}
            mentionSuggestions={mentionSuggestions}
            mentionMetaByToken={mentionMetaByToken}
            authorInfoById={authorInfoById}
            onOpenMentionUser={openMentionDirectChat}
            threadComposerUploadRef={threadComposerUploadRef}
            threadListRef={threadListRef}
            onCloseThread={closeThread}
            onEditingReplyValueChange={setEditingReplyValue}
            onSaveEditedReply={saveEditedReply}
            onCancelEditingReply={cancelEditingReply}
            onStartEditingReply={startEditingReply}
            onCopyText={copyTextToClipboard}
            onReactToReply={reactToThreadReply}
            onTogglePinnedReply={togglePinnedReply}
            onForwardReply={openForwardMessageDialog}
            onCreateTaskFromReply={createTaskFromMessage}
            onDeleteThreadReply={deleteThreadReply}
            onOpenJamFromMessage={openSharedJamFromMessage}
            onThreadComposerChange={setThreadComposer}
            onSendThreadReply={handleSendThreadReply}
            onUploadFromInput={(event) =>
              handleUploadFromInput(event, "thread")
            }
            onRemoveAttachment={removeDraftAttachment}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isPinsSheetOpen} onOpenChange={setIsPinsSheetOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-none p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border/35 px-4 py-3">
            <SheetTitle className="text-[15px]">Pinned Messages</SheetTitle>
            <SheetDescription className="text-[12px]">
              Jump to important messages pinned in this space.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {pinnedMessagesQuery.isLoading ? (
              <div className="flex h-full min-h-[10rem] items-center justify-center">
                <LoaderComponent />
              </div>
            ) : pinnedMessages.length ? (
              <div className="space-y-2">
                {pinnedMessages.map((message) => (
                  <button
                    key={`pin-${message.id}`}
                    type="button"
                    onClick={() => openPinnedMessage(message.id)}
                    className="w-full rounded-lg border border-border/45 bg-background/70 px-3 py-2 text-left transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar size="sm" className="size-7">
                        <AvatarImage
                          src={message.author.avatarUrl}
                          alt={message.author.name}
                        />
                        <AvatarFallback className="text-[10px]">
                          {message.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium">
                          {message.author.name}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {message.sentAt}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        <Pin className="size-3.5" />
                        Pinned
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                      {getPinnedMessagePreview(message)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[10rem] items-center justify-center">
                <Empty className="border-0 p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Pin className="size-4 text-primary/85" />
                    </EmptyMedia>
                    <EmptyDescription className="text-center text-[12px]">
                      No pinned messages in this space yet.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isKeepUpOpen} onOpenChange={setIsKeepUpOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-none p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border/35 px-4 py-3">
            <SheetTitle className="text-[15px]">Keep-up</SheetTitle>
            <SheetDescription className="text-[12px]">
              Replies in threads you may have missed.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center gap-2 border-b border-border/35 px-4 py-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={keepUpSearch}
                onChange={(event) => setKeepUpSearch(event.target.value)}
                placeholder="Search updates"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-2.5 text-[12px]"
              onClick={handleMarkKeepUpSeen}
              disabled={markKeepUpSeenMutation.isPending}
            >
              Mark all seen
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {keepUpQuery.isLoading ? (
              <div className="px-4 py-4">
                <LoaderComponent />
              </div>
            ) : keepUpFilteredItems.length === 0 ? (
              <p className="text-muted-foreground px-4 py-4 text-[12.5px]">
                No missed thread replies.
              </p>
            ) : (
              <div className="divide-y divide-border/25">
                {keepUpFilteredItems.map((item) => {
                  const keepUpAuthorAvatar =
                    item.author.avatarUrl ||
                    authorInfoById[String(item.author.id || "")]?.avatarUrl ||
                    (String(item.author.id || "").trim() ===
                    String(currentUser.id || "").trim()
                      ? currentUser.avatarUrl || ""
                      : "");

                  return (
                    <article
                      key={item.id}
                      className="bg-background/75 px-4 py-2.5 transition-colors hover:bg-muted/20"
                    >
                      <div className="flex items-start gap-2.5">
                        <Avatar
                          size="sm"
                          userCard={{
                            name: item.author.name,
                            role:
                              item.author.role === "agent" ? "Agent" : "Member",
                            status: formatChatTimestamp(item.sentAt),
                          }}
                        >
                          <AvatarImage
                            src={keepUpAuthorAvatar}
                            alt={item.author.name}
                          />
                          <AvatarFallback className="text-[11px]">
                            {item.author.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[12.5px] font-medium">
                              {item.author.name}
                            </p>
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10.5px]"
                            >
                              {item.roomName}
                            </Badge>
                            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                              <Clock3 className="size-3" />
                              {formatChatTimestamp(item.sentAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-4.5">
                            {item.content}
                          </p>
                          {item.parentMessagePreview ? (
                            <div className="text-muted-foreground mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md bg-muted/25 px-2 py-1 text-[10.5px]">
                              <MessageSquareText className="size-3 shrink-0" />
                              <span className="line-clamp-1">
                                {item.parentMessagePreview}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1.5 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handleOpenKeepUpItem(item)}
                        >
                          Open thread
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/35 px-4 py-2.5">
            <p className="text-muted-foreground text-[11px]">
              Page {keepUpPagination?.page || keepUpPage} of{" "}
              {keepUpPagination?.totalPages || 1}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                className="size-7"
                onClick={() => setKeepUpPage((prev) => Math.max(1, prev - 1))}
                disabled={!(keepUpPagination?.hasPrev || keepUpPage > 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="size-7"
                onClick={() => setKeepUpPage((prev) => prev + 1)}
                disabled={!keepUpPagination?.hasNext}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateChatDialog
        open={isCreateChatOpen}
        onOpenChange={setIsCreateChatOpen}
        mode={newChatMode}
        groupName={newChatGroupName}
        search={newChatSearch}
        selectedMemberIds={selectedCreateMemberIds}
        memberOptions={createDialogMembers}
        canSubmit={canCreateChat}
        isSubmitting={createRoomMutation.isPending}
        onModeChange={(mode) => {
          setNewChatMode(mode);
          if (mode === "direct" && selectedCreateMemberIds.length > 1) {
            setSelectedCreateMemberIds(selectedCreateMemberIds.slice(0, 1));
          }
        }}
        onGroupNameChange={setNewChatGroupName}
        onSearchChange={setNewChatSearch}
        onToggleMember={(memberId) => {
          setSelectedCreateMemberIds((prev) => {
            if (newChatMode === "direct") {
              return prev.includes(memberId) ? [] : [memberId];
            }

            return prev.includes(memberId)
              ? prev.filter((id) => id !== memberId)
              : [...prev, memberId];
          });
        }}
        onSubmit={handleCreateChat}
        onCancel={() => {
          setIsCreateChatOpen(false);
          clearCreateChatForm();
        }}
      />

      <ForwardMessageDialog
        open={isForwardDialogOpen}
        onOpenChange={(open) => {
          setIsForwardDialogOpen(open);
          if (!open) {
            setForwardMessageSource(null);
            setForwardSearch("");
            setSelectedForwardTargetId("");
          }
        }}
        search={forwardSearch}
        sourcePreview={
          forwardMessageSource?.content?.trim() ||
          (forwardMessageSource?.attachments?.length
            ? `${forwardMessageSource.attachments.length} attachment${forwardMessageSource.attachments.length === 1 ? "" : "s"}`
            : "")
        }
        selectedTargetId={selectedForwardTargetId}
        targetOptions={forwardTargetOptions}
        isSubmitting={createMessageMutation.isPending || createRoomMutation.isPending}
        onSearchChange={setForwardSearch}
        onSelectTarget={setSelectedForwardTargetId}
        onSubmit={handleSubmitForwardMessage}
        onCancel={() => {
          setIsForwardDialogOpen(false);
          setForwardMessageSource(null);
          setForwardSearch("");
          setSelectedForwardTargetId("");
        }}
      />

      <WorkspaceDetailsDialog
        open={isWorkspaceDetailsOpen}
        onOpenChange={setIsWorkspaceDetailsOpen}
        workspaceName={workspaceName}
        workspaceSlug={workspaceSlug}
        workspaceType={workspaceType}
        workspaceMembers={workspaceMembers}
        roomsCount={rooms.length}
        onClose={() => setIsWorkspaceDetailsOpen(false)}
        onCopyUrl={() =>
          navigator?.clipboard?.writeText(
            `https://${workspaceSlug}.squircle.live`,
          )
        }
      />
    </>
  );
};

export default SpacesPage;
