"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import useWorkspaceAi from "@/hooks/use-workspace-ai";
import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import useWorkspaceReports from "@/hooks/use-workspace-reports";
import {
  AI_DEFAULT_ESTIMATED_COSTS,
  estimateAiTokenCost,
} from "@/lib/helpers/ai-token-cost";
import { streamWorkspaceAiChatMessage } from "@/lib/services/workspace-ai-service";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
import ChatThread from "./components/chat-thread";
import PromptComposer from "./components/prompt-composer";
import { MODE_OPTIONS, SCOPE_OPTIONS, STARTER_PROMPTS } from "./constants";
import type {
  ComposerReference,
  Message,
  PromptMode,
  PromptScope,
  ReportMentionMeta,
  ReportMentionSuggestion,
  ThinkingTraceStep,
} from "./types";
import {
  buildQuoteBlock,
  createMessageId,
  extractReferencedReportIds,
  toPlainComposerText,
  truncateText,
} from "./utils";

const AskSquirclePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const {
    useWorkspaceAiChatDetail,
    useWorkspaceAiChats,
    useWorkspaceAiStatus,
    useCreateWorkspaceAiChat,
    useSendWorkspaceAiChatMessage,
  } = useWorkspaceAi();
  const workspaceBilling = useWorkspaceBilling();
  const { useWorkspaceReportsList } = useWorkspaceReports();

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<PromptMode>("plan");
  const [scope, setScope] = useState<PromptScope>("workspace");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingTrace, setThinkingTrace] = useState<ThinkingTraceStep[]>([]);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  const [streamingAssistantMessage, setStreamingAssistantMessage] =
    useState<Message | null>(null);
  const [replyReference, setReplyReference] =
    useState<ComposerReference | null>(null);
  const [quotedReference, setQuotedReference] =
    useState<ComposerReference | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoCreateStartedRef = useRef(false);

  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const activeChatId = String(searchParams?.get("chat") || "").trim();

  const chatsQuery = useWorkspaceAiChats(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 20,
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const chatDetailQuery = useWorkspaceAiChatDetail(
    normalizedWorkspaceId,
    activeChatId,
    {
      enabled: !!normalizedWorkspaceId && !!activeChatId,
      limit: 240,
    },
  );

  const reportsQuery = useWorkspaceReportsList(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 80,
      status: "COMPLETED",
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );
  const aiStatusQuery = useWorkspaceAiStatus(normalizedWorkspaceId, {
    enabled: true,
  });
  const billingSummaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    normalizedWorkspaceId,
    undefined,
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const createChatMutation = useCreateWorkspaceAiChat();
  const sendMessageMutation = useSendWorkspaceAiChatMessage();
  const aiDisabledReason = useMemo(() => {
    if (aiStatusQuery.data?.data?.available === false) {
      return (
        String(
          aiStatusQuery.data?.data?.disabledReason ||
            aiStatusQuery.data?.data?.reason ||
            "",
        ).trim() || "Scribe is currently unavailable."
      );
    }

    return "";
  }, [aiStatusQuery.data?.data]);
  const isAiUnavailable = Boolean(aiDisabledReason);

  const persistedMessages = useMemo(
    () => chatDetailQuery.data?.data?.messages || [],
    [chatDetailQuery.data?.data?.messages],
  );
  const effectiveMessages = persistedMessages;

  const messages = useMemo(() => {
    const persistedMessageIds = new Set(
      effectiveMessages.map((entry) => entry.messageId),
    );

    const output = [...effectiveMessages];

    if (pendingMessage && !persistedMessageIds.has(pendingMessage.messageId)) {
      output.push(pendingMessage);
    }

    if (
      streamingAssistantMessage &&
      !persistedMessageIds.has(streamingAssistantMessage.messageId)
    ) {
      output.push(streamingAssistantMessage);
    }

    return output;
  }, [effectiveMessages, pendingMessage, streamingAssistantMessage]);

  const estimatedMessageCost = useMemo(() => {
    const baseEstimate =
      Number(
        aiStatusQuery.data?.data?.estimatedTokenCosts?.scribeMessage || 0,
      ) || AI_DEFAULT_ESTIMATED_COSTS.scribeMessage;

    return estimateAiTokenCost({
      feature: "SCRIBE_CHAT",
      prompt: toPlainComposerText(prompt).trim(),
      contextMessages: Math.min(messages.length, 24),
      payloadSize: baseEstimate,
    });
  }, [
    aiStatusQuery.data?.data?.estimatedTokenCosts?.scribeMessage,
    messages.length,
    prompt,
  ]);
  const currentTokenBalance = Number(
    billingSummaryQuery.data?.data?.workspace?.tokens?.balance || 0,
  );
  const hasKnownInsufficientTokens = useMemo(() => {
    if (
      !normalizedWorkspaceId ||
      !billingSummaryQuery.data?.data?.workspace?.tokens
    ) {
      return false;
    }

    return currentTokenBalance < estimatedMessageCost;
  }, [
    billingSummaryQuery.data?.data?.workspace?.tokens,
    currentTokenBalance,
    estimatedMessageCost,
    normalizedWorkspaceId,
  ]);

  const canSend = useMemo(() => {
    const normalizedPrompt = toPlainComposerText(prompt).trim();
    return (
      normalizedPrompt.length > 0 &&
      !isThinking &&
      !!normalizedWorkspaceId &&
      !!activeChatId &&
      !isAiUnavailable &&
      !hasKnownInsufficientTokens
    );
  }, [
    activeChatId,
    hasKnownInsufficientTokens,
    isAiUnavailable,
    isThinking,
    normalizedWorkspaceId,
    prompt,
  ]);

  const isChatLoading = useMemo(() => {
    if (!normalizedWorkspaceId) {
      return false;
    }

    if (!activeChatId) {
      return chatsQuery.isLoading || createChatMutation.isPending;
    }

    const hasLoadedMessages = Array.isArray(
      chatDetailQuery.data?.data?.messages,
    );
    return (
      (chatDetailQuery.isLoading || chatDetailQuery.isFetching) &&
      !hasLoadedMessages
    );
  }, [
    activeChatId,
    chatDetailQuery.data?.data?.messages,
    chatDetailQuery.isFetching,
    chatDetailQuery.isLoading,
    chatsQuery.isLoading,
    createChatMutation.isPending,
    normalizedWorkspaceId,
  ]);

  const reportMentionSuggestions = useMemo<ReportMentionSuggestion[]>(() => {
    const reports = reportsQuery.data?.data?.reports || [];
    const seen = new Set<string>();
    const suggestions: ReportMentionSuggestion[] = [];

    reports.forEach((report) => {
      const id = String(report?.id || "").trim();
      const title = String(report?.title || "").trim();
      if (!id || !title || seen.has(id)) {
        return;
      }

      seen.add(id);

      const subtitle = report?.project?.name
        ? `${String(report.reportType || "")
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (part) => part.toUpperCase())} · ${String(
            report.project.name,
          )}`
        : String(report.reportType || "")
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (part) => part.toUpperCase());

      suggestions.push({
        id,
        display: title,
        kind: "report",
        subtitle: subtitle || "Report",
      });
    });

    return suggestions;
  }, [reportsQuery.data?.data?.reports]);

  useEffect(() => {
    if (!pendingMessage || !persistedMessages.length) {
      return;
    }

    const hasPersistedPending = persistedMessages.some(
      (entry) => entry.messageId === pendingMessage.messageId,
    );
    if (hasPersistedPending) {
      setPendingMessage(null);
    }
  }, [pendingMessage, persistedMessages]);

  useEffect(() => {
    if (!streamingAssistantMessage || !persistedMessages.length) {
      return;
    }

    const hasPersistedAssistant = persistedMessages.some(
      (entry) => entry.messageId === streamingAssistantMessage.messageId,
    );
    if (hasPersistedAssistant) {
      setStreamingAssistantMessage(null);
    }
  }, [persistedMessages, streamingAssistantMessage]);

  const messagePreviewMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) {
      map.set(message.messageId, truncateText(message.content, 100));
    }
    return map;
  }, [messages]);

  const reportMetaById = useMemo<Record<string, ReportMentionMeta>>(() => {
    const map: Record<string, ReportMentionMeta> = {};

    reportMentionSuggestions.forEach((suggestion) => {
      const id = String(suggestion.id || "").trim();
      if (!id) {
        return;
      }

      map[id] = {
        id,
        title: String(suggestion.display || "").trim() || "Report",
        subtitle: String(suggestion.subtitle || "").trim() || "Report",
      };
    });

    return map;
  }, [reportMentionSuggestions]);

  useEffect(() => {
    autoCreateStartedRef.current = false;
  }, [normalizedWorkspaceId]);

  useEffect(() => {
    const threadMode = chatDetailQuery.data?.data?.chat?.mode;
    if (threadMode && threadMode !== mode) {
      setMode(threadMode);
    }

    const threadScope = chatDetailQuery.data?.data?.chat?.scope;
    if (threadScope && threadScope !== scope) {
      setScope(threadScope);
    }
  }, [
    chatDetailQuery.data?.data?.chat?.mode,
    chatDetailQuery.data?.data?.chat?.scope,
    mode,
    scope,
  ]);

  useEffect(() => {
    if (!normalizedWorkspaceId || activeChatId) {
      return;
    }

    if (chatsQuery.isLoading || createChatMutation.isPending) {
      return;
    }

    const chats = chatsQuery.data?.data?.chats || [];
    if (chats.length > 0) {
      const nextChatId = chats[0]?.chatId;
      if (!nextChatId) {
        return;
      }

      router.replace(
        `${ROUTES.ASK_SQUIRCLE}?chat=${encodeURIComponent(nextChatId)}`,
      );
      return;
    }

    if (autoCreateStartedRef.current) {
      return;
    }

    autoCreateStartedRef.current = true;

    createChatMutation
      .mutateAsync({
        workspaceId: normalizedWorkspaceId,
        payload: {
          mode,
          scope,
        },
      })
      .then((response) => {
        const nextChatId = String(response?.data?.chat?.chatId || "").trim();
        if (!nextChatId) {
          autoCreateStartedRef.current = false;
          return;
        }

        router.replace(
          `${ROUTES.ASK_SQUIRCLE}?chat=${encodeURIComponent(nextChatId)}`,
        );
      })
      .catch(() => {
        autoCreateStartedRef.current = false;
      });
  }, [
    activeChatId,
    chatsQuery.data?.data?.chats,
    chatsQuery.isLoading,
    createChatMutation,
    mode,
    normalizedWorkspaceId,
    router,
    scope,
  ]);

  useEffect(() => {
    const chat = chatContainerRef.current;
    if (!chat) {
      return;
    }

    chat.scrollTo({
      top: chat.scrollHeight,
      behavior: "smooth",
    });
  }, [isThinking, messages]);

  const handleUploadAttachment = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    const nextFileNames = Array.from(files).map((file) => file.name);
    setAttachments((prev) => Array.from(new Set([...prev, ...nextFileNames])));
    event.target.value = "";
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachments((prev) => prev.filter((file) => file !== fileName));
  };

  const handleCopyMessage = async (message: Message) => {
    const content = String(message.content || "");
    if (!content) {
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
      toast.success("Message copied.");
    } catch {
      toast.error("Could not copy this message.");
    }
  };

  const handleReplyMessage = (message: Message) => {
    setReplyReference({
      messageId: message.messageId,
      role: message.role,
      preview: truncateText(message.content, 90),
    });
  };

  const handleQuoteMessage = (message: Message) => {
    setQuotedReference({
      messageId: message.messageId,
      role: message.role,
      preview: truncateText(message.content, 90),
    });

    const quoteBlock = buildQuoteBlock(message.content);
    if (quoteBlock) {
      setPrompt((prev) => `${quoteBlock}${prev}`);
    }
  };

  const showTokenInsufficientToast = (errorDetails?: {
    requiredTokens?: number;
    currentBalance?: number;
    plan?: string;
  }) => {
    const requiredTokens = Number(
      errorDetails?.requiredTokens || estimatedMessageCost || 0,
    );
    const currentBalance = Number(
      errorDetails?.currentBalance || currentTokenBalance || 0,
    );
    const plan = String(errorDetails?.plan || "")
      .trim()
      .toUpperCase();
    const requiredLabel =
      requiredTokens > 0 ? requiredTokens.toLocaleString() : "the required";
    const balanceLabel = currentBalance.toLocaleString();

    toast.error("Not enough AI credits", {
      description: `This message needs about ${requiredLabel} credits. Your workspace has ${balanceLabel}${plan ? ` on ${plan}` : ""}.`,
      action: {
        label: "Open billing",
        onClick: () => router.push(ROUTES.SETTINGS_BILLING),
      },
    });
  };

  const handleSendPrompt = async (value?: string) => {
    const rawPrompt = String(value ?? prompt ?? "");
    const normalizedPrompt = toPlainComposerText(rawPrompt).trim();

    if (
      !normalizedPrompt ||
      isThinking ||
      !normalizedWorkspaceId ||
      !activeChatId
    ) {
      return;
    }

    if (isAiUnavailable) {
      toast.error(aiDisabledReason || "Scribe is currently unavailable.");
      return;
    }

    if (hasKnownInsufficientTokens) {
      showTokenInsufficientToast({
        requiredTokens: estimatedMessageCost,
        currentBalance: currentTokenBalance,
      });
      return;
    }

    const selectedAttachments = attachments;
    const referencedReportIds = extractReferencedReportIds(rawPrompt);
    const requestPayload = {
      content: rawPrompt.trim(),
      mode,
      scope,
      attachments: selectedAttachments,
      replyToMessageId: replyReference?.messageId,
      quotedMessageId: quotedReference?.messageId,
      reportReferenceIds: referencedReportIds,
    };
    const optimisticMessage: Message = {
      messageId: createMessageId(),
      role: "user",
      content: rawPrompt.trim(),
      attachments: selectedAttachments,
      replyToMessageId: replyReference?.messageId || "",
      quotedMessageId: quotedReference?.messageId || "",
      provider: "",
      model: "",
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalDurationNs: 0,
        loadDurationNs: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPendingMessage(optimisticMessage);
    setStreamingAssistantMessage(null);
    setPrompt("");
    setAttachments([]);
    setIsThinking(true);
    setThinkingTrace([
      {
        id: "thinking-read-prompt",
        title: "Understanding your prompt",
        details: [
          "Preparing workspace-safe reasoning trace",
          "Checking whether deterministic facts can answer directly",
        ],
        code: "read-prompt",
        timestamp: new Date().toISOString(),
      },
    ]);
    let streamAcknowledged = false;
    let hasStreamedDelta = false;

    const pushThinkingStep = (step: {
      title: string;
      code?: string;
      details?: string[];
      timestamp?: string;
    }) => {
      const normalizedTitle = String(step?.title || "").trim();
      if (!normalizedTitle) {
        return;
      }

      const normalizedCode = String(step?.code || "").trim().toLowerCase();
      const normalizedDetails = Array.isArray(step?.details)
        ? step.details
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];

      setThinkingTrace((current) => {
        const existingIndex = normalizedCode
          ? current.findIndex(
              (entry) =>
                String(entry.code || "").trim().toLowerCase() ===
                normalizedCode,
            )
          : -1;

        if (existingIndex >= 0) {
          const updated = [...current];
          updated[existingIndex] = {
            ...updated[existingIndex],
            title: normalizedTitle,
            details: normalizedDetails.length
              ? normalizedDetails
              : updated[existingIndex].details,
            timestamp:
              String(step?.timestamp || "").trim() ||
              updated[existingIndex].timestamp,
          };
          return updated.slice(-8);
        }

        const lastStep = current[current.length - 1];
        if (
          lastStep &&
          String(lastStep.title || "").trim() === normalizedTitle &&
          !normalizedCode
        ) {
          return current;
        }

        const deduped = [
          ...current,
          {
            id: `${normalizedCode || "trace"}-${Date.now()}-${current.length + 1}`,
            title: normalizedTitle,
            details: normalizedDetails,
            code: normalizedCode || undefined,
            timestamp: String(step?.timestamp || "").trim() || new Date().toISOString(),
          },
        ];
        return deduped.slice(-8);
      });
    };

    try {
      await streamWorkspaceAiChatMessage({
        workspaceId: normalizedWorkspaceId,
        chatId: activeChatId,
        payload: requestPayload,
        onEvent: (event) => {
          if (event.type === "ack") {
            streamAcknowledged = true;
            pushThinkingStep({
              title: "Preparing your response",
              code: "prepare-response",
              details: [
                "Prompt accepted and persisted to chat history",
                "Starting assistant response pipeline",
              ],
            });
            const acknowledgedUserMessage = event.payload?.userMessage;
            if (acknowledgedUserMessage) {
              setPendingMessage(acknowledgedUserMessage);
            }
            return;
          }

          if (event.type === "status") {
            pushThinkingStep({
              title: event.payload?.text || "",
              code: event.payload?.code,
              details: event.payload?.details || [],
              timestamp: event.payload?.timestamp,
            });
            return;
          }

          if (event.type === "delta") {
            const delta = String(event.delta || "");
            if (!delta) {
              return;
            }
            if (!hasStreamedDelta) {
              hasStreamedDelta = true;
              pushThinkingStep({
                title: "Writing response",
                code: "writing-response",
                details: [
                  "First words received",
                  "Assembling final answer in real time",
                ],
              });
            }

            setStreamingAssistantMessage((current) => {
              const baseMessage =
                current ||
                ({
                  messageId: createMessageId(),
                  role: "assistant",
                  content: "",
                  attachments: [],
                  replyToMessageId: optimisticMessage.messageId,
                  quotedMessageId: "",
                  provider: "",
                  model: "",
                  usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalDurationNs: 0,
                    loadDurationNs: 0,
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } satisfies Message);

              return {
                ...baseMessage,
                content: `${baseMessage.content || ""}${delta}`,
                updatedAt: new Date().toISOString(),
              };
            });
            return;
          }

          if (event.type === "done") {
            pushThinkingStep({
              title: "Done",
              code: "done",
              details: [
                "Response finalized and saved to chat",
                "Usage telemetry captured",
              ],
            });
            const assistantMessage = event.payload?.assistantMessage;
            if (assistantMessage) {
              setStreamingAssistantMessage(assistantMessage);
            }
            return;
          }

          if (event.type === "error") {
            const streamedError = new Error(
              event.error?.message || "Unable to stream AI response.",
            ) as Error & {
              code?: string;
              details?: {
                requiredTokens?: number;
                currentBalance?: number;
                plan?: string;
              };
            };
            streamedError.code = event.error?.code;
            streamedError.details = event.error?.details as
              | {
                  requiredTokens?: number;
                  currentBalance?: number;
                  plan?: string;
                }
              | undefined;
            throw streamedError;
          }
        },
      });

      setReplyReference(null);
      setQuotedReference(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-ai-chat-detail",
            normalizedWorkspaceId,
            activeChatId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
        }),
      ]);

      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-ai-chat-detail",
            normalizedWorkspaceId,
            activeChatId,
          ],
        });
      }, 1400);
    } catch (error) {
      const errorCode = String((error as { code?: string })?.code || "")
        .trim()
        .toUpperCase();
      if (errorCode === "TOKEN_INSUFFICIENT") {
        setPrompt(rawPrompt.trim());
        setPendingMessage(null);
        setStreamingAssistantMessage(null);
        setThinkingTrace([]);
        showTokenInsufficientToast(
          (
            error as {
              details?: {
                requiredTokens?: number;
                currentBalance?: number;
                plan?: string;
              };
            }
          )?.details,
        );
        return;
      }

      if (!streamAcknowledged) {
        try {
          await sendMessageMutation.mutateAsync({
            workspaceId: normalizedWorkspaceId,
            chatId: activeChatId,
            payload: requestPayload,
          });

          setReplyReference(null);
          setQuotedReference(null);
          setPendingMessage(null);
          setStreamingAssistantMessage(null);
          setThinkingTrace([]);

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "workspace-ai-chat-detail",
                normalizedWorkspaceId,
                activeChatId,
              ],
            }),
            queryClient.invalidateQueries({
              queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
            }),
          ]);
        } catch (fallbackError) {
          const fallbackErrorCode = String(
            (fallbackError as { code?: string })?.code || "",
          )
            .trim()
            .toUpperCase();
          if (fallbackErrorCode === "TOKEN_INSUFFICIENT") {
            showTokenInsufficientToast(
              (
                fallbackError as {
                  details?: {
                    requiredTokens?: number;
                    currentBalance?: number;
                    plan?: string;
                  };
                }
              )?.details,
            );
          } else {
            toast.error(
              aiDisabledReason ||
                "Unable to generate an AI response right now.",
            );
          }
          setPrompt(rawPrompt.trim());
          setPendingMessage(null);
          setStreamingAssistantMessage(null);
          setThinkingTrace([]);
        }
      } else {
        console.error("AI stream interrupted after ack", error);

        setThinkingTrace([]);

        toast.error(
          (error as Error)?.message ||
            "Streaming was interrupted. Refreshing chat state.",
        );
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "workspace-ai-chat-detail",
              normalizedWorkspaceId,
              activeChatId,
            ],
          }),
          queryClient.invalidateQueries({
            queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
          }),
        ]);
      }
    } finally {
      setIsThinking(false);
      setThinkingTrace([]);
    }
  };

  const handleOpenReport = (reportId: string) => {
    const normalizedReportId = String(reportId || "").trim();
    if (!normalizedReportId) {
      return;
    }

    router.push(`${ROUTES.REPORTS}/${encodeURIComponent(normalizedReportId)}`);
  };

  return (
    <div className="h-full min-h-0 w-full bg-background">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
        <div
          ref={chatContainerRef}
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto w-full max-w-4xl px-4 pb-5 md:px-6 md:py-6 ">
            <ChatThread
              messages={messages}
              isLoading={isChatLoading}
              isThinking={isThinking && !streamingAssistantMessage?.content}
              thinkingTrace={thinkingTrace}
              starterPrompts={STARTER_PROMPTS}
              activeReplyToMessageId={replyReference?.messageId}
              activeQuotedMessageId={quotedReference?.messageId}
              onPickStarterPrompt={handleSendPrompt}
              onCopyMessage={handleCopyMessage}
              onReplyMessage={handleReplyMessage}
              onQuoteMessage={handleQuoteMessage}
              resolveMessagePreview={(messageId) =>
                messagePreviewMap.get(messageId) || ""
              }
              onOpenReport={handleOpenReport}
              reportMetaById={reportMetaById}
            />
          </div>
        </div>

        <footer className="px-3 pb-3 md:px-6 md:pb-4 ">
          <div className="mx-auto w-full max-w-4xl">
            <PromptComposer
              prompt={prompt}
              mode={mode}
              scope={scope}
              attachments={attachments}
              replyReference={replyReference}
              quotedReference={quotedReference}
              canSend={canSend}
              modeOptions={MODE_OPTIONS}
              scopeOptions={SCOPE_OPTIONS}
              reportMentionSuggestions={reportMentionSuggestions}
              fileInputRef={fileInputRef}
              onPromptChange={setPrompt}
              onModeChange={setMode}
              onScopeChange={setScope}
              onClearReplyReference={() => setReplyReference(null)}
              onClearQuotedReference={() => setQuotedReference(null)}
              onRemoveAttachment={handleRemoveAttachment}
              onUploadAttachment={handleUploadAttachment}
              onSend={() => handleSendPrompt()}
              disableAiActions={isAiUnavailable}
              disabledReason={
                hasKnownInsufficientTokens
                  ? `Low credit balance. This prompt needs about ${estimatedMessageCost.toLocaleString()} credits.`
                  : aiDisabledReason
              }
              estimatedTokenCost={estimatedMessageCost}
              tokenBalance={currentTokenBalance}
            />
          </div>
        </footer>

        {!normalizedWorkspaceId ? (
          <div className="text-destructive px-6 pb-2 text-[11px]">
            No active workspace selected.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AskSquirclePage;
