import { create } from "zustand";

import {
  ProjectActivityEvent,
  ProjectAsset,
  ProjectEditorValues,
  ProjectHeatmapDay,
  ProjectKanbanSection,
  ProjectMember,
  ProjectMilestone,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
  ProjectRisk,
  ProjectRiskComment,
  ProjectStatus,
  ProjectTaskCounts,
  ProjectTeamSummary,
  ProjectWorkflow,
  ProjectWorkflowSubtask,
} from "@/components/projects/overview/types";

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatRangeDate(value: string) {
  if (!isValidDateValue(value)) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildDueWindow(startDate: string, targetEndDate: string) {
  if (!isValidDateValue(startDate) || !isValidDateValue(targetEndDate)) {
    return "No date range";
  }

  return `${formatRangeDate(startDate)} - ${formatRangeDate(targetEndDate)}`;
}

function createLowHeatmap(pipelineId?: string) {
  return Array.from({ length: 31 }, (_, index) => ({
    day: index + 1,
    level: "low" as const,
    pipelineId,
  }));
}

function createEmptyTaskCounts(): ProjectTaskCounts {
  return {
    total: 0,
    done: 0,
    inProgress: 0,
    blocked: 0,
  };
}

const PROJECT_STATUSES = ["on-track", "at-risk", "paused"] as const;
const RISK_SEVERITIES = ["high", "medium", "low"] as const;
const RISK_KINDS = ["risk", "issue"] as const;
const RISK_STATES = ["open", "resolved", "closed"] as const;
const TASK_STATUSES = ["todo", "in-progress", "review", "done", "blocked"] as const;
const TASK_PRIORITIES = ["low", "medium", "high"] as const;
const WORKFLOW_STATUSES = ["on-track", "at-risk", "blocked", "complete"] as const;
const ASSET_TYPES = ["Document", "Image", "Video", "Code"] as const;
const EXECUTION_STATES = ["not-started", "running", "elapsed", "complete"] as const;
const KANBAN_SECTION_TONES = ["sky", "violet", "cyan", "rose", "amber", "emerald"] as const;
const HEATMAP_LEVELS = ["low", "medium", "high"] as const;

function isValidDateValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toOptionalString(value: unknown) {
  const nextValue = toStringValue(value).trim();
  return nextValue ? nextValue : undefined;
}

function toNumberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBooleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function toEnumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
) {
  return typeof value === "string" && allowed.includes(value)
    ? (value as T[number])
    : fallback;
}

function normalizeTaskCounts(value: unknown): ProjectTaskCounts {
  const counts = asObject(value);

  return {
    total: toNumberValue(counts.total),
    done: toNumberValue(counts.done),
    inProgress: toNumberValue(counts.inProgress),
    blocked: toNumberValue(counts.blocked),
  };
}

function normalizeHeatmapDay(value: unknown, index: number): ProjectHeatmapDay {
  const day = asObject(value);

  return {
    day: toNumberValue(day.day, index + 1),
    level: toEnumValue(day.level, HEATMAP_LEVELS, "low"),
    pipelineId: toOptionalString(day.pipelineId),
  };
}

function normalizeMember(value: unknown, index: number): ProjectMember {
  const member = asObject(value);
  const scoreBreakdown = asObject(member.scoreBreakdown);
  const normalizedScoreBreakdown = Object.keys(scoreBreakdown).length
    ? {
        taskAssignedPoints: toNumberValue(scoreBreakdown.taskAssignedPoints, 0),
        taskCompletionPoints: toNumberValue(scoreBreakdown.taskCompletionPoints, 0),
        taskOverduePenaltyPoints: toNumberValue(scoreBreakdown.taskOverduePenaltyPoints, 0),
        subtaskCompletionPoints: toNumberValue(scoreBreakdown.subtaskCompletionPoints, 0),
        subtaskOverduePenaltyPoints: toNumberValue(scoreBreakdown.subtaskOverduePenaltyPoints, 0),
        workflowCompletionPoints: toNumberValue(scoreBreakdown.workflowCompletionPoints, 0),
        riskResolutionPoints: toNumberValue(scoreBreakdown.riskResolutionPoints, 0),
        riskClosurePoints: toNumberValue(scoreBreakdown.riskClosurePoints, 0),
        awardedPoints: toNumberValue(scoreBreakdown.awardedPoints, 0),
        penaltyPoints: toNumberValue(scoreBreakdown.penaltyPoints, 0),
      }
    : undefined;

  return {
    id: toStringValue(member.id, createLocalId(`member-${index + 1}`)),
    name: toStringValue(member.name, "Unknown member"),
    initials: toStringValue(member.initials, "NA"),
    role: toStringValue(member.role, "Member"),
    avatarUrl: toOptionalString(member.avatarUrl),
    active: toBooleanValue(member.active, true),
    teamIds: toStringArray(member.teamIds),
    score: Number.isFinite(Number(member.score)) ? toNumberValue(member.score) : undefined,
    scoreBreakdown: normalizedScoreBreakdown,
  };
}

function normalizePipelineSummary(value: unknown, index: number): ProjectPipelineSummary {
  const pipeline = asObject(value);
  const startDate = toStringValue(pipeline.startDate);
  const targetEndDate = toStringValue(pipeline.targetEndDate);

  return {
    id: toStringValue(pipeline.id, createLocalId(`pipeline-${index + 1}`)),
    name: toStringValue(pipeline.name, `Pipeline ${index + 1}`),
    description: toStringValue(pipeline.description, ""),
    taskCounts: normalizeTaskCounts(pipeline.taskCounts),
    deadlineCount: toNumberValue(pipeline.deadlineCount),
    dueWindow:
      toStringValue(pipeline.dueWindow) ||
      buildDueWindow(startDate, targetEndDate),
    progress: toNumberValue(pipeline.progress),
    riskHint: toOptionalString(pipeline.riskHint),
    heatmap: Array.isArray(pipeline.heatmap)
      ? pipeline.heatmap.map((item, itemIndex) => normalizeHeatmapDay(item, itemIndex))
      : [],
  };
}

function normalizeMilestone(value: unknown, index: number): ProjectMilestone {
  const milestone = asObject(value);

  return {
    id: toStringValue(milestone.id, createLocalId(`milestone-${index + 1}`)),
    title: toStringValue(milestone.title, "Untitled milestone"),
    dueDate: toStringValue(milestone.dueDate, ""),
    completion: toNumberValue(milestone.completion),
    pipelineId: toStringValue(milestone.pipelineId, ""),
    teamId: toStringValue(milestone.teamId, ""),
    owner: toStringValue(milestone.owner, "Unassigned"),
  };
}

function normalizeRiskComment(value: unknown, index: number): ProjectRiskComment {
  const comment = asObject(value);

  return {
    id: toStringValue(comment.id, createLocalId(`risk-comment-${index + 1}`)),
    message: toStringValue(comment.message, ""),
    mentions: Array.isArray(comment.mentions)
      ? comment.mentions
          .map((mention) => {
            const normalized = asObject(mention);
            const kind = toStringValue(normalized.kind);
            const id = toStringValue(normalized.id);
            const label = toStringValue(normalized.label);

            if (!id || !label || (kind !== "user" && kind !== "team")) {
              return null;
            }

            return {
              kind,
              id,
              label,
            };
          })
          .filter(Boolean) as ProjectRiskComment["mentions"]
      : undefined,
    authorUserId: toStringValue(comment.authorUserId, ""),
    authorName: toStringValue(comment.authorName, "Unknown"),
    authorInitials: toStringValue(comment.authorInitials, "NA"),
    authorAvatarUrl: toOptionalString(comment.authorAvatarUrl),
    createdAt: toStringValue(comment.createdAt, ""),
  };
}

function normalizeRisk(value: unknown, index: number): ProjectRisk {
  const risk = asObject(value);

  return {
    id: toStringValue(risk.id, createLocalId(`risk-${index + 1}`)),
    kind: toEnumValue(risk.kind, RISK_KINDS, "risk"),
    title: toStringValue(risk.title, "Untitled"),
    description: toStringValue(risk.description, ""),
    severity: toEnumValue(risk.severity, RISK_SEVERITIES, "medium"),
    owner: toStringValue(risk.owner, "Unassigned"),
    ownerUserId: toOptionalString(risk.ownerUserId),
    createdByUserId: toOptionalString(risk.createdByUserId),
    status: toStringValue(risk.status, "open"),
    state: toEnumValue(risk.state, RISK_STATES, "open"),
    createdAt: toOptionalString(risk.createdAt),
    updatedAt: toOptionalString(risk.updatedAt),
    resolvedAt: toOptionalString(risk.resolvedAt),
    resolvedByUserId: toOptionalString(risk.resolvedByUserId),
    closedAt: toOptionalString(risk.closedAt),
    closedByUserId: toOptionalString(risk.closedByUserId),
    comments: Array.isArray(risk.comments)
      ? risk.comments.map((item, itemIndex) => normalizeRiskComment(item, itemIndex))
      : [],
    commentCount: toNumberValue(risk.commentCount),
    pipelineId: toOptionalString(risk.pipelineId),
    teamId: toOptionalString(risk.teamId),
  };
}

function normalizeActivityEvent(value: unknown, index: number): ProjectActivityEvent {
  const activity = asObject(value);
  const target = asObject(activity.target);
  const normalizedTarget = Object.keys(target).length
    ? {
        kind: toOptionalString(target.kind),
        id: toOptionalString(target.id),
        label: toOptionalString(target.label),
        workflowId: toOptionalString(target.workflowId),
        taskId: toOptionalString(target.taskId),
        subtaskId: toOptionalString(target.subtaskId),
        riskId: toOptionalString(target.riskId),
        tab: toOptionalString(target.tab),
      }
    : undefined;

  return {
    id: toStringValue(activity.id, createLocalId(`activity-${index + 1}`)),
    actor: toStringValue(activity.actor, "System"),
    actorInitials: toStringValue(activity.actorInitials, "SY"),
    actorAvatarUrl: toOptionalString(activity.actorAvatarUrl),
    summary: toStringValue(activity.summary, ""),
    createdAt: toStringValue(activity.createdAt, ""),
    route: toOptionalString(activity.route),
    eventType: toOptionalString(activity.eventType),
    target: normalizedTarget,
    pipelineId: toOptionalString(activity.pipelineId),
    teamId: toOptionalString(activity.teamId),
  };
}

function normalizeTeamSummary(value: unknown, index: number): ProjectTeamSummary {
  const team = asObject(value);
  const dueWindow =
    toStringValue(team.dueWindow) ||
    buildDueWindow(toStringValue(team.startDate), toStringValue(team.targetEndDate));

  return {
    id: toStringValue(team.id, createLocalId(`team-${index + 1}`)),
    name: toStringValue(team.name, `Team ${index + 1}`),
    focus: toStringValue(team.focus, ""),
    memberIds: toStringArray(team.memberIds),
    pipelineIds: toStringArray(team.pipelineIds),
    taskCounts: normalizeTaskCounts(team.taskCounts),
    progress: toNumberValue(team.progress),
    dueWindow,
  };
}

function normalizeKanbanSection(value: unknown, index: number): ProjectKanbanSection {
  const section = asObject(value);

  return {
    id: toStringValue(section.id, createLocalId(`section-${index + 1}`)),
    label: toStringValue(section.label, `Section ${index + 1}`),
    tone: toEnumValue(section.tone, KANBAN_SECTION_TONES, "sky"),
  };
}

function normalizeAsset(value: unknown, index: number): ProjectAsset {
  const asset = asObject(value);

  return {
    id: toStringValue(asset.id, createLocalId(`asset-${index + 1}`)),
    assetId: toOptionalString(asset.assetId),
    source:
      asset.source === "google-drive" || asset.source === "upload"
        ? asset.source
        : undefined,
    externalId: toOptionalString(asset.externalId),
    name: toStringValue(asset.name, "Untitled file"),
    type: toEnumValue(asset.type, ASSET_TYPES, "Document"),
    url: toOptionalString(asset.url),
    externalViewUrl: toOptionalString(asset.externalViewUrl),
    externalDownloadUrl: toOptionalString(asset.externalDownloadUrl),
    thumbnailUrl: toOptionalString(asset.thumbnailUrl),
    mimeType: toOptionalString(asset.mimeType),
    resourceType: toOptionalString(asset.resourceType),
    uploadedBy: toStringValue(asset.uploadedBy, "Unknown"),
    uploadedById: toOptionalString(asset.uploadedById),
    uploadedAt: toStringValue(asset.uploadedAt, ""),
    linkedTask: toStringValue(asset.linkedTask, ""),
    linkedTaskId: toOptionalString(asset.linkedTaskId),
    fileSize: toStringValue(asset.fileSize, ""),
    folder: toOptionalString(asset.folder),
  };
}

function normalizeSubtask(value: unknown, index: number): ProjectWorkflowSubtask {
  const subtask = asObject(value);

  return {
    id: toStringValue(subtask.id, createLocalId(`subtask-${index + 1}`)),
    title: toStringValue(subtask.title, "Untitled subtask"),
    status: toEnumValue(subtask.status, TASK_STATUSES, "todo"),
    assigneeId: toOptionalString(subtask.assigneeId),
    startDate: toOptionalString(subtask.startDate),
    dueDate: toStringValue(subtask.dueDate, ""),
    sectionId: toOptionalString(subtask.sectionId),
    updatedAt: toStringValue(subtask.updatedAt, ""),
    progress:
      Number.isFinite(Number(subtask.progress)) ? toNumberValue(subtask.progress) : undefined,
    executionState:
      typeof subtask.executionState === "string"
        ? toEnumValue(subtask.executionState, EXECUTION_STATES, "running")
        : undefined,
    estimateHours:
      Number.isFinite(Number(subtask.estimateHours))
        ? toNumberValue(subtask.estimateHours)
        : undefined,
    remainingHours:
      Number.isFinite(Number(subtask.remainingHours))
        ? toNumberValue(subtask.remainingHours)
        : undefined,
  };
}

function normalizeWorkflowTask(
  value: unknown,
  index: number,
  defaults?: { teamId?: string; pipelineId?: string },
) {
  const task = asObject(value);

  return {
    id: toStringValue(task.id, createLocalId(`task-${index + 1}`)),
    title: toStringValue(task.title, "Untitled task"),
    status: toEnumValue(task.status, TASK_STATUSES, "todo"),
    priority: toEnumValue(task.priority, TASK_PRIORITIES, "medium"),
    assigneeId: toOptionalString(task.assigneeId),
    teamId: toStringValue(task.teamId, defaults?.teamId || ""),
    pipelineId: toStringValue(task.pipelineId, defaults?.pipelineId || ""),
    startDate: toOptionalString(task.startDate),
    dueDate: toStringValue(task.dueDate, ""),
    sectionId: toOptionalString(task.sectionId),
    updatedAt: toStringValue(task.updatedAt, ""),
    progress: Number.isFinite(Number(task.progress)) ? toNumberValue(task.progress) : undefined,
    executionState:
      typeof task.executionState === "string"
        ? toEnumValue(task.executionState, EXECUTION_STATES, "running")
        : undefined,
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map((item, itemIndex) => normalizeSubtask(item, itemIndex))
      : [],
    estimateHours:
      Number.isFinite(Number(task.estimateHours))
        ? toNumberValue(task.estimateHours)
        : undefined,
    remainingHours:
      Number.isFinite(Number(task.remainingHours))
        ? toNumberValue(task.remainingHours)
        : undefined,
  };
}

function normalizeWorkflow(value: unknown, index: number): ProjectWorkflow {
  const workflow = asObject(value);
  const startedAt = toStringValue(workflow.startedAt, "");
  const targetEndDate = toStringValue(workflow.targetEndDate, "");

  return {
    id: toStringValue(workflow.id, createLocalId(`workflow-${index + 1}`)),
    name: toStringValue(workflow.name, `Workflow ${index + 1}`),
    description: toOptionalString(workflow.description),
    archived: toBooleanValue(workflow.archived, false),
    collaboratorTeamIds: toStringArray(workflow.collaboratorTeamIds),
    collaboratorMemberIds: toStringArray(workflow.collaboratorMemberIds),
    status: toEnumValue(workflow.status, WORKFLOW_STATUSES, "on-track"),
    ownerId: toOptionalString(workflow.ownerId),
    teamId: toStringValue(workflow.teamId, ""),
    pipelineId: toStringValue(workflow.pipelineId, ""),
    progress: toNumberValue(workflow.progress),
    dueWindow:
      toStringValue(workflow.dueWindow) ||
      buildDueWindow(startedAt, targetEndDate),
    updatedAt: toStringValue(workflow.updatedAt, ""),
    startedAt,
    targetEndDate,
    completedAt: toOptionalString(workflow.completedAt),
    taskCounts: normalizeTaskCounts(workflow.taskCounts),
    tasks: Array.isArray(workflow.tasks)
      ? workflow.tasks.map((item, itemIndex) =>
          normalizeWorkflowTask(item, itemIndex, {
            teamId: toStringValue(workflow.teamId, ""),
            pipelineId: toStringValue(workflow.pipelineId, ""),
          }),
        )
      : [],
  };
}

function normalizeProjectRecord(record: ProjectOverviewRecord): ProjectOverviewRecord {
  const project = asObject(record);
  const workflows = Array.isArray(project.workflows)
    ? project.workflows.map((item, index) => normalizeWorkflow(item, index))
    : [];
  const startDate = toStringValue(project.startDate, "");

  return {
    id: toStringValue(project.id, ""),
    emoji: toStringValue(project.emoji, ""),
    name: toStringValue(project.name, "Untitled project"),
    status: toEnumValue(project.status, PROJECT_STATUSES, "on-track"),
    summary: toStringValue(project.summary, ""),
    dueWindow: toStringValue(project.dueWindow, "No date range") || "No date range",
    startDate,
    progress: toNumberValue(project.progress),
    riskHint: toOptionalString(project.riskHint),
    taskCounts: normalizeTaskCounts(project.taskCounts),
    pipelines: Array.isArray(project.pipelines)
      ? project.pipelines.map((item, index) => normalizePipelineSummary(item, index))
      : [],
    members: Array.isArray(project.members)
      ? project.members.map((item, index) => normalizeMember(item, index))
      : [],
    milestones: Array.isArray(project.milestones)
      ? project.milestones.map((item, index) => normalizeMilestone(item, index))
      : [],
    risks: Array.isArray(project.risks)
      ? project.risks.map((item, index) => normalizeRisk(item, index))
      : [],
    activities: Array.isArray(project.activities)
      ? project.activities.map((item, index) => normalizeActivityEvent(item, index))
      : [],
    teams: Array.isArray(project.teams)
      ? project.teams.map((item, index) => normalizeTeamSummary(item, index))
      : [],
    heatmap: Array.isArray(project.heatmap)
      ? project.heatmap.map((item, index) => normalizeHeatmapDay(item, index))
      : [],
    customSections: Array.isArray(project.customSections)
      ? project.customSections.map((item, index) => normalizeKanbanSection(item, index))
      : [],
    assets: Array.isArray(project.assets)
      ? project.assets.map((item, index) => normalizeAsset(item, index))
      : [],
    workflows,
  };
}

function createPipelines(
  projectId: string,
  template: ProjectEditorValues["initialPipelineTemplate"],
  startDate: string,
  targetEndDate: string,
): ProjectPipelineSummary[] {
  const templates: Record<string, string[]> = {
    product: ["Planning", "Build", "Launch"],
    marketing: ["Strategy", "Creative", "Launch"],
    operations: ["Discovery", "Execution", "Handoff"],
  };

  const selected = template && templates[template] ? templates[template] : templates.product;

  return selected.map((name, index) => {
    const pipelineId = `${projectId}-pipeline-${index + 1}`;

    return {
      id: pipelineId,
      name,
      description: `${name} work for this project.`,
      taskCounts: createEmptyTaskCounts(),
      deadlineCount: 0,
      dueWindow: buildDueWindow(startDate, targetEndDate),
      progress: 0,
      riskHint: `${name} is ready to be scoped.`,
      heatmap: createLowHeatmap(pipelineId),
    };
  });
}

function createProjectRecord(values: ProjectEditorValues): ProjectOverviewRecord {
  const slugBase = slugify(values.name) || createLocalId("project");
  const id = slugBase;
  const teamId = `${id}-core-team`;
  const pipelines = createPipelines(id, values.initialPipelineTemplate, values.startDate, values.targetEndDate);
  const baseTeam: ProjectTeamSummary = {
    id: teamId,
    name: "Core Team",
    focus: "Primary delivery team for this project.",
    memberIds: [],
    pipelineIds: pipelines.map((pipeline) => pipeline.id),
    taskCounts: createEmptyTaskCounts(),
    progress: 0,
    dueWindow: buildDueWindow(values.startDate, values.targetEndDate),
  };
  return normalizeProjectRecord({
    id,
    emoji: values.emoji || "",
    name: values.name,
    status: values.status as ProjectStatus,
    summary: values.summary,
    dueWindow: buildDueWindow(values.startDate, values.targetEndDate),
    startDate: values.startDate,
    progress: 0,
    riskHint: "No active risks yet.",
    taskCounts: createEmptyTaskCounts(),
    pipelines,
    members: [],
    milestones: [],
    risks: [],
    activities: [],
    teams: [baseTeam],
    heatmap: createLowHeatmap(),
    customSections: [],
    assets: [],
    workflows: [],
  });
}

type ProjectStore = {
  projectRecords: Record<string, ProjectOverviewRecord>;
  projectsLoaded: boolean;
  projectCreateOpen: boolean;
  pendingWorkflowCreateProjectId: string | null;
  pendingTaskCreateProjectId: string | null;
  pendingTaskCreateWorkflowId: string | null;
  setProjectsLoaded: (projectsLoaded: boolean) => void;
  hydrateProjectRecords: (records: ProjectOverviewRecord[]) => void;
  upsertProjectRecord: (record: ProjectOverviewRecord) => void;
  setProjectCreateOpen: (open: boolean) => void;
  requestWorkflowCreate: (projectId: string) => void;
  consumeWorkflowCreateRequest: (projectId: string) => boolean;
  requestTaskCreate: (projectId: string, workflowId?: string) => void;
  consumeTaskCreateRequest: (
    projectId: string,
  ) => { workflowId?: string } | null;
  createProject: (values: ProjectEditorValues) => string;
  updateProject: (
    projectId: string,
    updater: (project: ProjectOverviewRecord) => ProjectOverviewRecord,
  ) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projectRecords: {},
  projectsLoaded: false,
  projectCreateOpen: false,
  pendingWorkflowCreateProjectId: null,
  pendingTaskCreateProjectId: null,
  pendingTaskCreateWorkflowId: null,
  setProjectsLoaded: (projectsLoaded) => set({ projectsLoaded }),
  hydrateProjectRecords: (records) =>
    set(() => {
      const entries = Array.isArray(records) ? records.filter(Boolean) : [];
      const nextRecords: Record<string, ProjectOverviewRecord> = {};

      for (const record of entries) {
        if (record?.id) {
          const normalizedRecord = normalizeProjectRecord(record);
          nextRecords[normalizedRecord.id] = normalizedRecord;
        }
      }

      return {
        projectRecords: nextRecords,
      };
    }),
  upsertProjectRecord: (record) =>
    set((state) => {
      if (!record?.id) {
        return state;
      }

      const normalizedRecord = normalizeProjectRecord(record);

      return {
        projectRecords: {
          ...state.projectRecords,
          [normalizedRecord.id]: normalizedRecord,
        },
      };
    }),
  setProjectCreateOpen: (projectCreateOpen) => set({ projectCreateOpen }),
  requestWorkflowCreate: (pendingWorkflowCreateProjectId) =>
    set({ pendingWorkflowCreateProjectId }),
  consumeWorkflowCreateRequest: (projectId) => {
    const matches = get().pendingWorkflowCreateProjectId === projectId;

    if (matches) {
      set({ pendingWorkflowCreateProjectId: null });
    }

    return matches;
  },
  requestTaskCreate: (projectId, workflowId) =>
    set({
      pendingTaskCreateProjectId: projectId,
      pendingTaskCreateWorkflowId: workflowId || null,
    }),
  consumeTaskCreateRequest: (projectId) => {
    if (get().pendingTaskCreateProjectId !== projectId) {
      return null;
    }

    const workflowId = get().pendingTaskCreateWorkflowId ?? undefined;

    set({
      pendingTaskCreateProjectId: null,
      pendingTaskCreateWorkflowId: null,
    });

    return { workflowId };
  },
  createProject: (values) => {
    let nextRecord = createProjectRecord(values);
    let nextId = nextRecord.id;
    const current = get().projectRecords;

    if (current[nextId]) {
      nextId = `${nextId}-${Math.random().toString(36).slice(2, 5)}`;
      nextRecord = {
        ...nextRecord,
        id: nextId,
        pipelines: nextRecord.pipelines.map((pipeline, index) => ({
          ...pipeline,
          id: `${nextId}-pipeline-${index + 1}`,
        })),
        teams: nextRecord.teams.map((team) => ({
          ...team,
          id: `${nextId}-core-team`,
          pipelineIds: nextRecord.pipelines.map((pipeline, index) => `${nextId}-pipeline-${index + 1}`),
        })),
        workflows: nextRecord.workflows.map((workflow, index) => ({
          ...workflow,
          id: `${nextId}-workflow-${index + 1}`,
          teamId: `${nextId}-core-team`,
          pipelineId: `${nextId}-pipeline-${index + 1}`,
        })),
      };
    }

    set((state) => ({
      projectCreateOpen: false,
      projectRecords: {
        ...state.projectRecords,
        [nextId]: nextRecord,
      },
    }));

    return nextId;
  },
  updateProject: (projectId, updater) =>
    set((state) => {
      const currentProject = state.projectRecords[projectId];

      if (!currentProject) {
        return state;
      }

      return {
        projectRecords: {
          ...state.projectRecords,
          [projectId]: normalizeProjectRecord(updater(currentProject)),
        },
      };
    }),
}));
