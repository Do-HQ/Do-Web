import {
  CornerDownRight,
  Copy,
  Quote,
  Reply,
  Gem,
  Star,
  ChevronRight,
  Loader,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import MessageMarkdown from "./message-markdown";
import type { Message, ReportMentionMeta, ThinkingTraceStep } from "../types";

type ChatThreadProps = {
  messages: Message[];
  isLoading?: boolean;
  isThinking: boolean;
  thinkingTrace?: ThinkingTraceStep[];
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
  thinkingTrace = [],
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
                {isAssistant ? "Squircle Intelligence" : "You"}
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
              <Gem className="size-3.5 animate-pulse" />
              Squircle Intelligence
            </div>

            <div className="rounded-xl bg-muted/10 px-4 py-3.5">
              {/* Header */}
              <div className="mb-3 flex items-center gap-2">
                <Loader className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                  Reasoning
                </span>
              </div>

              {thinkingTrace.length > 0 ? (
                <div className="relative">
                  {/* Vertical guide line */}
                  <div className="absolute left-1.25 top-2 bottom-2 w-px bg-border/40" />

                  <div className="space-y-0">
                    {thinkingTrace.slice(-6).map((step, index, traceList) => {
                      const isCurrent = index === traceList.length - 1;
                      const details = Array.isArray(step.details)
                        ? step.details.filter(Boolean).slice(0, 5)
                        : [];

                      return (
                        <div key={step.id} className="relative pl-5">
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              "absolute left-0 top-1.25 flex size-2.75 items-center justify-center rounded-full ring-2 ring-background",
                              isCurrent
                                ? "bg-foreground"
                                : "bg-muted-foreground/30",
                            )}
                          >
                            {isCurrent ? (
                              <span className="size-1.5 animate-ping rounded-full bg-background opacity-80" />
                            ) : (
                              <Check className="size-1.5 text-background" />
                            )}
                          </div>

                          {/* Step content */}
                          <div
                            className={cn(
                              "mb-3 rounded-lg px-3 py-2 transition-all",
                              isCurrent
                                ? "bg-muted/30 border border-border/30"
                                : "bg-transparent",
                            )}
                          >
                            <p
                              className={cn(
                                "text-[11px] leading-4",
                                isCurrent
                                  ? "font-medium text-foreground"
                                  : "text-muted-foreground/70",
                              )}
                            >
                              {step.title}
                            </p>

                            {isCurrent && details.length > 0 ? (
                              <ul className="mt-1.5 space-y-0.5">
                                {details.map((detail, di) => (
                                  <li
                                    key={`${step.id}-d-${di}`}
                                    className="flex items-start gap-1.5 text-[10px] text-muted-foreground"
                                  >
                                    <span className="mt-px shrink-0 text-muted-foreground/50">
                                      ›
                                    </span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {/* Generating row */}
                    <div className="relative pl-5">
                      <div className="absolute left-0 top-1.25 size-2.75 rounded-full border-2 border-dashed border-muted-foreground/30" />
                      <div className="mb-1 space-y-1.5 py-1">
                        <div className="h-2.5 w-7/12 animate-pulse rounded-full bg-muted" />
                        <div className="h-2.5 w-10/12 animate-pulse rounded-full bg-muted" />
                        <div className="h-2.5 w-5/12 animate-pulse rounded-full bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* No trace yet — just skeleton */
                <div className="space-y-2 pl-1">
                  <div className="h-2.5 w-5/12 animate-pulse rounded-full bg-muted" />
                  <div className="h-2.5 w-10/12 animate-pulse rounded-full bg-muted" />
                  <div className="h-2.5 w-7/12 animate-pulse rounded-full bg-muted" />
                </div>
              )}
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
