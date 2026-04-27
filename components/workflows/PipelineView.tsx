"use client";

import { GitBranch, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { WorkflowVisual } from "./WorkflowTabs";
import { WorkflowGraph } from "./WorkflowGraph";
import { WorkflowColumn } from "./WorkflowColumn";

type PipelineViewProps = {
  workflows: WorkflowVisual[];
  selectedWorkflowId: string | null;
  activeWorkflowId: string | null;
  selectedTaskId: { workflowId: string; taskId: string } | null;
  onSelectWorkflow: (workflowId: string) => void;
  onOpenWorkflowDetails: (workflowId: string) => void;
  onCreateTask?: (workflowId: string) => void;
  onSelectTask: (workflowId: string, taskId: string) => void;
};

export function PipelineView({
  workflows,
  selectedWorkflowId,
  activeWorkflowId,
  selectedTaskId,
  onSelectWorkflow,
  onOpenWorkflowDetails,
  onCreateTask,
  onSelectTask,
}: PipelineViewProps) {
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0] ?? null;

  return (
    <section data-tour="project-workflows-chart" className="space-y-3">
      <WorkflowGraph
        workflows={workflows}
        selectedWorkflowId={selectedWorkflow?.id ?? null}
        activeWorkflowId={activeWorkflowId}
        onSelectWorkflow={onSelectWorkflow}
      />

      <div className="rounded-xl border border-border/20 bg-background/80 p-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <GitBranch className="size-3.5" />
              Workflow pipeline
            </div>
          </div>

          {selectedWorkflow ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg text-[12px]"
                onClick={() => onOpenWorkflowDetails(selectedWorkflow.id)}
              >
                View workflow
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn("h-8 rounded-lg text-[12px]")}
                disabled={!onCreateTask}
                onClick={() => {
                  if (!onCreateTask) {
                    return;
                  }

                  onCreateTask(selectedWorkflow.id);
                }}
              >
                <ListChecks className="mr-1 size-4" />
                Add task
              </Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-start gap-2 pr-2">
            {workflows.map((workflow) => (
              <WorkflowColumn
                key={workflow.id}
                workflow={workflow}
                isSelected={selectedWorkflow?.id === workflow.id}
                isActive={activeWorkflowId === workflow.id}
                activeTaskId={
                  selectedTaskId?.workflowId === workflow.id
                    ? selectedTaskId.taskId
                    : null
                }
                onSelect={() => onSelectWorkflow(workflow.id)}
                onOpenWorkflowDetails={() => onOpenWorkflowDetails(workflow.id)}
                onSelectTask={onSelectTask}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
