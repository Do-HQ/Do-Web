import type React from "react";
import {
  ImagePlus,
  PanelRightClose,
  Pin,
  SendHorizontal,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatAttachment, SpaceMessage, ThreadReply } from "../types";
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
  return (
    <>
      <div className="flex items-center gap-1.5 border-b px-2 py-2 sm:px-3 sm:py-2.5">
        <p className="text-sm font-semibold">Thread</p>
        <Badge variant="secondary" className="text-[10px]">
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
              <X className="size-3.5" />
            </Button>
          )}

          {desktop && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto size-7"
              onClick={onCloseThread}
            >
              <PanelRightClose className="text-muted-foreground size-3.5" />
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
          <div className="border-b px-2 py-2 sm:px-3 sm:py-2.5">
            <p className="text-muted-foreground text-[10px]">From main chat</p>
            <p className="mt-1 text-[12.5px] leading-5">
              {selectedThreadMessage.content}
            </p>
            <AttachmentPreview
              attachments={selectedThreadMessage.attachments}
            />
          </div>

          <div
            ref={threadListRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2 sm:px-3 sm:py-2.5"
          >
            {activeThreadReplies.length === 0 ? (
              <p className="text-muted-foreground text-[12px]">
                No replies yet. Start the thread.
              </p>
            ) : (
              activeThreadReplies.map((reply) => {
                const isPinned = pinnedReplyIds.includes(reply.id);

                return (
                  <article
                    key={reply.id}
                    className="rounded-md border bg-background/70 p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <Avatar size="sm">
                        <AvatarImage
                          src={reply.author.avatarUrl}
                          alt={reply.author.name}
                        />
                        <AvatarFallback className="text-[10px]">
                          {reply.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[12px] font-medium">
                        {reply.author.name}
                      </p>
                      <span className="text-muted-foreground text-[10px]">
                        {reply.sentAt}
                      </span>
                      {reply.edited && (
                        <span className="text-muted-foreground text-[10px]">
                          edited
                        </span>
                      )}
                      {isPinned && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Pin className="size-3" />
                          Pinned
                        </Badge>
                      )}
                      <div className="ml-auto">
                        <ChatItemActionsMenu
                          isPinned={isPinned}
                          onEdit={() => onStartEditingReply(reply)}
                          onCopy={() => onCopyText(reply.content)}
                          onTogglePin={() => onTogglePinnedReply(reply.id)}
                          onForward={() => onForwardReply(reply)}
                          onCreateTask={() => onCreateTaskFromReply(reply)}
                          showCreateTask={canCreateTaskFromChat}
                          onDelete={() => onDeleteThreadReply(reply.id)}
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
                          className="min-h-14 max-h-32 resize-none px-2 py-1.5 text-[12px]"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => onSaveEditedReply(reply.id)}
                            disabled={editingReplyValue.trim().length < 1}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={onCancelEditingReply}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-[12px] leading-5">
                        {reply.content}
                      </p>
                    )}

                    <AttachmentPreview attachments={reply.attachments} />
                  </article>
                );
              })
            )}
          </div>

          <div className="border-t px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:p-2.5">
            <div className="bg-background/88 border-border rounded-none border border-x-0 border-b-0 p-2 backdrop-blur-sm sm:rounded-md sm:border sm:p-2.5">
              <Textarea
                value={threadComposer}
                onChange={(event) => onThreadComposerChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSendThreadReply();
                  }
                }}
                placeholder="Reply in thread..."
                className="min-h-14 max-h-40 resize-none overflow-y-auto border-0 bg-transparent px-1.5 py-1.5 text-[12.5px] shadow-none focus-visible:ring-0"
              />

              <DraftAttachmentRow
                attachments={threadAttachments}
                target="thread"
                onRemoveAttachment={onRemoveAttachment}
              />

              <div className="flex flex-wrap items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => threadComposerUploadRef.current?.click()}
                >
                  <ImagePlus className="size-3" />
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

                <p className="text-muted-foreground hidden text-[10px] md:block">
                  Enter to reply
                </p>

                <Button
                  size="sm"
                  className="ml-auto h-7 px-2.5 text-[11px]"
                  onClick={onSendThreadReply}
                  disabled={!canSendThreadReply}
                >
                  <SendHorizontal className="size-3" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ThreadPanel;
