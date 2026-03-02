import type React from "react";
import {
  Brain,
  CornerDownLeft,
  FileText,
  Mic,
  Paperclip,
  SendHorizontal,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PromptMode, PromptOption, PromptScope } from "../types";

type PromptComposerProps = {
  prompt: string;
  mode: PromptMode;
  scope: PromptScope;
  attachments: string[];
  canSend: boolean;
  modeOptions: Array<PromptOption<PromptMode>>;
  scopeOptions: Array<PromptOption<PromptScope>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (value: string) => void;
  onModeChange: (value: PromptMode) => void;
  onScopeChange: (value: PromptScope) => void;
  onRemoveAttachment: (fileName: string) => void;
  onUploadAttachment: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
};

const PromptComposer = ({
  prompt,
  mode,
  scope,
  attachments,
  canSend,
  modeOptions,
  scopeOptions,
  fileInputRef,
  onPromptChange,
  onModeChange,
  onScopeChange,
  onRemoveAttachment,
  onUploadAttachment,
  onSend,
}: PromptComposerProps) => {
  return (
    <div className="bg-background/88 border-border flex flex-col gap-2 border border-x-0 border-b-0 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:gap-3 sm:rounded-md sm:border sm:p-2.5">
      <Textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder="Ask Squircle to analyze, plan, or execute next actions..."
        className="min-h-16 max-h-52 resize-none overflow-y-auto  border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
      />

      {attachments.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {attachments.map((fileName) => (
            <div
              key={fileName}
              className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
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
      )}

      <div className="flex flex-wrap items-center gap-1">
        <Select
          value={mode}
          onValueChange={(value) => onModeChange(value as PromptMode)}
        >
          <SelectTrigger className="h-8 w-[7.5rem] text-xs sm:w-32">
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
        >
          <SelectTrigger className="h-8 w-[7.5rem] text-xs sm:w-32">
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
          variant="ghost"
          className="h-8 px-2 text-xs sm:px-2.5"
          onClick={() => fileInputRef.current?.click()}
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

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs sm:px-2.5"
        >
          <Mic className="size-3.5" />
          Voice
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="hidden h-8 px-2 text-xs min-[420px]:inline-flex sm:px-2.5"
        >
          <Brain className="size-3.5" />
          Think
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="hidden h-8 px-2 text-xs min-[420px]:inline-flex sm:px-2.5"
        >
          <WandSparkles className="size-3.5" />
          Refine
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <p className="text-muted-foreground hidden items-center gap-1 text-[11px] md:flex">
            <CornerDownLeft className="size-3.5" />
            Enter to send
          </p>
          <Button
            size="sm"
            className="h-8 px-3"
            onClick={onSend}
            disabled={!canSend}
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
