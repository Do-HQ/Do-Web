"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const EDITABLE_TARGET_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [role='textbox'], .bn-editor, .ProseMirror, .cm-editor, [data-editor-root='true'], [data-composer-root='true']";

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest(EDITABLE_TARGET_SELECTOR));
};

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "ai-intro",
    role: "assistant",
    content:
      "You are in UI-only assistant mode. Ask anything and we will thread prompts here while backend AI wiring comes next.",
  },
];

const AIAssistantOverlay = () => {
  const {
    showAiAssistantOverlay,
    setShowAiAssistantOverlay,
    setShowSpotlightSearch,
    setShowSettings,
    showSpotlightSearch,
    showSettings,
  } = useAppStore();

  const [prompt, setPrompt] = React.useState("");
  const [messages, setMessages] =
    React.useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = React.useState(false);

  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const responsesRef = React.useRef<HTMLDivElement | null>(null);
  const responseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const openOverlay = React.useCallback(() => {
    setShowSpotlightSearch(false);
    setShowSettings(false);
    setShowAiAssistantOverlay(true);
  }, [setShowAiAssistantOverlay, setShowSettings, setShowSpotlightSearch]);

  const canSubmit = prompt.trim().length > 0 && !isLoading;

  const submitPrompt = React.useCallback(() => {
    const cleanedPrompt = prompt.trim();

    if (!cleanedPrompt || isLoading) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: "user",
      content: cleanedPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);

    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
    }

    responseTimerRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Captured. This overlay is ready for the real model integration next. For now, this is a polished UI thread only.",
        },
      ]);
      setIsLoading(false);
    }, 700);
  }, [isLoading, prompt]);

  const handlePromptKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitPrompt();
      }
    },
    [submitPrompt],
  );

  React.useEffect(() => {
    if (!showAiAssistantOverlay) {
      return;
    }

    if (showSpotlightSearch || showSettings) {
      setShowAiAssistantOverlay(false);
    }
  }, [
    setShowAiAssistantOverlay,
    showAiAssistantOverlay,
    showSettings,
    showSpotlightSearch,
  ]);

  React.useEffect(() => {
    if (!showAiAssistantOverlay) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [showAiAssistantOverlay]);

  React.useEffect(() => {
    const node = responsesRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }, [isLoading, messages]);

  React.useEffect(() => {
    return () => {
      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current);
      }
    };
  }, []);

  useHotkeys(
    "meta+a,ctrl+a",
    (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      openOverlay();
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      keydown: true,
      keyup: false,
      preventDefault: false,
    },
    [openOverlay],
  );

  return (
    <Dialog
      open={showAiAssistantOverlay}
      onOpenChange={setShowAiAssistantOverlay}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[140] bg-black/18 backdrop-blur-[1.5px]"
        className="ai-overlay__content data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 top-0 right-0 left-0 mx-auto z-141 h-dvh w-screen max-w-none translate-x-0 translate-y-0 border-0 bg-transparent p-0 shadow-none duration-200 sm:max-w-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>AI Assistant</DialogTitle>
          <DialogDescription>
            Global AI overlay for prompt writing and threaded responses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full w-full items-center justify-center px-2 py-3 sm:px-6 sm:py-6">
          <section className="relative flex h-full w-full max-w-[min(40vw,1080px)] flex-col overflow-hidden rounded-xl bg-background/35 shadow-2xl backdrop-blur-xl">
            <div
              ref={responsesRef}
              className="ai-overlay__responses flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[min(92%,40rem)] rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                    message.role === "user"
                      ? "ai-overlay__msg--user bg-muted/35 ml-auto"
                      : "ai-overlay__msg--assistant bg-background/35 mr-auto",
                  )}
                >
                  {message.content}
                </div>
              ))}

              {isLoading ? (
                <div className="ai-overlay__loading bg-background/35 mr-auto w-full max-w-[min(92%,40rem)] space-y-2 rounded-2xl px-4 py-3">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              ) : null}
            </div>

            <div className="border-border/45 bg-background/30 border-t px-4 pt-3 pb-4 sm:px-6 sm:pb-5">
              <div className="ai-overlay__prompt rounded-2xl border border-border/45 bg-muted/30 p-2.5">
                <Textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Ask anything"
                  className="min-h-[46px] resize-none border-none bg-transparent px-2 py-2 text-[13px] leading-relaxed shadow-none focus-visible:ring-0"
                  aria-label="AI assistant prompt"
                />

                <div className="flex items-center justify-end pt-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    className="rounded-full"
                    disabled={!canSubmit}
                    onClick={submitPrompt}
                    aria-label="Submit prompt"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIAssistantOverlay;
