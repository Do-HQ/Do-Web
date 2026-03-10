"use client";

import { useMemo, useState } from "react";

import { Pagination } from "@/types";

import {
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTeamSummary,
  ProjectWorkflow,
  ProjectWorkflowView,
} from "../types";
import {
  findWorkflowById,
  getDefaultSelectedWorkflowId,
  getWorkflowTimingSummary,
} from "../utils";
import { ProjectWorkflowDetailSheet } from "./project-workflow-detail-sheet";
import { ProjectWorkflowDurationChart } from "./project-workflow-duration-chart";
import { ProjectWorkflowsTable } from "./project-workflows-table";

type ProjectWorkflowsTabProps = {
  projectId: string;
  initialWorkflowId?: string;
  workflows: ProjectWorkflow[];
  loading?: boolean;
  archivedWorkflows: ProjectWorkflow[];
  sortMode: "updated" | "progress" | "name";
  onSortModeChange: (value: "updated" | "progress" | "name") => void;
  pagination?: Pagination | null;
  onPreviousPage: () => void;
  onNextPage: () => void;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  selectedPipeline: ProjectPipelineSummary | null;
  selectedTeamId: string;
  onTeamChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  view: ProjectWorkflowView;
  onViewChange: (value: ProjectWorkflowView) => void;
  onCreateWorkflow: () => void;
  onEditWorkflow: (workflowId: string) => void;
  onCreateTask: (workflowId: string) => void;
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateSubtask: (workflowId: string, taskId: string) => void;
  onEditSubtask: (workflowId: string, taskId: string, subtaskId: string) => void;
  onWorkflowAction: (label: string, workflowId: string, workflowName: string) => void;
  onTaskAction: (label: string, workflowId: string, taskId: string, taskName: string) => void;
  onSubtaskAction: (
    label: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
    subtaskName: string,
  ) => void;
  canManageWorkflowActions?: boolean;
};

export function ProjectWorkflowsTab({
  projectId,
  initialWorkflowId,
  workflows,
  loading = false,
  archivedWorkflows,
  sortMode,
  onSortModeChange,
  pagination,
  onPreviousPage,
  onNextPage,
  members,
  teams,
  selectedPipeline,
  selectedTeamId,
  onTeamChange,
  startDate,
  onStartDateChange,
  view,
  onViewChange,
  onCreateWorkflow,
  onEditWorkflow,
  onCreateTask,
  onEditTask,
  onCreateSubtask,
  onEditSubtask,
  onWorkflowAction,
  onTaskAction,
  onSubtaskAction,
  canManageWorkflowActions = true,
}: ProjectWorkflowsTabProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [expandedWorkflowIds, setExpandedWorkflowIds] = useState<string[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const fallbackWorkflowId = useMemo(
    () => getDefaultSelectedWorkflowId(workflows),
    [workflows],
  );

  const effectiveSelectedWorkflowId = useMemo(() => {
    if (!selectedWorkflowId) {
      if (
        initialWorkflowId &&
        workflows.some((workflow) => workflow.id === initialWorkflowId)
      ) {
        return initialWorkflowId;
      }
      return fallbackWorkflowId;
    }

    return workflows.some((workflow) => workflow.id === selectedWorkflowId)
      ? selectedWorkflowId
      : fallbackWorkflowId;
  }, [fallbackWorkflowId, initialWorkflowId, selectedWorkflowId, workflows]);

  const timingSummaries = useMemo(
    () => getWorkflowTimingSummary(workflows),
    [workflows],
  );

  const selectedWorkflow = useMemo(
    () => findWorkflowById(workflows, effectiveSelectedWorkflowId),
    [effectiveSelectedWorkflowId, workflows],
  );

  const selectedTimingSummary = useMemo(
    () =>
      timingSummaries.find((item) => item.workflowId === selectedWorkflow?.id) ?? null,
    [timingSummaries, selectedWorkflow],
  );

  const handleToggleWorkflow = (workflowId: string) => {
    setExpandedWorkflowIds((current) =>
      current.includes(workflowId)
        ? current.filter((item) => item !== workflowId)
        : [...current, workflowId],
    );
  };

  const handleToggleTask = (taskId: string) => {
    setExpandedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((item) => item !== taskId)
        : [...current, taskId],
    );
  };

  const handleOpenWorkflowDetails = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setDetailOpen(true);
  };

  const handleCreateTask = (workflowId: string) => {
    if (!canManageWorkflowActions) {
      return;
    }

    setDetailOpen(false);
    setExpandedWorkflowIds((current) =>
      current.includes(workflowId) ? current : [...current, workflowId],
    );
    onCreateTask(workflowId);
  };

  const handleCreateSubtask = (workflowId: string, taskId: string) => {
    if (!canManageWorkflowActions) {
      return;
    }

    setExpandedWorkflowIds((current) =>
      current.includes(workflowId) ? current : [...current, workflowId],
    );
    setExpandedTaskIds((current) =>
      current.includes(taskId) ? current : [...current, taskId],
    );
    onCreateSubtask(workflowId, taskId);
  };

  return (
    <>
      <div className="flex flex-col gap-3 md:gap-4">
        <ProjectWorkflowDurationChart
          summaries={timingSummaries}
          selectedWorkflowId={effectiveSelectedWorkflowId}
          onSelectWorkflow={handleOpenWorkflowDetails}
        />

        <ProjectWorkflowsTable
          projectId={projectId}
          workflows={workflows}
          loading={loading}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
          pagination={pagination}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          members={members}
          teams={teams}
          selectedPipeline={selectedPipeline}
          selectedTeamId={selectedTeamId}
          onTeamChange={onTeamChange}
          startDate={startDate}
          onStartDateChange={onStartDateChange}
          view={view}
          onViewChange={onViewChange}
          selectedWorkflowId={effectiveSelectedWorkflowId}
          onSelectWorkflow={setSelectedWorkflowId}
          onOpenWorkflowDetails={handleOpenWorkflowDetails}
          expandedWorkflowIds={expandedWorkflowIds}
          onToggleWorkflow={handleToggleWorkflow}
          expandedTaskIds={expandedTaskIds}
          onToggleTask={handleToggleTask}
          onCreateWorkflow={onCreateWorkflow}
          onEditWorkflow={onEditWorkflow}
          onCreateTask={handleCreateTask}
          onEditTask={onEditTask}
          onCreateSubtask={handleCreateSubtask}
          onEditSubtask={onEditSubtask}
          onWorkflowAction={onWorkflowAction}
          onTaskAction={onTaskAction}
          onSubtaskAction={onSubtaskAction}
          canManageWorkflowActions={canManageWorkflowActions}
        />

        {archivedWorkflows.length ? (
          <section className="rounded-xl border border-border/30 bg-muted/10 p-3">
            <div className="mb-2 text-[12px] font-medium md:text-[13px]">Archived workflows</div>
            <div className="space-y-2">
              {archivedWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/20 bg-background/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium md:text-[13px]">
                      {workflow.name}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {workflow.taskCounts.total} tasks • {workflow.updatedAt}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-primary"
                      disabled={!canManageWorkflowActions}
                      title={
                        !canManageWorkflowActions
                          ? "You do not have permission to restore workflows."
                          : undefined
                      }
                      onClick={() => onWorkflowAction("Restore workflow", workflow.id, workflow.name)}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-destructive"
                      disabled={!canManageWorkflowActions}
                      title={
                        !canManageWorkflowActions
                          ? "You do not have permission to delete workflows."
                          : undefined
                      }
                      onClick={() => onWorkflowAction("Delete workflow", workflow.id, workflow.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <ProjectWorkflowDetailSheet
        open={detailOpen}
        workflow={selectedWorkflow}
        timingSummary={selectedTimingSummary}
        members={members}
        teams={teams}
        onOpenChange={setDetailOpen}
        onAddTask={handleCreateTask}
        canManageWorkflowActions={canManageWorkflowActions}
        onEditWorkflow={(workflowId) => {
          setDetailOpen(false);
          onEditWorkflow(workflowId);
        }}
      />
    </>
  );
}
