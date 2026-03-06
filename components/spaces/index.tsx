"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Bell,
  Menu,
  PanelRightClose,
  Phone,
  Plus,
  Search,
  Video,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceSpace from "@/hooks/use-workspace-space";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useFile from "@/hooks/use-file";
import { ROUTES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SpaceMessageDeletedEventPayload,
  SpaceMessageEventPayload,
  SpaceMentionEventPayload,
  getSpacesSocket,
  subscribeSpaceRoom,
  unsubscribeSpaceRoom,
} from "@/lib/realtime/spaces-socket";
import CreateChatDialog from "./components/create-chat-dialog";
import MainChatPanel from "./components/main-chat-panel";
import PersonalCallWidget from "./components/personal-call-widget";
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
  PersonalCallState,
  SpaceUserInfo,
  SpaceMessage,
  SpaceRoom,
  ThreadReply,
  TeamCallWidgetState,
} from "./types";
import { clamp, createId, getInitials, isDirectRoom, parseTeamCallWidget } from "./utils";
import type {
  WorkspaceSpaceKeepUpItem,
  WorkspaceSpaceMessageRecord,
  WorkspaceSpaceRoomRecord,
} from "@/types/space";

const roomQueryParams = {
  page: 1,
  limit: 100,
} as const;

const messageQueryParams = {
  limit: 50,
} as const;

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

const mentionSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeAuthor = (author: WorkspaceSpaceMessageRecord["author"]): ChatAuthor => ({
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
  meta: room.meta,
});

const mapMessageToUi = (
  message: WorkspaceSpaceMessageRecord,
): SpaceMessage => ({
  id: String(message.id),
  roomId: String(message.roomId),
  parentMessageId: message.parentMessageId,
  author: normalizeAuthor(message.author),
  content: String(message.content || ""),
  sentAt: formatChatTimestamp(message.sentAt),
  edited: Boolean(message.edited),
  attachments: Array.isArray(message.attachments)
    ? message.attachments.map((attachment) => ({
        id: String(attachment.id),
        name: String(attachment.name),
        kind: attachment.kind,
        url: attachment.url || undefined,
      }))
    : [],
  threadCount: Number(message.threadCount || 0),
});

const SpacesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const workspaceHook = useWorkspace();
  const spaceHook = useWorkspaceSpace();
  const workspaceProjectHook = useWorkspaceProject();
  const fileHook = useFile();

  const resolvedWorkspaceId =
    workspaceId || String(user?.currentWorkspaceId?._id || "");

  const [roomQuery, setRoomQuery] = useState("");
  const [activeRoomId, setActiveRoomId] = useState("");
  const [selectedThreadMessageId, setSelectedThreadMessageId] = useState<string | null>(
    null,
  );

  const [composer, setComposer] = useState("");
  const [threadComposer, setThreadComposer] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<ChatAttachment[]>([]);
  const [threadAttachments, setThreadAttachments] = useState<ChatAttachment[]>([]);
  const [optimisticMessagesByRoom, setOptimisticMessagesByRoom] = useState<
    Record<string, SpaceMessage[]>
  >({});
  const [optimisticThreadRepliesByMessage, setOptimisticThreadRepliesByMessage] =
    useState<Record<string, ThreadReply[]>>({});

  const [leftPanelWidth, setLeftPanelWidth] = useState(266);
  const [threadPanelWidth, setThreadPanelWidth] = useState(340);
  const [resizingPane, setResizingPane] = useState<"left" | "thread" | null>(null);

  const [isRoomsSheetOpen, setIsRoomsSheetOpen] = useState(false);
  const [isThreadSheetOpen, setIsThreadSheetOpen] = useState(false);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isWorkspaceDetailsOpen, setIsWorkspaceDetailsOpen] = useState(false);
  const [isKeepUpOpen, setIsKeepUpOpen] = useState(false);

  const [personalCall, setPersonalCall] = useState<PersonalCallState | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [teamCallWidget, setTeamCallWidget] = useState<TeamCallWidgetState | null>(null);
  const [teamCallDurationSeconds, setTeamCallDurationSeconds] = useState(0);

  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [pinnedReplyIds, setPinnedReplyIds] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyValue, setEditingReplyValue] = useState("");

  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [newChatGroupName, setNewChatGroupName] = useState("");
  const [newChatSearch, setNewChatSearch] = useState("");
  const [selectedCreateMemberIds, setSelectedCreateMemberIds] = useState<string[]>([]);

  const mainComposerUploadRef = useRef<HTMLInputElement | null>(null);
  const threadComposerUploadRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const beforeOlderLoadScrollHeightRef = useRef(0);
  const beforeOlderLoadScrollTopRef = useRef(0);
  const seenMentionToastIdsRef = useRef(new Set<string>());
  const notificationServiceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const hasRequestedNotificationPermissionRef = useRef(false);
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

  const roomsQuery = spaceHook.useWorkspaceSpaceRooms(
    resolvedWorkspaceId,
    {
      ...roomQueryParams,
      search: roomQuery,
      kind: "all",
    },
    {
      enabled: Boolean(resolvedWorkspaceId),
    },
  );

  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(resolvedWorkspaceId, {
    page: 1,
    limit: 200,
    search: newChatSearch,
  });
  const workspaceMentionPeopleQuery = workspaceHook.useWorkspacePeople(
    resolvedWorkspaceId,
    {
      page: 1,
      limit: 200,
      search: "",
    },
  );

  const rooms = useMemo(
    () => (roomsQuery.data?.data?.rooms || []).map(mapRoomToUi),
    [roomsQuery.data?.data?.rooms],
  );
  const searchParamsString = searchParams.toString();
  const urlRoomId = String(searchParams.get("room") || "").trim();
  const urlThreadId = String(searchParams.get("thread") || "").trim();

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

      setActiveRoomId(rooms[0].id);
      return;
    }

    if (!activeRoomId) {
      setActiveRoomId(rooms[0].id);
      setSelectedThreadMessageId(null);
      return;
    }

    if (!rooms.some((room) => room.id === activeRoomId)) {
      if (pendingRoomSyncRef.current && pendingRoomSyncRef.current === activeRoomId) {
        return;
      }

      setActiveRoomId(rooms[0].id);
      setSelectedThreadMessageId(null);
    }
  }, [activeRoomId, rooms, urlRoomId]);

  const activeRoom = useMemo(() => {
    return rooms.find((room) => room.id === activeRoomId) ?? null;
  }, [activeRoomId, rooms]);

  const activeProjectId = String(activeRoom?.meta?.projectId || "").trim();
  const activeProjectDetailQuery = workspaceProjectHook.useWorkspaceProjectDetail(
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

    return Array.from(messageMap.values());
  }, [activeRoom?.id, optimisticMessagesByRoom, serverMessages]);

  const selectedThreadMessage = useMemo(() => {
    return (
      activeMessages.find((message) => message.id === selectedThreadMessageId) ??
      null
    );
  }, [activeMessages, selectedThreadMessageId]);

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

    if (!selectedThreadMessageId && activeMessages.some((message) => message.id === urlThreadId)) {
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

    if (pendingRoomSyncRef.current && pendingRoomSyncRef.current !== urlRoomId) {
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
      enabled: Boolean(resolvedWorkspaceId && activeRoom?.id && selectedThreadMessage?.id),
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
        edited: mapped.edited,
        attachments: mapped.attachments,
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

    return Array.from(replyMap.values());
  }, [
    optimisticThreadRepliesByMessage,
    selectedThreadMessage?.id,
    serverThreadReplies,
  ]);

  useEffect(() => {
    if (!activeRoom?.id) {
      return;
    }

    if (!serverMessages.length) {
      return;
    }

    const serverMessageIds = new Set(serverMessages.map((message) => message.id));

    setOptimisticMessagesByRoom((prev) => {
      const current = prev[activeRoom.id] || [];
      if (!current.length) {
        return prev;
      }

      const next = current.filter((message) => !serverMessageIds.has(message.id));
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

    const serverReplyIds = new Set(serverThreadReplies.map((reply) => reply.id));

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
      page: 1,
      limit: 30,
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

  const createRoomMutation = spaceHook.useCreateWorkspaceSpaceRoom();
  const createMessageMutation = spaceHook.useCreateWorkspaceSpaceMessage();
  const updateMessageMutation = spaceHook.useUpdateWorkspaceSpaceMessage();
  const deleteMessageMutation = spaceHook.useDeleteWorkspaceSpaceMessage();
  const createThreadReplyMutation = spaceHook.useCreateWorkspaceSpaceThreadReply();
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
  const hasOlderMessages = Boolean(messagesQuery.hasNextPage);
  const isLoadingOlderMessages = Boolean(messagesQuery.isFetchingNextPage);

  const createDialogMembers = useMemo(() => {
    const members = workspacePeopleQuery.data?.data?.members ?? [];

    return members
      .filter((entry) => String(entry?.userId?._id || "") !== String(currentUser.id || ""))
      .map((entry) => ({
        id: String(entry.userId._id),
        name:
          `${entry?.userId?.firstName || ""} ${entry?.userId?.lastName || ""}`.trim() ||
          entry?.userId?.email ||
          "Unknown",
        email: String(entry?.userId?.email || ""),
      }));
  }, [workspacePeopleQuery.data?.data?.members, currentUser.id]);

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
      const emailAlias = String(entry?.userId?.email || "").split("@")[0] || display;
      const id = mentionSlug(display) || mentionSlug(emailAlias);

      if (!id) {
        return;
      }

      byToken[id] = {
        token: id,
        label: display,
        kind: "user",
        user: {
          id: String(entry?.userId?._id || ""),
          name: display,
          email: String(entry?.userId?.email || ""),
          role:
            Array.isArray(entry?.roles) && entry.roles.length
              ? entry.roles.map((role) => String(role?.name || "")).filter(Boolean).join(", ")
              : "Member",
          team:
            Array.isArray(entry?.teams) && entry.teams.length
              ? entry.teams.map((team) => String(team?.name || "")).filter(Boolean).join(", ")
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
      entries.push({
        id,
        display,
      });
    });

    const projectName =
      String(activeProjectDetailQuery.data?.data?.project?.name || activeRoom?.name || "").trim();
    const projectId = mentionSlug(projectName);

    if (projectId && !seenIds.has(`project-${projectId}`)) {
      seenIds.add(`project-${projectId}`);
      entries.push({
        id: `project-${projectId}`,
        display: `project:${projectName || "current-project"}`,
      });
      byToken[`project-${projectId}`] = {
        token: `project-${projectId}`,
        label: `project:${projectName || "current-project"}`,
        kind: "project",
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
      });
      byToken[id] = {
        token: id,
        label: `team:${teamName}`,
        kind: "team",
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
        });
        byToken[id] = {
          token: id,
          label: `team:${activeRoom.name}`,
          kind: "team",
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
        role:
          Array.isArray(entry?.roles) && entry.roles.length
            ? entry.roles.map((role) => String(role?.name || "")).filter(Boolean).join(", ")
            : "Member",
        team:
          Array.isArray(entry?.teams) && entry.teams.length
            ? entry.teams.map((team) => String(team?.name || "")).filter(Boolean).join(", ")
            : undefined,
      };
    });

    if (currentUser.id && !infoById[currentUser.id]) {
      infoById[currentUser.id] = {
        id: currentUser.id,
        name: currentUser.name,
      };
    }

    return infoById;
  }, [
    currentUser.id,
    currentUser.name,
    workspaceMentionPeopleQuery.data?.data?.members,
  ]);

  const canCreateChat =
    newChatMode === "direct"
      ? selectedCreateMemberIds.length === 1
      : Boolean(newChatGroupName.trim()) && selectedCreateMemberIds.length >= 1;

  const isDesktopThreadOpen = Boolean(selectedThreadMessage);
  const isActivePersonalCall = personalCall?.roomId === activeRoom?.id;
  const personalCallStartedAt = personalCall?.startedAt ?? null;
  const personalCallInitials = useMemo(() => {
    if (!personalCall?.contactName) {
      return "PC";
    }

    return personalCall.contactName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [personalCall?.contactName]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    if (isLoadingOlderMessagesRef.current) {
      const delta = container.scrollHeight - beforeOlderLoadScrollHeightRef.current;
      container.scrollTop = beforeOlderLoadScrollTopRef.current + Math.max(0, delta);
      isLoadingOlderMessagesRef.current = false;
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
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
    if (!personalCallStartedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setCallDurationSeconds(
        Math.floor((Date.now() - personalCallStartedAt) / 1000),
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [personalCallStartedAt]);

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
          (isDesktopThreadOpen ? threadPanelWidth + minMainWidth : minMainWidth);
        setLeftPanelWidth(clamp(rawWidth, 220, Math.max(280, maxLeftWidth)));
      }

      if (resizingPane === "thread") {
        const rawWidth = rect.right - event.clientX;
        const maxThreadWidth = rect.width - leftPanelWidth - minMainWidth;
        setThreadPanelWidth(clamp(rawWidth, 280, Math.max(320, maxThreadWidth)));
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

    if (selectedThreadMessageId) {
      next.set("thread", selectedThreadMessageId);
    } else {
      next.delete("thread");
    }

    const nextRoute = `${ROUTES.SPACES}?${next.toString()}`;
    router.replace(nextRoute, { scroll: false });
  }, [
    activeRoom?.id,
    router,
    searchParamsString,
    selectedThreadMessageId,
    urlRoomId,
    urlThreadId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;

    navigator.serviceWorker
      .register("/spaces-notifications-sw.js")
      .then((registration) => {
        if (!mounted) {
          return;
        }
        notificationServiceWorkerRef.current = registration;
      })
      .catch(() => {
        // browser notification service worker is optional
      });

    return () => {
      mounted = false;
    };
  }, []);

  const showBrowserMentionNotification = useCallback(
    async (payload: {
      id: string;
      title?: string;
      summary?: string;
      route?: string;
    }) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      let permission = Notification.permission;

      if (permission === "default" && !hasRequestedNotificationPermissionRef.current) {
        hasRequestedNotificationPermissionRef.current = true;
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = Notification.permission;
        }
      }

      if (permission !== "granted") {
        return;
      }

      const title = String(payload.title || "You were mentioned").trim();
      const body = String(payload.summary || "").trim();
      const route = String(payload.route || ROUTES.SPACES).trim() || ROUTES.SPACES;

      const registration =
        notificationServiceWorkerRef.current ||
        (await navigator.serviceWorker.getRegistration().catch(() => null));

      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          tag: `spaces-mention-${payload.id}`,
          data: {
            route,
          },
        });
        return;
      }

      const notification = new Notification(title, {
        body,
        tag: `spaces-mention-${payload.id}`,
        data: { route },
      });

      notification.onclick = () => {
        window.focus();
        router.push(route);
        notification.close();
      };
    },
    [router],
  );

  useEffect(() => {
    const socket = getSpacesSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleMentionCreated = ({ mention }: SpaceMentionEventPayload) => {
      if (!mention?.id) {
        return;
      }

      if (seenMentionToastIdsRef.current.has(mention.id)) {
        return;
      }

      seenMentionToastIdsRef.current.add(mention.id);

      toast(mention.title || "You were mentioned", {
        description: mention.summary || "",
        action: {
          label: "Open",
          onClick: () => {
            router.push(mention.route || ROUTES.SPACES);
          },
        },
      });

      void showBrowserMentionNotification({
        id: String(mention.id),
        title: mention.title,
        summary: mention.summary,
        route: mention.route,
      });
    };

    socket.on("spaces:mention:created", handleMentionCreated);

    return () => {
      socket.off("spaces:mention:created", handleMentionCreated);
    };
  }, [router, showBrowserMentionNotification]);

  useEffect(() => {
    if (!resolvedWorkspaceId || !activeRoom?.id) {
      return;
    }

    const socket = subscribeSpaceRoom({
      workspaceId: resolvedWorkspaceId,
      roomId: activeRoom.id,
    });

    const handleMessageCreated = ({
      workspaceId,
      roomId,
    }: SpaceMessageEventPayload) => {
      if (String(workspaceId) !== String(resolvedWorkspaceId)) {
        return;
      }

      if (String(roomId) !== String(activeRoom.id)) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-room-messages", resolvedWorkspaceId, activeRoom.id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages-infinite",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-rooms", resolvedWorkspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-keep-up", resolvedWorkspaceId],
      });
    };

    const handleMessageUpdated = ({
      workspaceId,
      roomId,
    }: SpaceMessageEventPayload) => {
      if (String(workspaceId) !== String(resolvedWorkspaceId)) {
        return;
      }

      if (String(roomId) !== String(activeRoom.id)) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-room-messages", resolvedWorkspaceId, activeRoom.id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages-infinite",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          activeRoom.id,
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

      if (String(roomId) !== String(activeRoom.id)) {
        return;
      }

      if (selectedThreadMessageId === String(messageId) ||
          selectedThreadMessageId === String(parentMessageId || "")) {
        setSelectedThreadMessageId(null);
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-spaces-room-messages", resolvedWorkspaceId, activeRoom.id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-room-messages-infinite",
          resolvedWorkspaceId,
          activeRoom.id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "workspace-spaces-thread-replies",
          resolvedWorkspaceId,
          activeRoom.id,
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
      unsubscribeSpaceRoom({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
      });
    };
  }, [
    activeRoom?.id,
    queryClient,
    resolvedWorkspaceId,
    selectedThreadMessageId,
  ]);

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

  const startPersonalCall = (mode: "voice" | "video") => {
    if (!activeRoom) {
      return;
    }

    setCallDurationSeconds(0);
    setPersonalCall({
      roomId: activeRoom.id,
      contactName: activeRoom.name,
      mode,
      startedAt: Date.now(),
      isMuted: false,
      isVideoOn: mode === "video",
      isSpeakerOn: true,
    });
  };

  const endPersonalCall = () => {
    setPersonalCall(null);
    setCallDurationSeconds(0);
  };

  const clearTeamCallWidget = () => {
    window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
    setTeamCallWidget(null);
    setTeamCallDurationSeconds(0);
  };

  const openTeamCall = () => {
    if (!activeRoom) {
      return;
    }

    clearTeamCallWidget();

    const query = new URLSearchParams({
      room: activeRoom.name,
      scope: activeRoom.scope,
    });
    router.push(`${ROUTES.SPACES_TEAM_CALL}?${query.toString()}`);
  };

  const rejoinTeamCall = () => {
    if (!teamCallWidget) {
      return;
    }

    const query = new URLSearchParams({
      room: teamCallWidget.roomName,
      scope: teamCallWidget.roomScope,
      startedAt: `${teamCallWidget.startedAt}`,
    });
    router.push(`${ROUTES.SPACES_TEAM_CALL}?${query.toString()}`);
  };

  const handleStartCall = (mode: "voice" | "video") => {
    if (isPersonalChat) {
      startPersonalCall(mode);
      return;
    }

    openTeamCall();
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
  ): Promise<Array<{ id: string; name: string; kind: "image" | "file"; url?: string }>> => {
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
        const assetResourceType = String(asset?.resourceType || "").toLowerCase();
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
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) {
      return;
    }

    const container = messageListRef.current;
    if (!container) {
      return;
    }

    beforeOlderLoadScrollHeightRef.current = container.scrollHeight;
    beforeOlderLoadScrollTopRef.current = container.scrollTop;
    isLoadingOlderMessagesRef.current = true;
    void messagesQuery.fetchNextPage();
  };

  const handleMessageListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;

    if (target.scrollTop <= 80) {
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

  const appendOptimisticRoomMessage = (roomId: string, message: SpaceMessage) => {
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

  const appendOptimisticThreadReply = (messageId: string, reply: ThreadReply) => {
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
      sentAt: "Sending...",
      edited: false,
      attachments: draftAttachments,
      threadCount: 0,
    };

    setComposer("");
    setComposerAttachments([]);
    appendOptimisticRoomMessage(roomId, optimisticMessage);

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
        replaceOptimisticRoomMessage(roomId, optimisticMessageId, persistedMessage);
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
    if (
      !resolvedWorkspaceId ||
      !activeRoom ||
      !selectedThreadMessage
    ) {
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
      sentAt: "Sending...",
      edited: false,
      attachments: draftAttachments,
    };

    setThreadComposer("");
    setThreadAttachments([]);
    appendOptimisticThreadReply(messageId, optimisticReply);

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
          edited: mappedReply.edited,
          attachments: mappedReply.attachments,
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

  const forwardToMainChat = (
    source: Pick<SpaceMessage, "author" | "content" | "attachments">,
  ) => {
    if (!resolvedWorkspaceId || !activeRoom) {
      return;
    }

    const forwardedContent = source.content.trim();
    if (!forwardedContent && (!source.attachments || source.attachments.length === 0)) {
      return;
    }

    void createMessageMutation
      .mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        payload: {
          content: `Forwarded from ${source.author.name}: ${forwardedContent}`,
          attachments: source.attachments,
        },
      })
      .then(() => upsertMessageCache(activeRoom.id));
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
    if (!resolvedWorkspaceId || !activeRoom || updateMessageMutation.isPending) {
      return;
    }

    const targetMessage = activeMessages.find((message) => message.id === messageId);
    if (!targetMessage || String(targetMessage.author.id || "") !== String(currentUser.id || "")) {
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
    if (!resolvedWorkspaceId || !activeRoom || deleteMessageMutation.isPending) {
      return;
    }

    const targetMessage = activeMessages.find((message) => message.id === messageId);
    if (!targetMessage || String(targetMessage.author.id || "") !== String(currentUser.id || "")) {
      return;
    }

    try {
      await deleteMessageMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        roomId: activeRoom.id,
        messageId,
      });

      setPinnedMessageIds((prev) => prev.filter((id) => id !== messageId));

      if (selectedThreadMessageId === messageId) {
        closeThread();
      }

      if (editingMessageId === messageId) {
        cancelEditingMessage();
      }

      upsertMessageCache(activeRoom.id);
    } catch {
      // handled by shared hook
    }
  };

  const togglePinnedMessage = (messageId: string) => {
    setPinnedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [messageId, ...prev],
    );
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
    if (!resolvedWorkspaceId || !activeRoom || updateMessageMutation.isPending) {
      return;
    }

    const targetReply = activeThreadReplies.find((reply) => reply.id === replyId);
    if (!targetReply || String(targetReply.author.id || "") !== String(currentUser.id || "")) {
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
    if (!resolvedWorkspaceId || !activeRoom || deleteMessageMutation.isPending) {
      return;
    }

    const targetReply = activeThreadReplies.find((reply) => reply.id === replyId);
    if (!targetReply || String(targetReply.author.id || "") !== String(currentUser.id || "")) {
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
      prev.includes(replyId) ? prev.filter((id) => id !== replyId) : [replyId, ...prev],
    );
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
    if (!normalizedTargetUserId || normalizedTargetUserId === String(currentUser.id || "")) {
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

  const ActiveScopeIcon = activeRoom ? SCOPE_META[activeRoom.scope].icon : Search;

  return (
    <>
      <div
        ref={layoutRef}
        className="flex min-h-0 w-full flex-1 overflow-hidden"
      >
        <aside
          style={{ width: leftPanelWidth }}
          className="hidden min-h-0 flex-col overflow-hidden rounded-md border bg-card lg:flex"
        >
          <div className="border-b px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Spaces</p>
                <p className="text-muted-foreground text-[12px]">
                  Personal chats, project rooms, task threads
                </p>
              </div>
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

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            <RoomItems
              roomEntries={rooms}
              activeRoomId={activeRoom?.id || ""}
              onPick={handleSelectRoom}
            />
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

        <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-x-0 border-b-0 bg-card sm:rounded-md sm:border-x sm:border-b">
          <div className="border-b px-3 py-2.5">
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

              <Badge variant="outline" className="hidden text-[11px] sm:inline-flex">
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
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-[13px]"
                  onClick={() => setIsKeepUpOpen(true)}
                >
                  <Bell className="size-4" />
                  Keep-up
                  {keepUpCount > 0 && (
                    <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[11px]">
                      {keepUpCount}
                    </Badge>
                  )}
                </Button>

                {isPersonalChat ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-[13px]"
                      onClick={() => handleStartCall("voice")}
                    >
                      <Phone className="size-4" />
                      {isActivePersonalCall ? "In Call" : "Voice"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-[13px]"
                      onClick={() => handleStartCall("video")}
                    >
                      <Video className="size-4" />
                      Video
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-[13px]"
                    onClick={openTeamCall}
                    disabled={!activeRoom}
                  >
                    <Video className="size-4" />
                    Team Call
                  </Button>
                )}

                {selectedThreadMessage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-[13px]"
                    onClick={closeThread}
                  >
                    <PanelRightClose className="size-4" />
                    Close Thread
                  </Button>
                ) : (
                  <Badge
                    variant="outline"
                    className="hidden text-[11px] min-[440px]:inline-flex"
                  >
                    Thread closed
                  </Badge>
                )}
              </div>
            </div>

            {activeRoom && (
              <div className="mt-2 flex flex-wrap items-start gap-2">
                <div className="bg-muted text-muted-foreground mt-0.5 inline-flex size-6 items-center justify-center rounded-sm border">
                  <ActiveScopeIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{activeRoom.name}</p>
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
          </div>

          {personalCall && (
            <PersonalCallWidget
              personalCall={personalCall}
              personalCallInitials={personalCallInitials}
              callDurationSeconds={callDurationSeconds}
              formatCallDuration={formatCallDuration}
              onToggleMute={() =>
                setPersonalCall((prev) =>
                  prev ? { ...prev, isMuted: !prev.isMuted } : prev,
                )
              }
              onToggleVideo={() =>
                setPersonalCall((prev) =>
                  prev ? { ...prev, isVideoOn: !prev.isVideoOn } : prev,
                )
              }
              onToggleSpeaker={() =>
                setPersonalCall((prev) =>
                  prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : prev,
                )
              }
              onEndCall={endPersonalCall}
            />
          )}

          {teamCallWidget && (
            <TeamCallWidget
              teamCallWidget={teamCallWidget}
              teamCallDurationSeconds={teamCallDurationSeconds}
              formatCallDuration={formatCallDuration}
              className={
                personalCall
                  ? personalCall.mode === "video"
                    ? "top-[11.1rem]"
                    : "top-[7.2rem]"
                  : "top-3"
              }
              onRejoin={rejoinTeamCall}
              onClear={clearTeamCallWidget}
            />
          )}

          <MainChatPanel
            activeMessages={activeMessages}
            selectedThreadMessageId={selectedThreadMessageId}
            pinnedMessageIds={pinnedMessageIds}
            editingMessageId={editingMessageId}
            editingMessageValue={editingMessageValue}
            composer={composer}
            composerAttachments={composerAttachments}
            canSendMessage={canSendMessage}
            canCreateTaskFromChat={Boolean(canCreateTaskFromChat)}
            currentUserId={String(currentUser.id || "")}
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
            onTogglePinnedMessage={togglePinnedMessage}
            onForwardMessage={forwardToMainChat}
            onCreateTaskFromMessage={createTaskFromMessage}
            onDeleteMessage={deleteMessageFromChat}
            onComposerChange={setComposer}
            onSendMessage={handleSendMessage}
            onUploadFromInput={(event) => handleUploadFromInput(event, "main")}
            onRemoveAttachment={removeDraftAttachment}
            onMessageListScroll={handleMessageListScroll}
            hasOlderMessages={hasOlderMessages}
            isLoadingOlderMessages={isLoadingOlderMessages}
          />
        </section>

        <div
          className={cn(
            "hidden min-h-0 overflow-hidden xl:flex transition-[width,opacity] duration-300 ease-out",
            isDesktopThreadOpen ? "opacity-100" : "opacity-0 pointer-events-none",
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
                className="animate-in slide-in-from-right-2 fade-in duration-300 flex min-h-0 flex-col overflow-hidden rounded-md border bg-card"
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
                  onTogglePinnedReply={togglePinnedReply}
                  onForwardReply={forwardToMainChat}
                  onCreateTaskFromReply={createTaskFromMessage}
                  onDeleteThreadReply={deleteThreadReply}
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
          <SheetHeader className="border-b pb-2">
            <SheetTitle>Spaces</SheetTitle>
            <SheetDescription>
              Select a personal, project, workflow, or task chat room.
            </SheetDescription>
          </SheetHeader>

          <div className="border-b px-3 py-2.5">
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

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            <RoomItems
              roomEntries={rooms}
              activeRoomId={activeRoom?.id || ""}
              onPick={handleSelectRoom}
            />
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
        <SheetContent side="right" className="w-full max-w-none overflow-hidden p-0 sm:max-w-md">
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
            onTogglePinnedReply={togglePinnedReply}
            onForwardReply={forwardToMainChat}
            onCreateTaskFromReply={createTaskFromMessage}
            onDeleteThreadReply={deleteThreadReply}
            onThreadComposerChange={setThreadComposer}
            onSendThreadReply={handleSendThreadReply}
            onUploadFromInput={(event) => handleUploadFromInput(event, "thread")}
            onRemoveAttachment={removeDraftAttachment}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isKeepUpOpen} onOpenChange={setIsKeepUpOpen}>
        <SheetContent side="right" className="w-full max-w-none p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-4 pb-3">
            <SheetTitle>Keep-up</SheetTitle>
            <SheetDescription>
              Replies in threads you may have missed.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-muted-foreground text-[12px]">
              {keepUpQuery.data?.data?.pagination?.total || 0} pending thread updates
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[12px]"
              onClick={handleMarkKeepUpSeen}
              disabled={markKeepUpSeenMutation.isPending}
            >
              Mark all seen
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {keepUpQuery.isLoading ? (
              <p className="text-muted-foreground text-[13px]">Loading updates...</p>
            ) : (keepUpQuery.data?.data?.items?.length || 0) === 0 ? (
              <p className="text-muted-foreground text-[13px]">No missed thread replies.</p>
            ) : (
              <div className="space-y-2">
                {(keepUpQuery.data?.data?.items || []).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-md border px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[13px] font-medium">{item.author.name}</p>
                      <Badge variant="outline" className="text-[11px]">
                        {item.roomName}
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        {formatChatTimestamp(item.sentAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px]">{item.content}</p>
                    {item.parentMessagePreview && (
                      <p className="text-muted-foreground mt-1 line-clamp-1 text-[11px]">
                        Thread root: {item.parentMessagePreview}
                      </p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 px-2.5 text-[12px]"
                        onClick={() => handleOpenKeepUpItem(item)}
                      >
                        Open thread
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
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
          navigator?.clipboard?.writeText(`https://${workspaceSlug}.squircle.live`)
        }
      />
    </>
  );
};

export default SpacesPage;
