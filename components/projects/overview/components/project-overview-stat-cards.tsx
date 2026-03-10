import { useMemo } from "react";
import { CalendarClock, GitBranch, Layers3 } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  ProjectMember,
  ProjectMilestone,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
  ProjectTaskCounts,
} from "../types";
import {
  WorkflowLoadSummary,
  buildRoleSummary,
  formatPipelineLabel,
  formatShortDate,
  formatTaskSummary,
} from "../utils";
import { ProjectInfoTip } from "./project-info-tip";
import { ProjectOverviewProgressCard } from "./project-overview-progress-card";

type ProjectOverviewStatCardsProps = {
  project: ProjectOverviewRecord;
  selectedPipeline: ProjectPipelineSummary | null;
  scopedTeamCount: number;
  taskCounts: ProjectTaskCounts;
  members: ProjectMember[];
  progress: number;
  riskHint?: string;
  nearestMilestone: ProjectMilestone | null;
  workflowCount: number;
  workloadSummary: WorkflowLoadSummary;
};

export function ProjectOverviewStatCards({
  project,
  selectedPipeline,
  scopedTeamCount,
  taskCounts,
  members,
  progress,
  riskHint,
  nearestMilestone,
  workflowCount,
  workloadSummary,
}: ProjectOverviewStatCardsProps) {
  const displayedMembers = members.slice(0, 3);
  const extraMembers = Math.max(members.length - displayedMembers.length, 0);
  const nearestTaskDue = useMemo(() => {
    const candidateTasks = project.workflows
      .filter((workflow) => !workflow.archived)
      .flatMap((workflow) =>
        workflow.tasks
          .filter((task) => {
            if (task.status === "done") {
              return false;
            }

            if (selectedPipeline && task.pipelineId !== selectedPipeline.id) {
              return false;
            }

            return !Number.isNaN(new Date(task.dueDate).getTime());
          })
          .map((task) => ({
            title: task.title,
            dueDate: task.dueDate,
            owner:
              members.find((member) => member.id === task.assigneeId)?.name ??
              "Unassigned",
            pipelineId: task.pipelineId,
          })),
      )
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      );

    return candidateTasks[0] ?? null;
  }, [members, project.workflows, selectedPipeline]);

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <div className="px-3 py-3 md:px-4">
          <ProjectOverviewProgressCard
            progress={progress}
            riskHint={riskHint}
            infoTip="Progress is calculated from active workflows and task completion. Subtasks contribute to each task's completion percentage."
          />
        </div>

        <div className="border-t border-border/35 px-3 py-3 sm:border-t-0 sm:border-l md:px-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
            <CalendarClock className="size-3.5" />
            Next due
            <ProjectInfoTip
              content="Shows the nearest upcoming milestone in scope. If none are available, it falls back to the nearest active task due date."
              align="start"
            />
          </div>
          {nearestMilestone ? (
            <>
              <div className="line-clamp-1 text-[13px] font-semibold leading-5 md:text-[14px]">
                {nearestMilestone.title}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
                <span>{formatShortDate(nearestMilestone.dueDate)}</span>
                <span>•</span>
                <span>{nearestMilestone.owner}</span>
              </div>
              <div className="text-muted-foreground mt-1 line-clamp-1 text-[12px] leading-5">
                {formatPipelineLabel(nearestMilestone.pipelineId)}
              </div>
            </>
          ) : nearestTaskDue ? (
            <>
              <div className="line-clamp-1 text-[13px] font-semibold leading-5 md:text-[14px]">
                {nearestTaskDue.title}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
                <span>{formatShortDate(nearestTaskDue.dueDate)}</span>
                <span>•</span>
                <span>{nearestTaskDue.owner}</span>
              </div>
              <div className="text-muted-foreground mt-1 line-clamp-1 text-[12px] leading-5">
                {formatPipelineLabel(nearestTaskDue.pipelineId)}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-[12px] leading-5">
              No upcoming due dates in the current scope.
            </div>
          )}
        </div>

        <div className="border-t border-border/35 px-3 py-3 xl:border-t-0 xl:border-l md:px-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
            <Layers3 className="size-3.5" />
            Workload
            <ProjectInfoTip
              content="Workload is derived from active workflow/task intensity in the current scope. The bar is a relative signal, not absolute capacity."
              align="start"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold md:text-[14px]">
              {workloadSummary.label}
            </div>
            <div className="text-muted-foreground text-[12px]">
              {selectedPipeline ? selectedPipeline.name : "Project-wide"}
            </div>
          </div>
          <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${workloadSummary.fill}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-2 line-clamp-2 text-[12px] leading-5">
            {workloadSummary.note}
          </div>
        </div>

        <div className="border-t border-border/35 px-3 py-3 xl:border-t-0 xl:border-l md:px-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
            <GitBranch className="size-3.5" />
            Coverage
            <ProjectInfoTip
              content="Coverage summarizes active workflow count, team coverage, and scoped task status distribution for the current filters."
              align="start"
            />
          </div>
          <div className="text-[13px] font-semibold md:text-[14px]">
            {workflowCount} workflow{workflowCount === 1 ? "" : "s"} • {scopedTeamCount} team
            {scopedTeamCount === 1 ? "" : "s"}
          </div>
          <div className="text-muted-foreground mt-1 line-clamp-1 text-[12px] leading-5">
            {formatTaskSummary(taskCounts)}
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <AvatarGroup>
              {displayedMembers.map((member) => (
                <Avatar
                  key={member.id}
                  size="sm"
                  userCard={{
                    name: member.name,
                    role: member.role,
                    team:
                      member.teamIds.length > 1
                        ? `${member.teamIds.length} teams`
                        : member.teamIds.length === 1
                      ? "1 team"
                      : "No team",
                    status: member.active ? "Active" : "Offline",
                    details: [
                      {
                        label: "Score",
                        value: `${Number(member.score || 0)} pts`,
                      },
                    ],
                  }}
                >
                  <AvatarImage src={member.avatarUrl || ""} alt={member.name} />
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
              ))}
              {extraMembers ? (
                <AvatarGroupCount className="text-[11px]">+{extraMembers}</AvatarGroupCount>
              ) : null}
            </AvatarGroup>
            <div className="text-muted-foreground text-[12px] leading-5">
              {members.length} active • {buildRoleSummary(members)}
            </div>
          </div>
          <div className="text-muted-foreground mt-1 text-[11px] leading-4">
            {project.startDate ? `Started ${formatShortDate(project.startDate)}` : null}
          </div>
        </div>
      </div>
    </section>
  );
}
