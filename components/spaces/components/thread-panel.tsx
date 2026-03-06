import type React from "react";
import {
  ImagePlus,
  PanelRightClose,
  Pin,
  SendHorizontal,
  X,
} from "lucide-react";
import { Mention, MentionsInput } from "react-mentions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  onTogglePinnedReply: (replyId: string) => void;
  onForwardReply: (reply: ThreadReply) => void;
  onCreateTaskFromReply: (reply: ThreadReply) => void;
  onDeleteThreadReply: (replyId: string) => void;
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
  onTogglePinnedReply,
  onForwardReply,
  onCreateTaskFromReply,
  onDeleteThreadReply,
  onThreadComposerChange,
  onSendThreadReply,
  onUploadFromInput,
  onRemoveAttachment,
}: ThreadPanelProps) => {
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
            <Tooltip key={`mention-${token}-${mentionStart}`} delayDuration={100}>
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="bg-card/95 flex shrink-0 items-center gap-1.5 border-b px-2 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5">
        <p className="text-sm font-semibold">Thread</p>
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
          <div className="shrink-0 border-b px-2 py-2 sm:px-3 sm:py-2.5">
            <p className="text-muted-foreground text-[11px]">From main chat</p>
            <p className="mt-1 text-[12.5px] leading-5">
              {renderContentWithMentions(selectedThreadMessage.content)}
            </p>
            <AttachmentPreview
              attachments={selectedThreadMessage.attachments}
            />
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
                const authorInfo = authorInfoById[String(reply.author.id || "")];

                return (
                  <article
                    key={reply.id}
                    className="rounded-md border bg-background/70 p-2"
                  >
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
                          src={reply.author.avatarUrl}
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
                      <div className="ml-auto">
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
                      <p className="mt-1 text-[13px] leading-5">
                        {renderContentWithMentions(reply.content)}
                      </p>
                    )}

                    <AttachmentPreview attachments={reply.attachments} />
                  </article>
                );
              })
            )}
          </div>

          <div className="bg-card/95 shrink-0 border-t px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-2.5">
            <div className="bg-background/88 border-border rounded-none border border-x-0 border-b-0 p-2 backdrop-blur-sm sm:rounded-md sm:border sm:p-2.5">
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
