import type React from "react";
import {
  Shapes,
  ImagePlus,
  PanelRightClose,
  Plus,
  Pin,
  SendHorizontal,
  X,
} from "lucide-react";
import { Mention, MentionsInput } from "react-mentions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MentionSuggestionRow } from "@/components/shared/mention-suggestion-row";
import type {
  ChatAttachment,
  MentionTokenMeta,
  MentionSuggestion,
  SpaceMessage,
  SpaceUserInfo,
  ThreadReply,
} from "../types";
import AttachmentPreview from "./attachment-preview";
import ChatItemActionsMenu from "./chat-item-actions-menu";
import DraftAttachmentRow from "./draft-attachment-row";
import { parseJamShareMessage } from "../utils";

type ThreadPanelProps = {
  desktop?: boolean;
  selectedThreadMessage: SpaceMessage | null;
  activeThreadReplies: ThreadReply[];
  pinnedReplyIds: string[];
  editingReplyId: string | null;
  editingReplyValue: string;
  threadComposer: string;
  threadAttachments: ChatAttachment[];
  canSendThreadReply: boolean;
  canCreateTaskFromChat: boolean;
  currentUserId: string;
  currentUserAvatarUrl?: string;
  mentionSuggestions: MentionSuggestion[];
  mentionMetaByToken: Record<string, MentionTokenMeta>;
  authorInfoById: Record<string, SpaceUserInfo>;
  onOpenMentionUser: (userId: string) => void;
  threadComposerUploadRef: React.RefObject<HTMLInputElement | null>;
  threadListRef: React.RefObject<HTMLDivElement | null>;
  onCloseThread: () => void;
  onEditingReplyValueChange: (value: string) => void;
  onSaveEditedReply: (replyId: string) => void;
  onCancelEditingReply: () => void;
  onStartEditingReply: (reply: ThreadReply) => void;
  onCopyText: (value: string) => void;
  onReactToReply: (replyId: string, emoji: string) => void;
  onTogglePinnedReply: (replyId: string) => void;
  onForwardReply: (reply: ThreadReply) => void;
  onCreateTaskFromReply: (reply: ThreadReply) => void;
  onDeleteThreadReply: (replyId: string) => void;
  onOpenJamFromMessage: (jamId: string) => void;
  onThreadComposerChange: (value: string) => void;
  onSendThreadReply: () => void;
  onUploadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (attachmentId: string, target: "main" | "thread") => void;
};

const ThreadPanel = ({
  desktop = false,
  selectedThreadMessage,
  activeThreadReplies,
  pinnedReplyIds,
  editingReplyId,
  editingReplyValue,
  threadComposer,
  threadAttachments,
  canSendThreadReply,
  canCreateTaskFromChat,
  currentUserId,
  currentUserAvatarUrl,
  mentionSuggestions,
  mentionMetaByToken,
  authorInfoById,
  onOpenMentionUser,
  threadComposerUploadRef,
  threadListRef,
  onCloseThread,
  onEditingReplyValueChange,
  onSaveEditedReply,
  onCancelEditingReply,
  onStartEditingReply,
  onCopyText,
  onReactToReply,
  onTogglePinnedReply,
  onForwardReply,
  onCreateTaskFromReply,
  onDeleteThreadReply,
  onOpenJamFromMessage,
  onThreadComposerChange,
  onSendThreadReply,
  onUploadFromInput,
  onRemoveAttachment,
}: ThreadPanelProps) => {
  const quickReactionOptions = ["👍", "❤️", "🔥", "🎉", "😂"] as const;
  const extendedReactionOptions = [
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
  const suggestionsPortalHost =
    typeof document === "undefined" ? undefined : document.body;

  const mentionInputStyle = {
    control: {
      backgroundColor: "transparent",
      fontSize: 12.5,
      fontWeight: 400,
    },
    highlighter: {
      overflow: "hidden",
      padding: "6px 8px",
      minHeight: "56px",
    },
    input: {
      margin: 0,
      border: 0,
      color: "var(--foreground)",
      backgroundColor: "transparent",
      minHeight: "56px",
      maxHeight: "160px",
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

  const renderMentionSuggestion = (
    suggestion: MentionSuggestion,
    _search: string,
    highlightedDisplay: React.ReactNode,
    _index: number,
    focused: boolean,
  ) => {
    return (
      <MentionSuggestionRow
        label={String(suggestion.display || "")}
        highlightedLabel={highlightedDisplay}
        kind={suggestion.kind}
        avatarUrl={suggestion.avatarUrl}
        avatarFallback={suggestion.avatarFallback}
        subtitle={suggestion.subtitle}
        focused={focused}
      />
    );
  };

  const toTitleCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");

  const formatMentionFallbackLabel = (token: string) => {
    const normalizedToken = String(token || "").trim().toLowerCase();
    const base = normalizedToken.replace(/[_-]+/g, " ").replace(/\./g, " ");

    if (normalizedToken.startsWith("team-")) {
      return `team:${toTitleCase(base.slice("team ".length).trim())}`;
    }

    if (normalizedToken.startsWith("project-")) {
      return `project:${toTitleCase(base.slice("project ".length).trim())}`;
    }

    return toTitleCase(base);
  };

  const getMentionAvatarFallback = (
    label: string,
    kind?: MentionTokenMeta["kind"],
  ) => {
    const normalized = String(label || "")
      .replace(/^(team|project)\s*:/i, "")
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

    if (kind === "team") {
      return "TM";
    }

    return "U";
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
        const fallbackLabel = formatMentionFallbackLabel(token);
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
            @{fallbackLabel}
          </span>,
        );
      } else {
        const mentionLabel = `@${mentionMeta.label}`;

        if (mentionMeta.kind === "user" && mentionMeta.user) {
          const mentionAvatarFallback = getMentionAvatarFallback(
            mentionMeta.user.name,
            mentionMeta.kind,
          );
          chunks.push(
            <Tooltip key={`mention-${token}-${mentionStart}`} delayDuration={100}>
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
                      onClick={() => onOpenMentionUser(mentionMeta.user?.id || "")}
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
        className="mt-1.5 flex w-full items-start gap-2 rounded-md border border-border/70 bg-accent/30 p-2 text-left transition-colors hover:bg-accent/45"
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

  const renderReplyReactions = (reply: ThreadReply) => {
    const reactions = Array.isArray(reply.reactions) ? reply.reactions : [];
    if (!reactions.length) {
      return null;
    }

    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {reactions.map((reaction) => (
          <button
            key={`${reply.id}:${reaction.emoji}`}
            type="button"
            onClick={() => onReactToReply(reply.id, reaction.emoji)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] transition-colors ${
              reaction.reacted
                ? "border-orange-500/55 bg-orange-500/12 text-orange-300"
                : "border-border/45 bg-muted/25 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-[14px] leading-none">{reaction.emoji}</span>
            <span className="font-medium">{reaction.count}</span>
          </button>
        ))}
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
            {extendedReactionOptions.map((emoji) => (
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
  const selectedThreadJamShareCard = selectedThreadMessage
    ? renderJamShareCard(selectedThreadMessage.content)
    : null;

  return (
    <div className="bg-card/70 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="bg-card/95 flex shrink-0 items-center gap-1.5 border-b border-border/35 px-2 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5">
        <p className="text-[14px] font-semibold tracking-tight">Thread</p>
        <Badge variant="secondary" className="text-[11px]">
          {activeThreadReplies.length} replies
        </Badge>
        <div className="ml-auto flex items-center">
          {!desktop && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto size-7"
              onClick={onCloseThread}
            >
              <X className="size-4" />
            </Button>
          )}

          {desktop && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto size-7"
              onClick={onCloseThread}
            >
              <PanelRightClose className="text-muted-foreground size-4" />
            </Button>
          )}
        </div>
      </div>

      {!selectedThreadMessage ? (
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm">
          Select a message to view or reply in a thread.
        </div>
      ) : (
        <>
          {/*
            Thread root can be a shared jam message.
          */}
          <div className="shrink-0 border-b border-border/35 px-2 py-2 sm:px-3 sm:py-2.5">
            <div className="rounded-lg border border-border/35 bg-card/70 px-2.5 py-2.5">
              <p className="text-muted-foreground text-[11px]">From main chat</p>
              {selectedThreadJamShareCard ? (
                selectedThreadJamShareCard
              ) : (
                <p className="mt-1 text-[12.5px] leading-5">
                  {renderContentWithMentions(selectedThreadMessage.content)}
                </p>
              )}
              <AttachmentPreview attachments={selectedThreadMessage.attachments} />
            </div>
          </div>

          <div
            ref={threadListRef}
            className="h-0 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-2.5"
          >
            {activeThreadReplies.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">
                No replies yet. Start the thread.
              </p>
            ) : (
              activeThreadReplies.map((reply) => {
                const isPinned = pinnedReplyIds.includes(reply.id);
                const isOwnReply =
                  String(reply.author.id || "").trim() ===
                  String(currentUserId || "").trim();
                const jamShareCard = renderJamShareCard(reply.content);
                const authorInfo = authorInfoById[String(reply.author.id || "")];
                const replyAvatarUrl =
                  reply.author.avatarUrl ||
                  authorInfo?.avatarUrl ||
                  (isOwnReply ? currentUserAvatarUrl || "" : "");

                return (
                  <article
                    key={reply.id}
                    className="group relative rounded-lg border border-border/35 bg-card/70 px-2.5 py-2 pt-7 transition-colors hover:bg-card"
                  >
                    <div className="absolute top-1.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-full border border-border/45 bg-background/95 px-1.5 py-1 shadow-sm opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      {quickReactionOptions.map((emoji) => (
                        <button
                          key={`${reply.id}-hover-${emoji}`}
                          type="button"
                          onClick={() => onReactToReply(reply.id, emoji)}
                          className="inline-flex size-7 items-center justify-center rounded-full text-[17px] leading-none transition-colors hover:bg-muted"
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      {renderMoreReactionPicker(
                        (emoji) => onReactToReply(reply.id, emoji),
                        `reply-more-${reply.id}`,
                      )}
                      <ChatItemActionsMenu
                        isPinned={isPinned}
                        onEdit={
                          isOwnReply ? () => onStartEditingReply(reply) : undefined
                        }
                        onCopy={() => onCopyText(reply.content)}
                        onTogglePin={() => onTogglePinnedReply(reply.id)}
                        onForward={() => onForwardReply(reply)}
                        onCreateTask={() => onCreateTaskFromReply(reply)}
                        showCreateTask={canCreateTaskFromChat}
                        onDelete={
                          isOwnReply
                            ? () => onDeleteThreadReply(reply.id)
                            : undefined
                        }
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Avatar
                        size="sm"
                        userCard={{
                          name: authorInfo?.name || reply.author.name,
                          email: authorInfo?.email,
                          role:
                            authorInfo?.role ||
                            (reply.author.role === "agent" ? "Agent" : "Member"),
                          team: authorInfo?.team,
                          status: reply.sentAt,
                        }}
                      >
                        <AvatarImage
                          src={replyAvatarUrl}
                          alt={reply.author.name}
                        />
                        <AvatarFallback className="text-[11px]">
                          {reply.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[13px] font-medium">
                        {reply.author.name}
                      </p>
                      <span className="text-muted-foreground text-[11px]">
                        {reply.sentAt}
                      </span>
                      {reply.edited && (
                        <span className="text-muted-foreground text-[11px]">
                          edited
                        </span>
                      )}
                      {isPinned && (
                        <Badge variant="secondary" className="text-[11px]">
                          <Pin className="size-3.5" />
                          Pinned
                        </Badge>
                      )}
                    </div>

                    {editingReplyId === reply.id ? (
                      <div className="mt-1.5 space-y-1.5">
                        <Textarea
                          value={editingReplyValue}
                          onChange={(event) =>
                            onEditingReplyValueChange(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              onSaveEditedReply(reply.id);
                            }
                          }}
                          className="min-h-14 max-h-32 resize-none px-2 py-1.5 text-[13px]"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="h-8 px-2.5 text-[13px]"
                            onClick={() => onSaveEditedReply(reply.id)}
                            disabled={editingReplyValue.trim().length < 1}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-[13px]"
                            onClick={onCancelEditingReply}
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
                          <p className="mt-1 text-[13px] leading-5">
                            {renderContentWithMentions(reply.content)}
                          </p>
                        )}
                      </>
                    )}

                    <AttachmentPreview attachments={reply.attachments} />
                    {renderReplyReactions(reply)}
                  </article>
                );
              })
            )}
          </div>

          <div className="bg-card/95 shrink-0 border-t border-border/35 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-2.5">
            <div className="bg-background/88 border-border/35 rounded-none border border-x-0 border-b-0 p-2 backdrop-blur-sm sm:rounded-md sm:border sm:p-2.5">
              <MentionsInput
                value={threadComposer}
                onChange={(event) => onThreadComposerChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSendThreadReply();
                  }
                }}
                placeholder="Reply in thread... Use @ to mention"
                style={mentionInputStyle}
                className="min-h-14 max-h-40 rounded-md border-0 bg-transparent shadow-none focus-within:ring-0"
                a11ySuggestionsListLabel="Thread mentions"
                suggestionsPortalHost={suggestionsPortalHost}
                forceSuggestionsAboveCursor
              >
                <Mention
                  trigger="@"
                  data={mentionSuggestions}
                  markup="@__id__"
                  displayTransform={(_id, display) => display || _id}
                  renderSuggestion={renderMentionSuggestion}
                  appendSpaceOnAdd
                />
              </MentionsInput>

              <DraftAttachmentRow
                attachments={threadAttachments}
                target="thread"
                onRemoveAttachment={onRemoveAttachment}
              />

              <div className="flex flex-wrap items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-[13px]"
                  onClick={() => threadComposerUploadRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" />
                  Image
                </Button>
                <input
                  ref={threadComposerUploadRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onUploadFromInput}
                />

                <p className="text-muted-foreground hidden text-[11px] md:block">
                  Enter to reply
                </p>

                <Button
                  size="sm"
                  className="ml-auto h-8 px-2.5 text-[12px]"
                  onClick={onSendThreadReply}
                  disabled={!canSendThreadReply}
                >
                  <SendHorizontal className="size-3.5" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThreadPanel;
