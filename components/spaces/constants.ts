import {
  Building2,
  CheckCircle2,
  FolderKanban,
  Users,
  Workflow,
} from "lucide-react";
import type {
  ChatAuthor,
  ScopeMeta,
  SpaceMessage,
  SpaceRoom,
  ThreadReply,
} from "./types";

export const TEAM_CALL_WIDGET_KEY = "sq-active-team-call";

export const SCOPE_META: ScopeMeta = {
  workspace: { label: "Workspace", icon: Building2 },
  team: { label: "Team", icon: Users },
  project: { label: "Project", icon: FolderKanban },
  workflow: { label: "Workflow", icon: Workflow },
  task: { label: "Task", icon: CheckCircle2 },
};

export const SEED_ROOMS: SpaceRoom[] = [
  {
    id: "dm-jude",
    name: "Jude Okafor",
    scope: "team",
    visibility: "private",
    members: 2,
    unread: 0,
    topic: "Direct chat",
  },
  {
    id: "workspace-announcements",
    name: "workspace-announcements",
    scope: "workspace",
    visibility: "open",
    members: 24,
    unread: 3,
    topic: "Organization updates and strategic decisions.",
  },
  {
    id: "team-product",
    name: "team-product",
    scope: "team",
    visibility: "private",
    members: 8,
    unread: 1,
    topic: "Daily product delivery and blockers.",
  },
  {
    id: "project-onboarding-revamp",
    name: "project-onboarding-revamp",
    scope: "project",
    visibility: "open",
    members: 11,
    unread: 0,
    topic: "Onboarding redesign execution and reviews.",
  },
  {
    id: "workflow-quality-gate",
    name: "workflow-quality-gate",
    scope: "workflow",
    visibility: "private",
    members: 6,
    unread: 0,
    topic: "QA phase handoff and approvals.",
  },
  {
    id: "task-api-migration",
    name: "task-api-migration",
    scope: "task",
    visibility: "private",
    members: 4,
    unread: 2,
    topic: "Task-level chat for API migration deliverables.",
  },
];

export const AUTHORS: Record<string, ChatAuthor> = {
  aya: {
    id: "aya",
    name: "Aya Wilson",
    initials: "AW",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
    role: "member",
  },
  jude: {
    id: "jude",
    name: "Jude Okafor",
    initials: "JO",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80",
    role: "member",
  },
  mariam: {
    id: "mariam",
    name: "Mariam Bello",
    initials: "MB",
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80",
    role: "member",
  },
  agent: {
    id: "sq-agent",
    name: "Squircle Agent",
    initials: "SQ",
    role: "agent",
  },
};

export const SEED_MESSAGES: Record<string, SpaceMessage[]> = {
  "dm-jude": [
    {
      id: "msg-dm-1",
      roomId: "dm-jude",
      author: AUTHORS.jude,
      content: "Hey, can we sync quickly on call about the onboarding handoff?",
      sentAt: "09:02",
    },
  ],
  "workspace-announcements": [
    {
      id: "msg-wa-1",
      roomId: "workspace-announcements",
      author: AUTHORS.aya,
      content:
        "Kicking off weekly workspace planning. Post your top blocker and the one decision you need this week.",
      sentAt: "09:15",
    },
    {
      id: "msg-wa-2",
      roomId: "workspace-announcements",
      author: AUTHORS.agent,
      content:
        "I summarized yesterday's standups. Three blockers are repeated across teams: review bottleneck, unclear QA gate, and dependency sequencing.",
      sentAt: "09:26",
    },
    {
      id: "msg-wa-3",
      roomId: "workspace-announcements",
      author: AUTHORS.jude,
      content:
        "For onboarding, we should lock ownership today so no task remains unassigned after handoff.",
      sentAt: "09:33",
    },
  ],
  "team-product": [
    {
      id: "msg-tp-1",
      roomId: "team-product",
      author: AUTHORS.mariam,
      content:
        "Design review done. Need one engineering estimate before we lock sprint scope.",
      sentAt: "10:02",
    },
    {
      id: "msg-tp-2",
      roomId: "team-product",
      author: AUTHORS.agent,
      content:
        "Suggested estimate range: 3-5 days with current dependency load.",
      sentAt: "10:10",
    },
  ],
  "project-onboarding-revamp": [
    {
      id: "msg-pr-1",
      roomId: "project-onboarding-revamp",
      author: AUTHORS.aya,
      content:
        "Prototype is ready for internal test. Please drop edge cases before noon.",
      sentAt: "08:47",
    },
  ],
  "workflow-quality-gate": [
    {
      id: "msg-wf-1",
      roomId: "workflow-quality-gate",
      author: AUTHORS.jude,
      content: "Can we reduce mandatory checks from 6 to 4 for low-risk tasks?",
      sentAt: "Yesterday",
    },
  ],
  "task-api-migration": [
    {
      id: "msg-ts-1",
      roomId: "task-api-migration",
      author: AUTHORS.mariam,
      content:
        "Migration script passes locally. Need final env variables from ops.",
      sentAt: "Yesterday",
    },
  ],
};

export const SEED_THREADS: Record<string, ThreadReply[]> = {
  "msg-wa-1": [
    {
      id: "thr-wa-1",
      messageId: "msg-wa-1",
      author: AUTHORS.jude,
      content: "My blocker is QA review queue. Currently waiting 2.5 days.",
      sentAt: "09:17",
    },
    {
      id: "thr-wa-2",
      messageId: "msg-wa-1",
      author: AUTHORS.agent,
      content:
        "Recommendation: assign one rotating QA owner per day to remove queue contention.",
      sentAt: "09:21",
    },
  ],
  "msg-wa-3": [
    {
      id: "thr-wa-3",
      messageId: "msg-wa-3",
      author: AUTHORS.aya,
      content: "Agree. I can own execution and Jude can own QA alignment.",
      sentAt: "09:36",
    },
  ],
};
