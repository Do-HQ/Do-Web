import type React from "react";
import {
  AtSign,
  ImagePlus,
  MessageSquareReply,
  Pin,
  SendHorizontal,
  SmilePlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatAttachment, SpaceMessage } from "../types";
import AttachmentPreview from "./attachment-preview";
import ChatItemActionsMenu from "./chat-item-actions-menu";
import DraftAttachmentRow from "./draft-attachment-row";

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
  onCreateTaskFromMessage: (message: Pick<SpaceMessage, "author" | "content">) => void;
  onDeleteMessage: (messageId: string) => void;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  onUploadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (attachmentId: string, target: "main" | "thread") => void;
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
  onComposerChange,
  onSendMessage,
  onUploadFromInput,
  onRemoveAttachment,
}: MainChatPanelProps) => {
  return (
    <>
      <div
        ref={messageListRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-2.5"
      >
        <div className="my-1 flex items-center gap-2">
          <span className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-[10px]">Today</span>
          <span className="bg-border h-px flex-1" />
        </div>

        <div className="mt-2 space-y-1.5">
          {activeMessages.map((message) => {
            const threadCount = onGetThreadCount(message.id);
            const isThreadActive = selectedThreadMessageId === message.id;
            const isPinned = pinnedMessageIds.includes(message.id);

            return (
              <article
                key={message.id}
                className="group rounded-md px-2 py-1.5 transition-colors hover:bg-accent/35"
              >
                <div className="flex items-start gap-2">
                  <Avatar size="sm" className="shrink-0">
                    <AvatarImage src={message.author.avatarUrl} alt={message.author.name} />
                    <AvatarFallback className="text-[10px]">
                      {message.author.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[12px] font-medium">{message.author.name}</p>
                      {message.author.role === "agent" && (
                        <Badge variant="outline" className="text-[10px]">
                          Agent
                        </Badge>
                      )}
                      {isPinned && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Pin className="size-3" />
                          Pinned
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-[10px]">
                        {message.sentAt}
                      </span>
                      {message.edited && (
                        <span className="text-muted-foreground text-[10px]">edited</span>
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
                          className="min-h-16 max-h-36 resize-none px-2 py-1.5 text-[12px]"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => onSaveEditedMessage(message.id)}
                            disabled={editingMessageValue.trim().length < 1}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={onCancelEditingMessage}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[12.5px] leading-5 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    <AttachmentPreview attachments={message.attachments} />

                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Button
                        size="sm"
                        variant={isThreadActive ? "secondary" : "ghost"}
                        className="h-6 px-2 text-[11px]"
                        onClick={() => onOpenThread(message.id)}
                      >
                        <MessageSquareReply className="size-3" />
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
                          onEdit={() => onStartEditingMessage(message)}
                          onCopy={() => onCopyText(message.content)}
                          onTogglePin={() => onTogglePinnedMessage(message.id)}
                          onForward={() => onForwardMessage(message)}
                          onCreateTask={() => onCreateTaskFromMessage(message)}
                          showCreateTask={canCreateTaskFromChat}
                          onDelete={() => onDeleteMessage(message.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="border-t px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] sm:p-1.5">
        <div className="bg-background/88 border-border flex flex-col gap-2 rounded-none border border-x-0 border-b-0 p-1.5 backdrop-blur-sm sm:rounded-md sm:border sm:p-1.5">
          <Textarea
            value={composer}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="Message this space..."
            className="min-h-16 max-h-52 resize-none overflow-y-auto border-0 bg-transparent px-1.5 py-1.5 text-[12px] shadow-none focus-visible:ring-0"
          />

          <DraftAttachmentRow
            attachments={composerAttachments}
            target="main"
            onRemoveAttachment={onRemoveAttachment}
          />

          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => mainComposerUploadRef.current?.click()}
            >
              <ImagePlus className="size-3" />
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

            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
              <AtSign className="size-3" />
              Mention
            </Button>

            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
              <SmilePlus className="size-3" />
              Emoji
            </Button>

            <p className="text-muted-foreground hidden text-[10px] md:block">
              Enter to send
            </p>

            <Button
              size="sm"
              className="ml-auto h-7 px-2.5 text-[11px]"
              onClick={onSendMessage}
              disabled={!canSendMessage}
            >
              <SendHorizontal className="size-3" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainChatPanel;
