import type { Message, PromptMode, PromptOption, PromptScope } from "./types";

export const STARTER_PROMPTS = [
  "Review blocked tasks and suggest the next high-impact moves.",
  "Draft a two-week execution plan for onboarding improvements.",
  "Detect workflow bottlenecks and recommend what to automate first.",
  "Summarize workload risk and propose balancing actions by team.",
];

export const MODE_OPTIONS: Array<PromptOption<PromptMode>> = [
  { label: "Brainstorm", value: "brainstorm" },
  { label: "Plan", value: "plan" },
  { label: "Execute", value: "execute" },
];

export const SCOPE_OPTIONS: Array<PromptOption<PromptScope>> = [
  { label: "Workspace", value: "workspace" },
  { label: "Project", value: "project" },
  { label: "Workflow", value: "workflow" },
];

export const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me anything about your workspace. I can help with project planning, workflow clarity, and task execution.",
};
