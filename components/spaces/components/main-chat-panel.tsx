import type React from "react";
import { Fragment } from "react";
import {
  Shapes,
  ImagePlus,
  MessageSquareReply,
  Pin,
  SendHorizontal,
} from "lucide-react";
import { Mention, MentionsInput } from "react-mentions";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatAttachment, SpaceMessage } from "../types";
import AttachmentPreview from "./attachment-preview";
import ChatItemActionsMenu from "./chat-item-actions-menu";
import DraftAttachmentRow from "./draft-attachment-row";
import type {
  MentionSuggestion,
  MentionTokenMeta,
  SpaceUserInfo,
} from "../types";
import { parseJamShareMessage } from "../utils";
import LoaderComponent from "@/components/shared/loader";

type MainChatPanelProps = {
  activeMessages: SpaceMessage[];
  selectedThreadMessageId: string | null;
  pinnedMessageIds: string[];
  editingMessageId: string | null;
  editingMessageValue: string;
  composer: string;
  composerAttachments: ChatAttachment[];
  canSendMessage: boolean;
  canCreateTaskFromChat: boolean;
  currentUserId: string;
  currentUserAvatarUrl?: string;
  mentionSuggestions: MentionSuggestion[];
  mentionMetaByToken: Record<string, MentionTokenMeta>;
  authorInfoById: Record<string, SpaceUserInfo>;
  onOpenMentionUser: (userId: string) => void;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  mainComposerUploadRef: React.RefObject<HTMLInputElement | null>;
  onGetThreadCount: (messageId: string) => number;
  onOpenThread: (messageId: string) => void;
  onEditingMessageValueChange: (value: string) => void;
  onSaveEditedMessage: (messageId: string) => void;
  onCancelEditingMessage: () => void;
  onStartEditingMessage: (message: SpaceMessage) => void;
  onCopyText: (value: string) => void;
  onTogglePinnedMessage: (messageId: string) => void;
  onForwardMessage: (
    message: Pick<SpaceMessage, "author" | "content" | "attachments">,
  ) => void;
  onCreateTaskFromMessage: (
    message: Pick<SpaceMessage, "author" | "content">,
  ) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenJamFromMessage: (jamId: string) => void;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  onUploadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (attachmentId: string, target: "main" | "thread") => void;
  onMessageListScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isMessagesLoading?: boolean;
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

const MainChatPanel = ({
  activeMessages,
  selectedThreadMessageId,
  pinnedMessageIds,
  editingMessageId,
  editingMessageValue,
  composer,
  composerAttachments,
  canSendMessage,
  canCreateTaskFromChat,
  currentUserId,
  currentUserAvatarUrl,
  mentionSuggestions,
  mentionMetaByToken,
  authorInfoById,
  onOpenMentionUser,
  messageListRef,
  mainComposerUploadRef,
  onGetThreadCount,
  onOpenThread,
  onEditingMessageValueChange,
  onSaveEditedMessage,
  onCancelEditingMessage,
  onStartEditingMessage,
  onCopyText,
  onTogglePinnedMessage,
  onForwardMessage,
  onCreateTaskFromMessage,
  onDeleteMessage,
  onOpenJamFromMessage,
  onComposerChange,
  onSendMessage,
  onUploadFromInput,
  onRemoveAttachment,
  onMessageListScroll,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  isMessagesLoading = false,
}: MainChatPanelProps) => {
  const suggestionsPortalHost =
    typeof document === "undefined" ? undefined : document.body;

  const mentionInputStyle = {
    control: {
      backgroundColor: "transparent",
      fontSize: 13,
      fontWeight: 400,
    },
    highlighter: {
      overflow: "hidden",
      padding: "6px 8px",
      minHeight: "64px",
    },
    input: {
      margin: 0,
      border: 0,
      color: "var(--foreground)",
      backgroundColor: "transparent",
      minHeight: "64px",
      maxHeight: "208px",
      overflowY: "auto",
      outline: "none",
      padding: "6px 8px",
      lineHeight: "1.35",
    },
    suggestions: {
      list: {
        backgroundColor: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        fontSize: 13,
        color: "var(--popover-foreground)",
        maxHeight: "220px",
        overflowY: "auto",
        zIndex: 90,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      },
      item: {
        padding: "6px 8px",
        color: "var(--popover-foreground)",
        backgroundColor: "transparent",
      },
    },
  } as const;

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

    return toTitleCase(base);
  };

  const renderContentWithMentions = (content: string) => {
    const input = String(content || "");
    const mentionPattern = /@([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;
    const chunks: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = mentionPattern.exec(input);

    while (match) {
      const mentionStart = match.index;
      const mentionEnd = mentionStart + match[0].length;
      const token = String(match[1] || "").toLowerCase();
      const mentionMeta = mentionMetaByToken[token];

      if (mentionStart > lastIndex) {
        chunks.push(input.slice(lastIndex, mentionStart));
      }

      if (!mentionMeta) {
        chunks.push(
          <span
            key={`mention-fallback-${token}-${mentionStart}`}
            className="inline-flex rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300"
          >
            @{formatMentionFallbackLabel(token)}
          </span>,
        );
      } else {
        const mentionLabel = `@${mentionMeta.label}`;

        if (mentionMeta.kind === "user" && mentionMeta.user) {
          chunks.push(
            <Tooltip
              key={`mention-${token}-${mentionStart}`}
              delayDuration={100}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300 transition-colors hover:bg-orange-500/20"
                  onClick={() => onOpenMentionUser(mentionMeta.user?.id || "")}
                >
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
                  <div className="space-y-0.5">
                    <div className="truncate text-[13px] font-semibold">
                      {mentionMeta.user.name}
                    </div>
                    {mentionMeta.user.email ? (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {mentionMeta.user.email}
                      </div>
                    ) : null}
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
          chunks.push(
            <span
              key={`mention-${token}-${mentionStart}`}
              className="inline-flex rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300"
            >
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

        <div className="mt-2 space-y-1.5">
          {activeMessages.length ? (
            activeMessages.map((message, index) => {
              const currentMessageDate = parseMessageTimestamp(message);
              const previousMessageDate =
                index > 0 ? parseMessageTimestamp(activeMessages[index - 1]) : null;
              const showDateDivider =
                index === 0 || !isSameCalendarDay(currentMessageDate, previousMessageDate);
              const dateDividerLabel = formatMessageDayLabel(currentMessageDate);
              const threadCount = onGetThreadCount(message.id);
              const isThreadActive = selectedThreadMessageId === message.id;
              const isPinned = pinnedMessageIds.includes(message.id);
              const isOwnMessage =
                String(message.author.id || "").trim() ===
                String(currentUserId || "").trim();
              const jamShareCard = renderJamShareCard(message.content);
              const authorInfo = authorInfoById[String(message.author.id || "")];
              const messageAvatarUrl =
                message.author.avatarUrl ||
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
                  <article className="group rounded-md px-2 py-1.5 transition-colors hover:bg-accent/35">
                    <div className="flex items-start gap-2">
                    <Avatar
                      size="sm"
                      className="shrink-0"
                      userCard={{
                        name: authorInfo?.name || message.author.name,
                        email: authorInfo?.email,
                        role:
                          authorInfo?.role ||
                          (message.author.role === "agent" ? "Agent" : "Member"),
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-medium">
                          {message.author.name}
                        </p>
                        {message.author.role === "agent" && (
                          <Badge variant="outline" className="text-[11px]">
                            Agent
                          </Badge>
                        )}
                        {isPinned && (
                          <Badge variant="secondary" className="text-[11px]">
                            <Pin className="size-3.5" />
                            Pinned
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
                              onEditingMessageValueChange(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
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
                              onClick={() => onSaveEditedMessage(message.id)}
                              disabled={editingMessageValue.trim().length < 1}
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
                          ) : (
                            <p className="mt-0.5 text-[12.5px] leading-5 whitespace-pre-wrap">
                              {renderContentWithMentions(message.content)}
                            </p>
                          )}
                        </>
                      )}

                      <AttachmentPreview attachments={message.attachments} />

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

                        <div className="ml-auto opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          <ChatItemActionsMenu
                            isPinned={isPinned}
                            onReplyInThread={() => onOpenThread(message.id)}
                            onEdit={
                              isOwnMessage
                                ? () => onStartEditingMessage(message)
                                : undefined
                            }
                            onCopy={() => onCopyText(message.content)}
                            onTogglePin={() => onTogglePinnedMessage(message.id)}
                            onForward={() => onForwardMessage(message)}
                            onCreateTask={() => onCreateTaskFromMessage(message)}
                            showCreateTask={canCreateTaskFromChat}
                            onDelete={
                              isOwnMessage
                                ? () => onDeleteMessage(message.id)
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                    </div>
                  </article>
                </Fragment>
              );
            })
          ) : isMessagesLoading ? (
            <div className="flex min-h-[48vh] items-center justify-center px-3 py-6">
              <LoaderComponent />
            </div>
          ) : (
            <div className="flex min-h-[48vh] items-center justify-center px-3 py-6">
              <Empty className="border-0 p-0 md:p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareReply className="size-4 text-primary/85" />
                  </EmptyMedia>
                  <EmptyDescription className="text-[12px]">
                    No messages yet. Send the first message to start this conversation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card/95 shrink-0 border-t border-border/35 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-1.5">
        <div className="bg-background/88 border-border/35 flex flex-col gap-2 rounded-none border border-x-0 border-b-0 p-1.5 backdrop-blur-sm sm:rounded-md sm:border sm:p-1.5">
          <MentionsInput
            value={composer}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="Message this space... Use @ to mention"
            style={mentionInputStyle}
            className="min-h-16 max-h-52 rounded-md border-0 bg-transparent shadow-none focus-within:ring-0"
            a11ySuggestionsListLabel="Chat mentions"
            suggestionsPortalHost={suggestionsPortalHost}
            forceSuggestionsAboveCursor
          >
            <Mention
              trigger="@"
              data={mentionSuggestions}
              markup="@__id__"
              displayTransform={(_id, display) => display || _id}
              appendSpaceOnAdd
            />
          </MentionsInput>

          <DraftAttachmentRow
            attachments={composerAttachments}
            target="main"
            onRemoveAttachment={onRemoveAttachment}
          />

          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-[13px]"
              onClick={() => mainComposerUploadRef.current?.click()}
            >
              <ImagePlus className="size-3.5" />
              Image
            </Button>
            <input
              ref={mainComposerUploadRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onUploadFromInput}
            />

            <p className="text-muted-foreground hidden text-[11px] md:block">
              Enter to send
            </p>

            <Button
              size="sm"
              className="ml-auto h-8 px-2.5 text-[12px]"
              onClick={onSendMessage}
              disabled={!canSendMessage}
            >
              <SendHorizontal className="size-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainChatPanel;
