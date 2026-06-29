import type { PromptMode, PromptOption, PromptScope } from "./types";

export const STARTER_PROMPTS = [
  "Review blocked tasks and suggest the next high-impact moves.",
  "Draft a two-week execution plan for onboarding improvements.",
  "Detect workflow bottlenecks and recommend what to automate first.",
  "Summarize workload risk and propose balancing actions by team.",
];

export const MODE_OPTIONS: Array<PromptOption<PromptMode>> = [
  {
    label: "Brainstorm",
    value: "brainstorm",
    description: "Explore options wide, then narrow to 2 concrete recommendations",
  },
  {
    label: "Plan",
    value: "plan",
    description: "Situation summary, key risks, priorities, and next steps",
  },
  {
    label: "Execute",
    value: "execute",
    description: "Numbered action plan with owners, timelines, and dependencies",
  },
];

export const SCOPE_OPTIONS: Array<PromptOption<PromptScope>> = [
  {
    label: "Workspace",
    value: "workspace",
    description: "Cross-project view — all members, teams, and projects",
  },
  {
    label: "Project",
    value: "project",
    description: "Focused on one project's tasks, members, and health",
  },
  {
    label: "Workflow",
    value: "workflow",
    description: "Task flow, handoffs, and bottlenecks within a workflow",
  },
];
