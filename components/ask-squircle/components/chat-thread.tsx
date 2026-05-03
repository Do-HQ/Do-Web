import {
  CornerDownRight,
  Copy,
  Lightbulb,
  Quote,
  Reply,
  Gem,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import MessageMarkdown from "./message-markdown";
import type { Message, ReportMentionMeta } from "../types";

type ChatThreadProps = {
  messages: Message[];
  isLoading?: boolean;
  isThinking: boolean;
  starterPrompts: string[];
  activeReplyToMessageId?: string;
  activeQuotedMessageId?: string;
  onPickStarterPrompt: (prompt: string) => void;
  onCopyMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  onQuoteMessage: (message: Message) => void;
  resolveMessagePreview: (messageId: string) => string;
  onOpenReport: (reportId: string) => void;
  reportMetaById: Record<string, ReportMentionMeta>;
};

const ChatThread = ({
  messages,
  isLoading = false,
  isThinking,
  starterPrompts,
  activeReplyToMessageId,
  activeQuotedMessageId,
  onPickStarterPrompt,
  onCopyMessage,
  onReplyMessage,
  onQuoteMessage,
  resolveMessagePreview,
  onOpenReport,
  reportMetaById,
}: ChatThreadProps) => {
  if (isLoading) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`chat-loading-${index + 1}`}
            className={cn(
              "flex w-full",
              index % 2 === 0 ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "w-full max-w-3xl space-y-2",
                index % 2 !== 0 && "max-w-[80%]",
              )}
            >
              <div className="space-y-2 rounded-md px-3.5 py-3">
                <Skeleton className="h-3 w-7/12" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-9/12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const repliedPreview = message.replyToMessageId
          ? resolveMessagePreview(message.replyToMessageId)
          : "";
        const quotedPreview = message.quotedMessageId
          ? resolveMessagePreview(message.quotedMessageId)
          : "";
        const hasThreadContext = Boolean(repliedPreview || quotedPreview);

        return (
          <div
            key={message.messageId}
            className={cn(
              "group animate-in fade-in slide-in-from-bottom-2 duration-300 flex w-full",
              isAssistant ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "w-full max-w-3xl space-y-2",
                !isAssistant && "max-w-[80%]",
              )}
            >
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                {isAssistant ? <Gem className="size-3.5" /> : null}
                {isAssistant ? "Scribe" : "You"}
              </div>

              {hasThreadContext ? (
                <div className="border-border/70 ml-1 border-l pl-2.5 text-[11px] text-muted-foreground">
                  {repliedPreview ? (
                    <p className="flex items-center gap-1">
                      <CornerDownRight className="size-3" />
                      Replying to: {repliedPreview}
                    </p>
                  ) : null}
                  {quotedPreview ? <p>Quoted: {quotedPreview}</p> : null}
                </div>
              ) : null}

              {isAssistant ? (
                <div className="rounded-md px-3.5 py-3">
                  <MessageMarkdown
                    content={message.content}
                    onOpenReport={onOpenReport}
                    reportMetaById={reportMetaById}
                  />
                </div>
              ) : (
                <div className="px-0.5 py-0.5">
                  <MessageMarkdown
                    content={message.content}
                    className="text-right"
                    onOpenReport={onOpenReport}
                    reportMetaById={reportMetaById}
                  />
                </div>
              )}

              <div
                className={cn(
                  "flex items-center gap-1",
                  !isAssistant && "justify-end",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7 rounded-md px-2 text-[11px]"
                  onClick={() => onCopyMessage(message)}
                >
                  <Copy className="mr-1 size-3" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-muted-foreground h-7 rounded-md px-2 text-[11px]",
                    activeReplyToMessageId === message.messageId &&
                      "bg-accent text-foreground",
                  )}
                  onClick={() => onReplyMessage(message)}
                >
                  <Reply className="mr-1 size-3" />
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-muted-foreground h-7 rounded-md px-2 text-[11px]",
                    activeQuotedMessageId === message.messageId &&
                      "bg-accent text-foreground",
                  )}
                  onClick={() => onQuoteMessage(message)}
                >
                  <Quote className="mr-1 size-3" />
                  Quote
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {isThinking ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-full max-w-3xl space-y-2">
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Gem className="size-3.5" />
              Scribe is thinking...
            </div>
            <div className="rounded-md bg-card px-3.5 py-3">
              <div className="space-y-2">
                <div className="bg-muted h-3 w-5/12 animate-pulse rounded" />
                <div className="bg-muted h-3 w-11/12 animate-pulse rounded" />
                <div className="bg-muted h-3 w-8/12 animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {messages.length < 1 ? (
        <div className="pt-1">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] tracking-wide">
            <Star className="size-3.5" />
            Suggested prompts
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {starterPrompts.map((suggestion) => (
              <button
                key={suggestion}
                className="bg-background hover:bg-muted/40 border-border/60 flex items-start gap-2 rounded-md border px-3 py-2 text-left text-xs leading-5 transition-colors"
                onClick={() => onPickStarterPrompt(suggestion)}
              >
                <ChevronRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ChatThread;
