import { create } from "zustand";

import {
  ProjectEditorValues,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
  ProjectTaskCounts,
  ProjectTeamSummary,
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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildDueWindow(startDate: string, targetEndDate: string) {
  if (!startDate || !targetEndDate) {
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
  return {
    id,
    emoji: values.emoji || "",
    name: values.name,
    status: values.status,
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
    workflows: [],
  };
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
          nextRecords[record.id] = record;
        }
      }

      return {
        projectRecords: nextRecords,
      };
    }),
  upsertProjectRecord: (record) =>
    set((state) => ({
      projectRecords: record?.id
        ? {
            ...state.projectRecords,
            [record.id]: record,
          }
        : state.projectRecords,
    })),
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
          [projectId]: updater(currentProject),
        },
      };
    }),
}));
