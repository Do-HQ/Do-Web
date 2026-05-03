import type React from "react";
import {
  CornerDownRight,
  FileText,
  Paperclip,
  Quote,
  SendHorizontal,
  X,
} from "lucide-react";
import { Mention, MentionsInput } from "react-mentions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ComposerReference,
  PromptMode,
  PromptOption,
  PromptScope,
  ReportMentionSuggestion,
} from "../types";

type PromptComposerProps = {
  prompt: string;
  mode: PromptMode;
  scope: PromptScope;
  attachments: string[];
  replyReference: ComposerReference | null;
  quotedReference: ComposerReference | null;
  canSend: boolean;
  modeOptions: Array<PromptOption<PromptMode>>;
  scopeOptions: Array<PromptOption<PromptScope>>;
  reportMentionSuggestions: ReportMentionSuggestion[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (value: string) => void;
  onModeChange: (value: PromptMode) => void;
  onScopeChange: (value: PromptScope) => void;
  onClearReplyReference: () => void;
  onClearQuotedReference: () => void;
  onRemoveAttachment: (fileName: string) => void;
  onUploadAttachment: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  disableAiActions?: boolean;
  disabledReason?: string;
  estimatedTokenCost?: number;
  tokenBalance?: number;
};

const PromptComposer = ({
  prompt,
  mode,
  scope,
  attachments,
  replyReference,
  quotedReference,
  canSend,
  modeOptions,
  scopeOptions,
  reportMentionSuggestions,
  fileInputRef,
  onPromptChange,
  onModeChange,
  onScopeChange,
  onClearReplyReference,
  onClearQuotedReference,
  onRemoveAttachment,
  onUploadAttachment,
  onSend,
  disableAiActions = false,
  disabledReason = "",
  estimatedTokenCost = 0,
  tokenBalance = 0,
}: PromptComposerProps) => {
  const suggestionsPortalHost =
    typeof window !== "undefined" ? document.body : undefined;

  const mentionInputStyle = {
    control: {
      backgroundColor: "transparent",
      fontSize: 14,
      fontWeight: 400,
    },
    highlighter: {
      overflow: "hidden",
      padding: "4px 8px",
      minHeight: "56px",
    },
    input: {
      margin: 0,
      border: 0,
      color: "var(--foreground)",
      backgroundColor: "transparent",
      minHeight: "56px",
      maxHeight: "192px",
      overflowY: "auto",
      outline: "none",
      padding: "4px 8px",
      lineHeight: "1.45",
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
    suggestion: { display?: string; subtitle?: string },
    _search: string,
    highlightedDisplay: React.ReactNode,
    _index: number,
    focused: boolean,
  ) => {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-1 py-1",
          focused && "bg-accent/60",
        )}
      >
        <span className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-md border border-border/60">
          <FileText className="size-3 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] leading-tight">
            {highlightedDisplay || String(suggestion.display || "")}
          </p>
          <p className="text-muted-foreground truncate text-[10px] leading-tight">
            {suggestion.subtitle || "Report"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background border-border/70 flex flex-col gap-2 rounded-lg border p-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom))] sm:p-3">
      <MentionsInput
        value={prompt}
        onChange={(_event, nextValue) => onPromptChange(nextValue)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (disableAiActions || !canSend) {
              return;
            }
            onSend();
          }
        }}
        placeholder="Ask Scribe anything about your workspace... Use # to reference a report."
        style={mentionInputStyle}
        className="min-h-14 max-h-48 rounded-md border border-transparent bg-transparent shadow-none"
        a11ySuggestionsListLabel="Report references"
        suggestionsPortalHost={suggestionsPortalHost}
        forceSuggestionsAboveCursor
      >
        <Mention
          trigger="#"
          data={reportMentionSuggestions}
          markup="#[__display__](__id__)"
          displayTransform={(_id, display) => display || _id}
          renderSuggestion={renderMentionSuggestion}
          appendSpaceOnAdd
        />
      </MentionsInput>

      {disabledReason ? (
        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          {disabledReason || "Scribe is currently unavailable in this environment."}
        </div>
      ) : null}

      {replyReference || quotedReference ? (
        <div className="flex flex-wrap gap-1.5">
          {replyReference ? (
            <div className="bg-muted/60 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-[11px]">
              <CornerDownRight className="text-muted-foreground size-3" />
              <span className="text-muted-foreground">Replying to</span>
              <span className="max-w-44 truncate">
                {replyReference.preview}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={onClearReplyReference}
                aria-label="Clear reply target"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : null}

          {quotedReference ? (
            <div className="bg-muted/60 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-[11px]">
              <Quote className="text-muted-foreground size-3" />
              <span className="text-muted-foreground">Quoted</span>
              <span className="max-w-44 truncate">
                {quotedReference.preview}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={onClearQuotedReference}
                aria-label="Clear quote target"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((fileName) => (
            <div
              key={fileName}
              className="bg-muted/60 text-foreground inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[11px]"
            >
              <FileText className="size-3" />
              <span>{fileName}</span>
              <button
                type="button"
                className="hover:text-foreground text-muted-foreground"
                onClick={() => onRemoveAttachment(fileName)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={mode}
          onValueChange={(value) => onModeChange(value as PromptMode)}
          disabled={disableAiActions}
        >
          <SelectTrigger className="h-8 w-[7.2rem] rounded-md border-border/70 bg-background text-xs sm:w-30">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            {modeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={scope}
          onValueChange={(value) => onScopeChange(value as PromptScope)}
          disabled={disableAiActions}
        >
          <SelectTrigger className="h-8 w-[7.2rem] rounded-md border-border/70 bg-background text-xs sm:w-30">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            {scopeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-md border-border/70 px-2 text-xs sm:px-3"
          onClick={() => fileInputRef.current?.click()}
          disabled={disableAiActions}
        >
          <Paperclip className="size-3.5" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={onUploadAttachment}
        />

        <div className="ml-auto flex items-center gap-1">
          {estimatedTokenCost > 0 ? (
            <p className="text-muted-foreground hidden items-center gap-1 text-[11px] lg:flex">
              Est. {estimatedTokenCost.toLocaleString()} tokens
              {tokenBalance > 0 ? ` · ${tokenBalance.toLocaleString()} left` : ""}
            </p>
          ) : null}
          <p className="text-muted-foreground hidden items-center gap-1 text-[11px] lg:flex">
            Shift + Enter for newline
          </p>
          <Button
            size="sm"
            className="h-8 rounded-md px-3.5"
            onClick={onSend}
            disabled={!canSend || disableAiActions}
          >
            <SendHorizontal className="size-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromptComposer;
