"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Menu,
  PanelRightClose,
  Phone,
  Plus,
  Search,
  Video,
} from "lucide-react";
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
import { ROUTES } from "@/utils/constants";
import { useRouter } from "next/navigation";
import CreateChatDialog from "./components/create-chat-dialog";
import MainChatPanel from "./components/main-chat-panel";
import PersonalCallWidget from "./components/personal-call-widget";
import RoomItems from "./components/room-items";
import TeamCallWidget from "./components/team-call-widget";
import ThreadPanel from "./components/thread-panel";
import WorkspaceDetailsDialog from "./components/workspace-details-dialog";
import {
  AUTHORS,
  SEED_MESSAGES,
  SEED_ROOMS,
  SEED_THREADS,
  SCOPE_META,
  TEAM_CALL_WIDGET_KEY,
} from "./constants";
import type {
  ChatAttachment,
  ChatAuthor,
  PersonalCallState,
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
  slugify,
} from "./utils";

const SpacesPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  const [rooms, setRooms] = useState<SpaceRoom[]>(SEED_ROOMS);
  const [messagesByRoom, setMessagesByRoom] =
    useState<Record<string, SpaceMessage[]>>(SEED_MESSAGES);
  const [threadsByMessage, setThreadsByMessage] =
    useState<Record<string, ThreadReply[]>>(SEED_THREADS);

  const [roomQuery, setRoomQuery] = useState("");
  const [activeRoomId, setActiveRoomId] = useState(SEED_ROOMS[0].id);
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

  const [leftPanelWidth, setLeftPanelWidth] = useState(266);
  const [threadPanelWidth, setThreadPanelWidth] = useState(340);
  const [resizingPane, setResizingPane] = useState<"left" | "thread" | null>(
    null,
  );

  const [isRoomsSheetOpen, setIsRoomsSheetOpen] = useState(false);
  const [isThreadSheetOpen, setIsThreadSheetOpen] = useState(false);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isWorkspaceDetailsOpen, setIsWorkspaceDetailsOpen] = useState(false);
  const [personalCall, setPersonalCall] = useState<PersonalCallState | null>(
    null,
  );
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [teamCallWidget, setTeamCallWidget] =
    useState<TeamCallWidgetState | null>(null);
  const [teamCallDurationSeconds, setTeamCallDurationSeconds] = useState(0);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [pinnedReplyIds, setPinnedReplyIds] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyValue, setEditingReplyValue] = useState("");

  const [newChatPerson, setNewChatPerson] = useState("");

  const mainComposerUploadRef = useRef<HTMLInputElement | null>(null);
  const threadComposerUploadRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);

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

  const filteredRooms = useMemo(() => {
    const query = roomQuery.trim().toLowerCase();
    if (!query) {
      return rooms;
    }

    return rooms.filter((room) => {
      return (
        room.name.toLowerCase().includes(query) ||
        room.topic.toLowerCase().includes(query) ||
        SCOPE_META[room.scope].label.toLowerCase().includes(query)
      );
    });
  }, [roomQuery, rooms]);

  const activeRoom = useMemo(() => {
    return rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  }, [activeRoomId, rooms]);

  const isPersonalChat = isDirectRoom(activeRoom);

  const activeMessages = useMemo(() => {
    return messagesByRoom[activeRoom.id] ?? [];
  }, [activeRoom.id, messagesByRoom]);

  const selectedThreadMessage = useMemo(() => {
    return (
      activeMessages.find(
        (message) => message.id === selectedThreadMessageId,
      ) ?? null
    );
  }, [activeMessages, selectedThreadMessageId]);

  const activeThreadReplies = useMemo(() => {
    if (!selectedThreadMessage) {
      return [];
    }

    return threadsByMessage[selectedThreadMessage.id] ?? [];
  }, [selectedThreadMessage, threadsByMessage]);

  const isDesktopThreadOpen = Boolean(selectedThreadMessage);
  const isActivePersonalCall = personalCall?.roomId === activeRoom.id;
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

  const canSendMessage =
    composer.trim().length > 0 || composerAttachments.length > 0;
  const canSendThreadReply =
    threadComposer.trim().length > 0 || threadAttachments.length > 0;
  const canCreateChat = newChatPerson.trim().length > 1;
  const canCreateTaskFromChat =
    activeRoom.scope === "project" ||
    activeRoom.scope === "workflow" ||
    activeRoom.scope === "task";

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
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
          (isDesktopThreadOpen
            ? threadPanelWidth + minMainWidth
            : minMainWidth);
        setLeftPanelWidth(clamp(rawWidth, 220, Math.max(280, maxLeftWidth)));
      }

      if (resizingPane === "thread") {
        const rawWidth = rect.right - event.clientX;
        const maxThreadWidth = rect.width - leftPanelWidth - minMainWidth;
        setThreadPanelWidth(
          clamp(rawWidth, 280, Math.max(320, maxThreadWidth)),
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

  const clearCreateChatForm = () => {
    setNewChatPerson("");
  };

  const formatCallDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const startPersonalCall = (mode: "voice" | "video") => {
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
      };
    });

    if (target === "main") {
      setComposerAttachments((prev) => [...prev, ...nextAttachments]);
      return;
    }

    setThreadAttachments((prev) => [...prev, ...nextAttachments]);
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
      setComposerAttachments((prev) =>
        prev.filter((file) => file.id !== attachmentId),
      );
      return;
    }

    setThreadAttachments((prev) =>
      prev.filter((file) => file.id !== attachmentId),
    );
  };

  const closeThread = () => {
    setSelectedThreadMessageId(null);
    setIsThreadSheetOpen(false);
    setThreadComposer("");
    setThreadAttachments([]);
    setEditingReplyId(null);
    setEditingReplyValue("");
  };

  const handleSelectRoom = (roomId: string) => {
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

  const handleCreateChat = () => {
    const personName = newChatPerson.trim();
    if (!personName) {
      return;
    }

    const baseSlug = slugify(personName) || `dm-${rooms.length + 1}`;
    const roomId = rooms.some((room) => room.id === `dm-${baseSlug}`)
      ? `dm-${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      : `dm-${baseSlug}`;

    const nextRoom: SpaceRoom = {
      id: roomId,
      name: personName,
      scope: "team",
      visibility: "private",
      members: 2,
      unread: 0,
      topic: `Direct chat with ${personName}`,
    };

    setRooms((prev) => [nextRoom, ...prev]);
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [
        {
          id: createId(),
          roomId,
          author: AUTHORS.agent,
          content: `You started a chat with ${personName}.`,
          sentAt: "now",
        },
      ],
    }));
    setActiveRoomId(roomId);
    setIsCreateChatOpen(false);
    clearCreateChatForm();
    setEditingMessageId(null);
    setEditingMessageValue("");
    closeThread();
  };

  const handleSendMessage = () => {
    const content = composer.trim();
    if (!content && composerAttachments.length === 0) {
      return;
    }

    const nextMessage: SpaceMessage = {
      id: createId(),
      roomId: activeRoom.id,
      author: currentUser,
      content,
      sentAt: "now",
      attachments:
        composerAttachments.length > 0 ? composerAttachments : undefined,
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: [...(prev[activeRoom.id] ?? []), nextMessage],
    }));
    setComposer("");
    setComposerAttachments([]);
  };

  const handleSendThreadReply = () => {
    if (!selectedThreadMessage) {
      return;
    }

    const content = threadComposer.trim();
    if (!content && threadAttachments.length === 0) {
      return;
    }

    const nextReply: ThreadReply = {
      id: createId(),
      messageId: selectedThreadMessage.id,
      author: currentUser,
      content,
      sentAt: "now",
      attachments: threadAttachments.length > 0 ? threadAttachments : undefined,
    };

    setThreadsByMessage((prev) => ({
      ...prev,
      [selectedThreadMessage.id]: [
        ...(prev[selectedThreadMessage.id] ?? []),
        nextReply,
      ],
    }));
    setThreadComposer("");
    setThreadAttachments([]);
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
    const forwardedContent = source.content.trim();
    if (!forwardedContent && (!source.attachments || source.attachments.length === 0)) {
      return;
    }

    const nextMessage: SpaceMessage = {
      id: createId(),
      roomId: activeRoom.id,
      author: currentUser,
      content: `Forwarded from ${source.author.name}: ${forwardedContent}`,
      sentAt: "now",
      attachments:
        source.attachments && source.attachments.length > 0
          ? source.attachments
          : undefined,
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: [...(prev[activeRoom.id] ?? []), nextMessage],
    }));
  };

  const createTaskFromMessage = (
    source: Pick<SpaceMessage, "author" | "content">,
  ) => {
    if (!canCreateTaskFromChat) {
      return;
    }

    const preview = source.content.trim().slice(0, 120);
    const nextMessage: SpaceMessage = {
      id: createId(),
      roomId: activeRoom.id,
      author: AUTHORS.agent,
      content: `Task draft created from ${source.author.name}'s message: "${preview}${source.content.length > 120 ? "..." : ""}"`,
      sentAt: "now",
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: [...(prev[activeRoom.id] ?? []), nextMessage],
    }));
  };

  const startEditingMessage = (message: SpaceMessage) => {
    setEditingMessageId(message.id);
    setEditingMessageValue(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageValue("");
  };

  const saveEditedMessage = (messageId: string) => {
    const nextContent = editingMessageValue.trim();
    if (!nextContent) {
      return;
    }

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: (prev[activeRoom.id] ?? []).map((message) =>
        message.id === messageId
          ? { ...message, content: nextContent, edited: true }
          : message,
      ),
    }));

    cancelEditingMessage();
  };

  const deleteMessageFromChat = (messageId: string) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: (prev[activeRoom.id] ?? []).filter(
        (message) => message.id !== messageId,
      ),
    }));

    setThreadsByMessage((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });

    setPinnedMessageIds((prev) => prev.filter((id) => id !== messageId));

    if (selectedThreadMessageId === messageId) {
      closeThread();
    }

    if (editingMessageId === messageId) {
      cancelEditingMessage();
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
    setEditingReplyId(reply.id);
    setEditingReplyValue(reply.content);
  };

  const cancelEditingReply = () => {
    setEditingReplyId(null);
    setEditingReplyValue("");
  };

  const saveEditedReply = (replyId: string) => {
    if (!selectedThreadMessage) {
      return;
    }

    const nextContent = editingReplyValue.trim();
    if (!nextContent) {
      return;
    }

    setThreadsByMessage((prev) => ({
      ...prev,
      [selectedThreadMessage.id]: (prev[selectedThreadMessage.id] ?? []).map(
        (reply) =>
          reply.id === replyId
            ? { ...reply, content: nextContent, edited: true }
            : reply,
      ),
    }));

    cancelEditingReply();
  };

  const deleteThreadReply = (replyId: string) => {
    if (!selectedThreadMessage) {
      return;
    }

    setThreadsByMessage((prev) => ({
      ...prev,
      [selectedThreadMessage.id]: (prev[selectedThreadMessage.id] ?? []).filter(
        (reply) => reply.id !== replyId,
      ),
    }));

    setPinnedReplyIds((prev) => prev.filter((id) => id !== replyId));

    if (editingReplyId === replyId) {
      cancelEditingReply();
    }
  };

  const togglePinnedReply = (replyId: string) => {
    setPinnedReplyIds((prev) =>
      prev.includes(replyId) ? prev.filter((id) => id !== replyId) : [replyId, ...prev],
    );
  };

  const getThreadCount = (messageId: string) => {
    return threadsByMessage[messageId]?.length ?? 0;
  };

  const ActiveScopeIcon = SCOPE_META[activeRoom.scope].icon;

  return (
    <>
      <div ref={layoutRef} className="flex h-full min-h-0 w-full">
        <aside
          style={{ width: leftPanelWidth }}
          className="hidden min-h-0 flex-col overflow-hidden rounded-md border bg-card lg:flex"
        >
          <div className="border-b px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Spaces</p>
                <p className="text-muted-foreground text-[11px]">
                  Workspace, team, project, and workflow chats
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="outline"
                className="size-7"
                onClick={() => setIsCreateChatOpen(true)}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <Input
                value={roomQuery}
                onChange={(event) => setRoomQuery(event.target.value)}
                placeholder="Search chats"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            <RoomItems
              roomEntries={filteredRooms}
              activeRoomId={activeRoom.id}
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

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-x-0 border-b-0 bg-card sm:rounded-md sm:border-x sm:border-b">
          <div className="border-b px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] lg:hidden"
                onClick={() => setIsRoomsSheetOpen(true)}
              >
                <Menu className="size-3.5" />
                Chats
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 max-w-[11.5rem] px-2 text-[11px] sm:max-w-none"
                onClick={() => setIsWorkspaceDetailsOpen(true)}
              >
                <Building2 className="size-3.5" />
                {workspaceName}
              </Button>

              <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                {workspaceType}
              </Badge>

              <Badge
                variant="secondary"
                className="hidden text-[10px] min-[440px]:inline-flex"
              >
                {rooms.length} chats
              </Badge>

              <div className="ml-auto flex items-center gap-1">
                {isPersonalChat ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleStartCall("voice")}
                    >
                      <Phone className="size-3.5" />
                      {isActivePersonalCall ? "In Call" : "Voice"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleStartCall("video")}
                    >
                      <Video className="size-3.5" />
                      Video
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={openTeamCall}
                  >
                    <Video className="size-3.5" />
                    Team Call
                  </Button>
                )}

                {selectedThreadMessage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={closeThread}
                  >
                    <PanelRightClose className="size-3.5" />
                    Close Thread
                  </Button>
                ) : (
                  <Badge
                    variant="outline"
                    className="hidden text-[10px] min-[440px]:inline-flex"
                  >
                    Thread closed
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-start gap-2">
              <div className="bg-muted text-muted-foreground mt-0.5 inline-flex size-6 items-center justify-center rounded-sm border">
                <ActiveScopeIcon className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {activeRoom.name}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                  {activeRoom.topic}
                </p>
              </div>
              <Badge
                variant="outline"
                className="ml-auto hidden text-[10px] min-[440px]:inline-flex"
              >
                {SCOPE_META[activeRoom.scope].label}
              </Badge>
              {isPersonalChat && (
                <Badge
                  variant="secondary"
                  className="hidden text-[10px] min-[440px]:inline-flex"
                >
                  Direct chat
                </Badge>
              )}
            </div>
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
            canCreateTaskFromChat={canCreateTaskFromChat}
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
          />
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
                  canCreateTaskFromChat={canCreateTaskFromChat}
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
              Select a workspace, team, project, workflow, or task chat.
            </SheetDescription>
          </SheetHeader>

          <div className="border-b px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Chats</p>
              <Button
                size="icon-sm"
                variant="outline"
                className="size-7"
                onClick={() => setIsCreateChatOpen(true)}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <Input
                value={roomQuery}
                onChange={(event) => setRoomQuery(event.target.value)}
                placeholder="Search chats"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            <RoomItems
              roomEntries={filteredRooms}
              activeRoomId={activeRoom.id}
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
        <SheetContent side="right" className="w-full max-w-none p-0 sm:max-w-md">
          <ThreadPanel
            selectedThreadMessage={selectedThreadMessage}
            activeThreadReplies={activeThreadReplies}
            pinnedReplyIds={pinnedReplyIds}
            editingReplyId={editingReplyId}
            editingReplyValue={editingReplyValue}
            threadComposer={threadComposer}
            threadAttachments={threadAttachments}
            canSendThreadReply={canSendThreadReply}
            canCreateTaskFromChat={canCreateTaskFromChat}
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

      <CreateChatDialog
        open={isCreateChatOpen}
        onOpenChange={setIsCreateChatOpen}
        newChatPerson={newChatPerson}
        canCreateChat={canCreateChat}
        onNewChatPersonChange={setNewChatPerson}
        onCreateChat={handleCreateChat}
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
