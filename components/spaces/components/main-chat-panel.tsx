import type React from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  FileText,
  Gem,
  Shapes,
  MessageSquareReply,
  Phone,
  Plus,
  Bookmark,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatAttachment, SpaceMessage } from "../types";
import AttachmentPreview from "./attachment-preview";
import ChatItemActionsMenu from "./chat-item-actions-menu";
import RichMessageContent from "./rich-message-content";
import RichMessageComposer from "./rich-message-composer";
import MessageMarkdown from "@/components/ask-squircle/components/message-markdown";
import type {
  MentionSuggestion,
  MentionTokenMeta,
  SpaceUserInfo,
} from "../types";
import { parseJamShareMessage, parseDocShareMessage, extractFirstExternalUrl } from "../utils";
import OgPreviewCard from "./og-preview-card";
import { TypingIndicator, type TypingUser } from "./typing-indicator";
import LoaderComponent from "@/components/shared/loader";
import { Skeleton } from "@/components/ui/skeleton";

type MainChatPanelProps = {
  activeMessages: SpaceMessage[];
  selectedThreadMessageId: string | null;
  anchorMessageId: string | null;
  editingMessageId: string | null;
  editingMessageValue: string;
  composer: string;
  composerAttachments: ChatAttachment[];
  canSendMessage: boolean;
  canCreateTaskFromChat: boolean;
  currentUserId: string;
  currentUserAvatarUrl?: string;
  mentionSuggestions: MentionSuggestion[];
  reportMentionSuggestions: MentionSuggestion[];
  mentionMetaByToken: Record<string, MentionTokenMeta>;
  reportMetaByToken: Record<string, MentionTokenMeta>;
  authorInfoById: Record<string, SpaceUserInfo>;
  onOpenMentionUser: (userId: string) => void;
  onOpenReport: (reportId: string) => void;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  mainComposerUploadRef: React.RefObject<HTMLInputElement | null>;
  onGetThreadCount: (messageId: string) => number;
  onOpenThread: (messageId: string) => void;
  onEditingMessageValueChange: (value: string) => void;
  onSaveEditedMessage: (messageId: string) => void;
  onCancelEditingMessage: () => void;
  onStartEditingMessage: (message: SpaceMessage) => void;
  onCopyText: (value: string) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onTogglePinnedMessage: (messageId: string) => void;
  onForwardMessage: (
    message: Pick<SpaceMessage, "author" | "content" | "attachments">,
  ) => void;
  onCreateTaskFromMessage: (
    message: Pick<SpaceMessage, "author" | "content">,
  ) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenJamFromMessage: (jamId: string) => void;
  onJoinCallFromMessage: (route?: string) => void;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  onAttachFiles: (files: File[], target: "main" | "thread") => void;
  onUploadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (attachmentId: string, target: "main" | "thread") => void;
  onMessageListScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isMessagesLoading?: boolean;
  isAiThinking?: boolean;
  typingUsers?: TypingUser[];
};

const parseMessageTimestamp = (message: SpaceMessage) => {
  const raw = String(message.sentAtRaw || "").trim();
  if (raw) {
    const parsedRaw = new Date(raw);
    if (!Number.isNaN(parsedRaw.getTime())) {
      return parsedRaw;
    }
  }

  const normalizedSentAt = String(message.sentAt || "").trim();
  if (/^\d{1,2}:\d{2}$/.test(normalizedSentAt)) {
    const [hours, minutes] = normalizedSentAt.split(":").map(Number);
    const today = new Date();
    today.setHours(hours || 0, minutes || 0, 0, 0);
    return today;
  }

  const parsedShortDate = new Date(
    `${normalizedSentAt}, ${new Date().getFullYear()}`,
  );
  if (!Number.isNaN(parsedShortDate.getTime())) {
    return parsedShortDate;
  }

  return null;
};

const isSameCalendarDay = (left: Date | null, right: Date | null) => {
  if (!left || !right) {
    return false;
  }

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const formatMessageDayLabel = (value: Date | null) => {
  if (!value) {
    return "Recent";
  }

  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const valueStart = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
  const diffDays = Math.floor(
    (nowStart.getTime() - valueStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
};

const QUICK_REACTION_OPTIONS = ["👍", "❤️", "🔥", "🎉", "😂"] as const;
const EXTENDED_REACTION_OPTIONS = [
  "👏",
  "🙌",
  "🤝",
  "🙏",
  "💯",
  "✅",
  "🤔",
  "😮",
  "😢",
  "😡",
  "🚀",
  "👀",
  "🎯",
  "🥳",
  "💡",
  "🫡",
  "😄",
  "😎",
  "🤯",
  "😴",
] as const;

const MainChatPanel = ({
  activeMessages,
  selectedThreadMessageId,
  anchorMessageId,
  editingMessageId,
  editingMessageValue,
  composer,
  composerAttachments,
  canSendMessage,
  canCreateTaskFromChat,
  currentUserId,
  currentUserAvatarUrl,
  mentionSuggestions,
  reportMentionSuggestions,
  mentionMetaByToken,
  reportMetaByToken,
  authorInfoById,
  onOpenMentionUser,
  onOpenReport,
  messageListRef,
  mainComposerUploadRef,
  onGetThreadCount,
  onOpenThread,
  onEditingMessageValueChange,
  onSaveEditedMessage,
  onCancelEditingMessage,
  onStartEditingMessage,
  onCopyText,
  onReactToMessage,
  onTogglePinnedMessage,
  onForwardMessage,
  onCreateTaskFromMessage,
  onDeleteMessage,
  onOpenJamFromMessage,
  onJoinCallFromMessage,
  onComposerChange,
  onSendMessage,
  onAttachFiles,
  onUploadFromInput,
  onRemoveAttachment,
  onMessageListScroll,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  isMessagesLoading = false,
  isAiThinking = false,
  typingUsers = [],
}: MainChatPanelProps) => {
  const messageElementRefs = useRef<Record<string, HTMLElement | null>>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [activeMobileMessageId, setActiveMobileMessageId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!highlightedMessageId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [highlightedMessageId]);

  useEffect(() => {
    if (!anchorMessageId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = messageElementRefs.current[anchorMessageId];
      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightedMessageId(anchorMessageId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeMessages, anchorMessageId]);

  const toTitleCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");

  const formatMentionFallbackLabel = (token: string) => {
    const normalizedToken = String(token || "")
      .trim()
      .toLowerCase();
    const base = normalizedToken.replace(/[_-]+/g, " ").replace(/\./g, " ");

    if (normalizedToken.startsWith("team-")) {
      return `team:${toTitleCase(base.slice("team ".length).trim())}`;
    }

    if (normalizedToken.startsWith("project-")) {
      return `project:${toTitleCase(base.slice("project ".length).trim())}`;
    }

    if (normalizedToken.startsWith("report-")) {
      return "Report";
    }

    return toTitleCase(base);
  };

  const getMentionAvatarFallback = (
    label: string,
    kind?: MentionTokenMeta["kind"],
  ) => {
    const normalized = String(label || "")
      .replace(/^(team|project|report)\s*:/i, "")
      .trim();

    const letters = normalized
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");

    if (letters) {
      return letters;
    }

    if (kind === "project") {
      return "PR";
    }

    if (kind === "report") {
      return "RP";
    }

    if (kind === "team") {
      return "TM";
    }

    return "U";
  };

  const renderContentWithMentions = (content: string) => {
    const input = String(content || "");
    const mentionPattern = /([@#])([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;
    const chunks: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = mentionPattern.exec(input);

    while (match) {
      const mentionStart = match.index;
      const mentionEnd = mentionStart + match[0].length;
      const symbol = String(match[1] || "@");
      const token = String(match[2] || "").toLowerCase();
      const mentionMeta =
        symbol === "#" ? reportMetaByToken[token] : mentionMetaByToken[token];

      if (mentionStart > lastIndex) {
        chunks.push(input.slice(lastIndex, mentionStart));
      }

      if (!mentionMeta) {
        const fallbackLabel = formatMentionFallbackLabel(token);
        if (symbol === "#") {
          chunks.push(
            <span
              key={`mention-fallback-${token}-${mentionStart}`}
              className="inline-flex items-center gap-1 rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300"
            >
              <span className="inline-flex size-4 items-center justify-center rounded-sm bg-orange-500/18">
                <FileText className="size-2.5" />
              </span>
              {symbol}
              {fallbackLabel}
            </span>,
          );
        } else {
          chunks.push(
            <span
              key={`mention-fallback-${token}-${mentionStart}`}
              className="inline-flex items-center gap-1 rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300"
            >
              <Avatar className="size-4">
                <AvatarFallback className="text-[9px] font-medium">
                  {getMentionAvatarFallback(fallbackLabel)}
                </AvatarFallback>
              </Avatar>
              {symbol}
              {fallbackLabel}
            </span>,
          );
        }
      } else {
        const mentionLabel = `${symbol}${mentionMeta.label}`;

        if (mentionMeta.kind === "user" && mentionMeta.user) {
          const mentionAvatarFallback = getMentionAvatarFallback(
            mentionMeta.user.name,
            mentionMeta.kind,
          );
          chunks.push(
            <Tooltip
              key={`mention-${token}-${mentionStart}`}
              delayDuration={100}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300 transition-colors hover:bg-orange-500/20"
                  onClick={() => onOpenMentionUser(mentionMeta.user?.id || "")}
                >
                  <Avatar className="size-4">
                    <AvatarImage
                      src={mentionMeta.user.avatarUrl}
                      alt={mentionMeta.user.name}
                    />
                    <AvatarFallback className="text-[9px] font-medium">
                      {mentionAvatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  {mentionLabel}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                sideOffset={8}
                showArrow={false}
                className="w-72 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={mentionMeta.user.avatarUrl}
                        alt={mentionMeta.user.name}
                      />
                      <AvatarFallback className="text-[11px] font-medium">
                        {mentionAvatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-0.5">
                      <div className="truncate text-[13px] font-semibold">
                        {mentionMeta.user.name}
                      </div>
                      {mentionMeta.user.email ? (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {mentionMeta.user.email}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    {mentionMeta.user.role ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Role</span>
                        <span className="truncate text-right font-medium">
                          {mentionMeta.user.role}
                        </span>
                      </div>
                    ) : null}
                    {mentionMeta.user.team ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Team</span>
                        <span className="truncate text-right font-medium">
                          {mentionMeta.user.team}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 border-t pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() =>
                        onOpenMentionUser(mentionMeta.user?.id || "")
                      }
                    >
                      Message
                    </Button>
                    {mentionMeta.user.email ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.location.href = `mailto:${mentionMeta.user?.email}`;
                          }
                        }}
                      >
                        Email
                      </Button>
                    ) : null}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>,
          );
        } else {
          if (mentionMeta.kind === "report" && mentionMeta.report?.id) {
            chunks.push(
              <Tooltip
                key={`mention-${token}-${mentionStart}`}
                delayDuration={100}
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300 transition-colors hover:bg-orange-500/20"
                    onClick={() => onOpenReport(mentionMeta.report?.id || "")}
                  >
                    <span className="inline-flex size-4 items-center justify-center rounded-sm bg-orange-500/18">
                      <FileText className="size-2.5" />
                    </span>
                    {mentionLabel}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  showArrow={false}
                  className="w-72 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-lg"
                >
                  <div className="space-y-1.5">
                    <p className="truncate text-[13px] font-semibold">
                      {mentionMeta.report?.title || mentionMeta.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {mentionMeta.subtitle || "Workspace report"}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>,
            );
            lastIndex = mentionEnd;
            match = mentionPattern.exec(input);
            continue;
          }

          if (mentionMeta.kind === "agent") {
            chunks.push(
              <span
                key={`mention-${token}-${mentionStart}`}
                className="inline-flex items-center gap-1 rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300"
              >
                <span className="inline-flex size-4 items-center justify-center rounded-sm bg-orange-500/18">
                  <Gem className="size-2.5" />
                </span>
                {mentionLabel}
              </span>,
            );
            lastIndex = mentionEnd;
            match = mentionPattern.exec(input);
            continue;
          }

          const mentionFallback = getMentionAvatarFallback(
            mentionMeta.label,
            mentionMeta.kind,
          );
          chunks.push(
            <span
              key={`mention-${token}-${mentionStart}`}
              className="inline-flex items-center gap-1 rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300"
            >
              <Avatar className="size-4">
                <AvatarImage
                  src={mentionMeta.avatarUrl}
                  alt={mentionMeta.label}
                />
                <AvatarFallback className="text-[9px] font-medium">
                  {mentionMeta.avatarFallback || mentionFallback}
                </AvatarFallback>
              </Avatar>
              {mentionLabel}
            </span>,
          );
        }
      }

      lastIndex = mentionEnd;
      match = mentionPattern.exec(input);
    }

    if (lastIndex < input.length) {
      chunks.push(input.slice(lastIndex));
    }

    return chunks;
  };

  const renderJamShareCard = (content: string) => {
    const jamShare = parseJamShareMessage(content);

    if (!jamShare) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => onOpenJamFromMessage(jamShare.jamId)}
        className="mt-1.5 flex w-full items-start gap-2 rounded-md border border-border/35 bg-accent/22 p-2 text-left transition-colors hover:bg-accent/35"
      >
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
          <Shapes className="size-3.5" />
        </span>
        <span className="min-w-0 space-y-0.5">
          <span className="line-clamp-1 block text-[12.5px] font-medium">
            {jamShare.title}
          </span>
          <span className="text-muted-foreground block text-[11px]">
            Shared jam
          </span>
          {jamShare.note ? (
            <span className="text-muted-foreground line-clamp-2 block text-[11px]">
              {renderContentWithMentions(jamShare.note)}
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  const parseCallEventMessage = (content: string) => {
    const normalized = String(content || "").trim();
    const encodedMatch = normalized.match(
      /^\[CALL_EVENT:([A-Za-z0-9_-]+)\]\s*([\s\S]*)$/i,
    );

    if (encodedMatch) {
      const encodedPayload = String(encodedMatch[1] || "").trim();
      const summaryText = String(encodedMatch[2] || "").trim();

      if (encodedPayload) {
        try {
          const normalizedBase64 = encodedPayload
            .replace(/-/g, "+")
            .replace(/_/g, "/");
          const padded = normalizedBase64.padEnd(
            Math.ceil(normalizedBase64.length / 4) * 4,
            "=",
          );
          const decoded = atob(padded);
          const metadata = JSON.parse(decoded);
          const modeLabel =
            String(metadata?.callMode || "").toLowerCase() === "voice"
              ? "Voice"
              : "Video";

          return {
            summary:
              summaryText ||
              `${String(metadata?.roomName || "This room")} call is active`,
            modeLabel,
            route: String(metadata?.route || "").trim(),
            threadTitle: String(metadata?.threadTitle || "").trim(),
          };
        } catch {
          // Fall back to legacy parser below.
        }
      }
    }

    const match = normalized.match(/^(.+)\sstarted a (voice|video) call\.$/i);

    if (!match) {
      return null;
    }

    const starterName = String(match[1] || "A teammate").trim();
    const modeLabel =
      String(match[2] || "").toLowerCase() === "voice" ? "Voice" : "Video";

    return {
      summary: `${starterName} started a ${modeLabel.toLowerCase()} call`,
      modeLabel,
      route: "",
      threadTitle: "",
    };
  };

  const parseForwardedMessage = (content: string) => {
    const normalized = String(content || "");
    const match = normalized.match(/^Forwarded from (.+?)\n([\s\S]*)$/);
    if (match) {
      return {
        sourceName: String(match[1] || "Unknown").trim(),
        body: String(match[2] || "").trim(),
      };
    }

    const headerOnlyMatch = normalized.match(/^Forwarded from (.+)$/);
    if (headerOnlyMatch) {
      return {
        sourceName: String(headerOnlyMatch[1] || "Unknown").trim(),
        body: "",
      };
    }

    return null;
  };

  const renderMessageReactions = (message: SpaceMessage) => {
    const reactions = Array.isArray(message.reactions) ? message.reactions : [];
    if (!reactions.length) {
      return null;
    }

    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {reactions.map((reaction) => {
          const reactorIds = Array.isArray(reaction.reactorIds)
            ? reaction.reactorIds
            : [];
          const names = reactorIds
            .map((id: string) => {
              if (id === currentUserId) return "You";
              return authorInfoById[id]?.name || null;
            })
            .filter(Boolean) as string[];

          const tooltipLabel =
            names.length === 0
              ? `${reaction.count} ${reaction.count === 1 ? "person" : "people"} reacted`
              : names.length <= 5
                ? names.join(", ")
                : `${names.slice(0, 5).join(", ")} +${names.length - 5} more`;

          return (
            <Tooltip
              key={`${message.id}:${reaction.emoji}`}
              delayDuration={300}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onReactToMessage(message.id, reaction.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] transition-colors",
                    reaction.reacted
                      ? "border-orange-500/55 bg-orange-500/12 text-orange-300"
                      : "border-border/45 bg-muted/25 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-[14px] leading-none">
                    {reaction.emoji}
                  </span>
                  <span className="font-medium">{reaction.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[220px] text-center text-[12px]"
              >
                <span className="mr-1">{reaction.emoji}</span>
                {tooltipLabel}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  const renderMoreReactionPicker = (
    onSelect: (emoji: string) => void,
    keyPrefix: string,
  ) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-full border border-border/45 bg-background/95 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="More reactions"
          >
            <Plus className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60 p-1.5">
          <div className="grid grid-cols-8 gap-1">
            {EXTENDED_REACTION_OPTIONS.map((emoji) => (
              <button
                key={`${keyPrefix}-${emoji}`}
                type="button"
                onClick={() => onSelect(emoji)}
                className="inline-flex size-7 items-center justify-center rounded-md text-[17px] leading-none transition-colors hover:bg-muted"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={messageListRef}
        onScroll={onMessageListScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-2.5"
      >
        {(hasOlderMessages || isLoadingOlderMessages) && (
          <div className="mb-1 flex justify-center">
            <span className="text-muted-foreground rounded-full border border-border/35 px-2 py-0.5 text-[11px]">
              {isLoadingOlderMessages ? (
                <LoaderComponent />
              ) : (
                "Scroll up for older messages"
              )}
            </span>
          </div>
        )}

        <div className="mt-2 space-y-1.5 overflow-y-hidden">
          {activeMessages.length ? (
            activeMessages.map((message, index) => {
              const currentMessageDate = parseMessageTimestamp(message);
              const previousMessageDate =
                index > 0
                  ? parseMessageTimestamp(activeMessages[index - 1])
                  : null;
              const showDateDivider =
                index === 0 ||
                !isSameCalendarDay(currentMessageDate, previousMessageDate);
              const dateDividerLabel =
                formatMessageDayLabel(currentMessageDate);
              const threadCount = onGetThreadCount(message.id);
              const isThreadActive = selectedThreadMessageId === message.id;
              const isPinned = Boolean(message.isPinned);
              const isOwnMessage =
                String(message.author.id || "").trim() ===
                String(currentUserId || "").trim();
              const jamShareCard = renderJamShareCard(message.content);
              const docShare = !jamShareCard ? parseDocShareMessage(message.content) : null;
              const callEventMessage = !jamShareCard && !docShare ? parseCallEventMessage(message.content) : null;
              const forwardedMessage = !jamShareCard && !docShare && !callEventMessage ? parseForwardedMessage(message.content) : null;
              const externalUrl = !jamShareCard && !docShare && !callEventMessage
                ? extractFirstExternalUrl(message.content)
                : null;
              const authorInfo =
                authorInfoById[String(message.author.id || "")];
              const SQUIRCLE_LOGO_URL =
                "https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png";
              const messageAvatarUrl =
                message.author.role === "agent"
                  ? SQUIRCLE_LOGO_URL
                  : message.author.avatarUrl ||
                    authorInfo?.avatarUrl ||
                    (isOwnMessage ? currentUserAvatarUrl || "" : "");

              return (
                <Fragment key={message.id}>
                  {showDateDivider ? (
                    <div className="my-1 flex items-center gap-2">
                      <span className="bg-border h-px flex-1" />
                      <span className="text-muted-foreground text-[11px]">
                        {dateDividerLabel}
                      </span>
                      <span className="bg-border h-px flex-1" />
                    </div>
                  ) : null}
                  <article
                    ref={(node) => {
                      messageElementRefs.current[message.id] = node;
                    }}
                    className={cn(
                      "group rounded-md px-2 py-1.5 transition-colors hover:bg-accent/35",
                      highlightedMessageId === message.id &&
                        "ring-1 ring-orange-500/60 bg-orange-500/10",
                    )}
                    onClick={() =>
                      setActiveMobileMessageId((prev) =>
                        prev === message.id ? null : message.id,
                      )
                    }
                  >
                    <div className="flex items-start gap-2">
                      <Avatar
                        size="sm"
                        className="shrink-0"
                        userCard={{
                          name: authorInfo?.name || message.author.name,
                          email: authorInfo?.email,
                          role:
                            authorInfo?.role ||
                            (message.author.role === "agent"
                              ? "Agent"
                              : "Member"),
                          team: authorInfo?.team,
                          status: message.sentAt,
                        }}
                      >
                        <AvatarImage
                          src={messageAvatarUrl}
                          alt={message.author.name}
                        />
                        <AvatarFallback className="text-[11px]">
                          {message.author.initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="relative max-w-[min(100%,48rem)]">
                          <div
                            className={cn(
                              "absolute top-0 right-0 z-10 inline-flex items-center gap-1 rounded-full border border-border/45 bg-background/95 px-1.5 py-1 shadow-sm transition-opacity opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                              activeMobileMessageId === message.id &&
                                "opacity-100",
                            )}
                          >
                            {QUICK_REACTION_OPTIONS.map((emoji) => (
                              <button
                                key={`${message.id}-hover-${emoji}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReactToMessage(message.id, emoji);
                                  setActiveMobileMessageId(null);
                                }}
                                className="inline-flex size-7 items-center justify-center rounded-full text-[17px] leading-none transition-colors hover:bg-muted"
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            {renderMoreReactionPicker(
                              (emoji) => onReactToMessage(message.id, emoji),
                              `message-more-${message.id}`,
                            )}
                            <ChatItemActionsMenu
                              isPinned={isPinned}
                              onReplyInThread={() => onOpenThread(message.id)}
                              onEdit={
                                isOwnMessage
                                  ? () => onStartEditingMessage(message)
                                  : undefined
                              }
                              onCopy={() => onCopyText(message.content)}
                              onTogglePin={() =>
                                onTogglePinnedMessage(message.id)
                              }
                              onForward={() => onForwardMessage(message)}
                              onCreateTask={() =>
                                onCreateTaskFromMessage(message)
                              }
                              showCreateTask={canCreateTaskFromChat}
                              onDelete={
                                isOwnMessage
                                  ? () => onDeleteMessage(message.id)
                                  : undefined
                              }
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pr-2 md:pr-24">
                            <p className="text-foreground text-[13px] font-medium">
                              {message.author.name}
                            </p>
                            {message.author.role === "agent" && (
                              <Badge
                                variant="outline"
                                className="gap-1 text-[11px]"
                              >
                                <Gem className="size-2.75" />
                                Squircle Intelligence
                              </Badge>
                            )}
                            {isPinned && (
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                <Bookmark className="size-3.5" />
                                Marked
                              </Badge>
                            )}
                            <span className="text-muted-foreground text-[11px]">
                              {message.sentAt}
                            </span>
                            {message.edited && (
                              <span className="text-muted-foreground text-[11px]">
                                edited
                              </span>
                            )}
                          </div>

                          {editingMessageId === message.id ? (
                            <div className="mt-1.5 space-y-1.5">
                              <Textarea
                                value={editingMessageValue}
                                onChange={(event) =>
                                  onEditingMessageValueChange(
                                    event.target.value,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" &&
                                    !event.shiftKey
                                  ) {
                                    event.preventDefault();
                                    onSaveEditedMessage(message.id);
                                  }
                                }}
                                className="min-h-16 max-h-36 resize-none px-2 py-1.5 text-[13px]"
                              />
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 text-[13px]"
                                  onClick={() =>
                                    onSaveEditedMessage(message.id)
                                  }
                                  disabled={
                                    editingMessageValue.trim().length < 1
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2.5 text-[13px]"
                                  onClick={onCancelEditingMessage}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {jamShareCard ? (
                                jamShareCard
                              ) : docShare ? (
                                <a
                                  href={docShare.route}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1.5 flex w-full items-start gap-2 rounded-md border border-border/35 bg-accent/22 p-2 text-left transition-colors hover:bg-accent/35"
                                >
                                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
                                    <FileText className="size-3.5" />
                                  </span>
                                  <span className="min-w-0 space-y-0.5">
                                    <span className="line-clamp-1 block text-[12.5px] font-medium">
                                      {docShare.title}
                                    </span>
                                    <span className="text-muted-foreground block text-[11px]">
                                      Shared document
                                    </span>
                                  </span>
                                </a>
                              ) : callEventMessage ? (
                                <button
                                  type="button"
                                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-border/45 bg-muted/25 px-2 py-1 text-left text-[12px] font-medium transition-colors hover:bg-muted/45"
                                  onClick={() =>
                                    onJoinCallFromMessage(
                                      callEventMessage.route,
                                    )
                                  }
                                >
                                  <Phone className="size-3.5 text-primary" />
                                  {callEventMessage.summary}
                                </button>
                              ) : forwardedMessage ? (
                                <div className="mt-1.5 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px]"
                                    >
                                      Forwarded
                                    </Badge>
                                    <span className="text-muted-foreground text-[11px]">
                                      From {forwardedMessage.sourceName}
                                    </span>
                                  </div>
                                  {forwardedMessage.body ? (
                                    <RichMessageContent
                                      content={forwardedMessage.body}
                                      renderInlineContent={
                                        renderContentWithMentions
                                      }
                                    />
                                  ) : null}
                                </div>
                              ) : message.author.role === "agent" ? (
                                <MessageMarkdown
                                  content={message.content}
                                  className="mt-0.5 text-[13px]"
                                />
                              ) : (
                                <>
                                  <RichMessageContent
                                    content={message.content}
                                    className="mt-0.5"
                                    renderInlineContent={
                                      renderContentWithMentions
                                    }
                                  />
                                  {externalUrl ? (
                                    <OgPreviewCard url={externalUrl} />
                                  ) : null}
                                </>
                              )}
                            </>
                          )}

                          <AttachmentPreview
                            attachments={message.attachments}
                          />
                          {renderMessageReactions(message)}

                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <Button
                              size="sm"
                              variant={isThreadActive ? "secondary" : "ghost"}
                              className="h-7 px-2.5 text-[13px]"
                              onClick={() => onOpenThread(message.id)}
                            >
                              <MessageSquareReply className="size-3.5" />
                              <span className="hidden sm:inline">
                                {threadCount > 0
                                  ? `${threadCount} repl${threadCount > 1 ? "ies" : "y"}`
                                  : "Reply in thread"}
                              </span>
                              <span className="sm:hidden">
                                {threadCount > 0
                                  ? `${threadCount} ${threadCount > 1 ? "replies" : "reply"}`
                                  : "Reply"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </Fragment>
              );
            })
          ) : isMessagesLoading ? (
            <div className="flex flex-col gap-5 px-3 py-4 ">
              {[
                { self: false, lines: [{ w: "w-48" }, { w: "w-64" }] },
                {
                  self: false,
                  lines: [{ w: "w-56" }, { w: "w-72" }, { w: "w-36" }],
                },
                { self: false, lines: [{ w: "w-44" }] },
                { self: false, lines: [{ w: "w-36" }, { w: "w-56" }] },
                { self: false, lines: [{ w: "w-48" }, { w: "w-64" }] },
                {
                  self: false,
                  lines: [{ w: "w-56" }, { w: "w-72" }, { w: "w-36" }],
                },
                { self: false, lines: [{ w: "w-44" }] },
                { self: false, lines: [{ w: "w-36" }, { w: "w-56" }] },
                {
                  self: false,
                  lines: [{ w: "w-56" }, { w: "w-72" }, { w: "w-36" }],
                },
                { self: false, lines: [{ w: "w-44" }] },
              ].map((row, i) => (
                <div key={i} className={`flex items-end gap-2 flex-row`}>
                  {!row.self && (
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                  )}
                  <div
                    className={`flex flex-col gap-1.5 ${row.self ? "items-end" : "items-start"}`}
                  >
                    {!row.self && (
                      <Skeleton className="h-2.5 w-20 rounded-md" />
                    )}
                    <div
                      className={`rounded-md px-3 py-2.5 flex flex-col gap-1.5 ${row.self ? "bg-primary/10" : "bg-muted/60"}`}
                    >
                      {row.lines.map((line, j) => (
                        <Skeleton
                          key={j}
                          className={`h-3 ${line.w} rounded-md`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[48vh] items-center justify-center px-3 py-6">
              <Empty className="border-0 p-0 md:p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareReply className="size-4 text-primary/85" />
                  </EmptyMedia>
                  <EmptyDescription className="text-[12px]">
                    No messages yet. Send the first message to start this
                    conversation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </div>
      </div>

      {isAiThinking && (
        <div className="flex items-center gap-2.5 border-t border-border/20 bg-muted/20 px-4 py-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background">
            <Gem className="size-3 text-muted-foreground animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground">
              Squircle Intelligence is thinking
            </span>
            <span className="flex gap-0.5">
              <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
              <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
              <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      )}
      <TypingIndicator users={typingUsers} />

      <div
        data-tour="spaces-composer"
        className="bg-card/95 shrink-0 border-t border-border/35 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-1.5"
      >
        <RichMessageComposer
          value={composer}
          attachments={composerAttachments}
          uploadRef={mainComposerUploadRef}
          target="main"
          canSend={canSendMessage}
          placeholder="Message this space... Use @ for people, # for reports"
          sendLabel="Send"
          hint="Enter to send"
          mentionSuggestions={mentionSuggestions}
          reportMentionSuggestions={reportMentionSuggestions}
          onChange={onComposerChange}
          onSend={onSendMessage}
          onUploadFromInput={onUploadFromInput}
          onAttachFiles={onAttachFiles}
          onRemoveAttachment={onRemoveAttachment}
        />
      </div>
    </div>
  );
};

export default MainChatPanel;
