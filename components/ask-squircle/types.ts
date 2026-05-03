import type {
  WorkspaceAiPromptMode,
  WorkspaceAiPromptScope,
  WorkspaceAiStoredMessageRecord,
} from "@/types/ai";

export type MessageRole = WorkspaceAiStoredMessageRecord["role"];

export type Message = WorkspaceAiStoredMessageRecord;

export type PromptMode = WorkspaceAiPromptMode;
export type PromptScope = WorkspaceAiPromptScope;

export type PromptOption<TValue extends string> = {
  label: string;
  value: TValue;
};

export type ComposerReference = {
  messageId: string;
  role: MessageRole;
  preview: string;
};

export type ReportMentionSuggestion = {
  id: string;
  display: string;
  kind: "report";
  subtitle?: string;
};

export type ReportMentionMeta = {
  id: string;
  title: string;
  subtitle?: string;
};
