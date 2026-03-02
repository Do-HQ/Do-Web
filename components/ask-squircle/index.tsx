"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import useAuthStore from "@/stores/auth";
import ChatThread from "./components/chat-thread";
import PromptComposer from "./components/prompt-composer";
import {
  MODE_OPTIONS,
  SCOPE_OPTIONS,
  STARTER_PROMPTS,
  WELCOME_MESSAGE,
} from "./constants";
import type { Message, PromptMode, PromptScope } from "./types";
import { buildAssistantReply, createMessageId, getInitials } from "./utils";

const AskSquirclePage = () => {
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<PromptMode>("plan");
  const [scope, setScope] = useState<PromptScope>("workspace");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(() => {
    return prompt.trim().length > 0 && !isThinking;
  }, [prompt, isThinking]);

  const userInitials = useMemo(() => {
    return getInitials(user?.firstName, user?.lastName, user?.email);
  }, [user?.email, user?.firstName, user?.lastName]);

  useEffect(() => {
    const chat = chatContainerRef.current;
    if (!chat) {
      return;
    }

    chat.scrollTo({
      top: chat.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  const handleSendPrompt = (value?: string) => {
    const rawPrompt = (value ?? prompt).trim();

    if (!rawPrompt || isThinking) {
      return;
    }

    const userMessage: Message = {
      id: createMessageId(),
      role: "user",
      content: rawPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsThinking(true);

    const attachmentCount = attachments.length;
    setAttachments([]);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const assistantMessage: Message = {
        id: createMessageId(),
        role: "assistant",
        content: buildAssistantReply(rawPrompt, mode, scope, attachmentCount),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 900);
  };

  return (
    <div className="h-full min-h-0 w-full px-15">
      <div className="flex h-full min-h-0 flex-col px-0 py-1 sm:px-3 sm:py-3 md:px-5 md:py-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 px-2 sm:mb-3 sm:px-0">
          <Badge variant="outline" className="gap-1.5 text-[11px]">
            <Sparkles className="size-3.5" />
            Ask Squircle
          </Badge>
          <Badge variant="secondary" className="text-[11px]">
            Preview
          </Badge>
          <p className="text-muted-foreground ml-auto text-[11px]">
            workspace copilot simulation
          </p>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 sm:space-y-3 sm:px-0 sm:pb-3 sm:pr-1"
        >
          <ChatThread
            messages={messages}
            isThinking={isThinking}
            userAvatarUrl={user?.profilePhoto?.url}
            userEmail={user?.email}
            userInitials={userInitials}
            starterPrompts={STARTER_PROMPTS}
            onPickStarterPrompt={handleSendPrompt}
          />
        </div>

        <PromptComposer
          prompt={prompt}
          mode={mode}
          scope={scope}
          attachments={attachments}
          canSend={canSend}
          modeOptions={MODE_OPTIONS}
          scopeOptions={SCOPE_OPTIONS}
          fileInputRef={fileInputRef}
          onPromptChange={setPrompt}
          onModeChange={setMode}
          onScopeChange={setScope}
          onRemoveAttachment={handleRemoveAttachment}
          onUploadAttachment={handleUploadAttachment}
          onSend={() => handleSendPrompt()}
        />
      </div>
    </div>
  );
};

export default AskSquirclePage;
