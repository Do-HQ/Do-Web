export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
};

export type PromptMode = "brainstorm" | "plan" | "execute";
export type PromptScope = "workspace" | "project" | "workflow";

export type PromptOption<TValue extends string> = {
  label: string;
  value: TValue;
};
