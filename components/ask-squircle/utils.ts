import type { PromptMode, PromptScope } from "./types";

export const createMessageId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `msg_${Math.random().toString(36).slice(2, 9)}`;
};

export const getInitials = (firstName?: string, lastName?: string, email?: string) => {
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();

  if (fullName) {
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  return email?.slice(0, 2).toUpperCase() || "YO";
};

export const buildAssistantReply = (
  prompt: string,
  mode: PromptMode,
  scope: PromptScope,
  attachmentCount: number,
) => {
  const modeHint =
    mode === "brainstorm"
      ? "I will explore options before converging."
      : mode === "plan"
        ? "I will structure this into an execution sequence."
        : "I will focus on concrete owner-based actions.";

  const scopeHint =
    scope === "workspace"
      ? "Scope: workspace-wide across projects, workflows, and tasks."
      : scope === "project"
        ? "Scope: project-level planning details."
        : "Scope: workflow throughput and phase transitions.";

  const attachmentHint =
    attachmentCount > 0
      ? `Included ${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""} in this reasoning.`
      : "No attachments provided, using current workspace context.";

  return [
    `Great prompt. ${modeHint}`,
    scopeHint,
    attachmentHint,
    "",
    "Suggested next response:",
    `1. Clarify target outcome: ${prompt.slice(0, 82)}${prompt.length > 82 ? "..." : ""}`,
    "2. Surface blockers and dependencies from active work.",
    "3. Prioritize next actions with owners and due windows.",
    "4. Re-check progress daily and auto-adjust priorities.",
  ].join("\n");
};
