import type { ReactNode } from "react";

export type AiCreateEntityType = "workspace" | "project" | "workflow" | "task";
export type AiCreateMode = "ai" | "manual";

export type AiDraftMeta = {
  prompt: string;
  generatedAt: string;
  source: "local";
};

export type AiCreateSheetShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  mode: AiCreateMode;
  onModeChange: (mode: AiCreateMode) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerateDraft: () => void;
  canGenerate: boolean;
  isDraftReady: boolean;
  helperExamples?: string[];
  children: ReactNode;
  footer: ReactNode;
};
