import { CalendarClock, GitBranch, Layers3 } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
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

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <div className="px-3 py-3 md:px-4">
          <ProjectOverviewProgressCard progress={progress} riskHint={riskHint} />
        </div>

        <div className="border-t border-border/35 px-3 py-3 sm:border-t-0 sm:border-l md:px-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
            <CalendarClock className="size-3.5" />
            Next due
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
          ) : (
            <div className="text-muted-foreground text-[12px] leading-5">
              No upcoming milestone in the current date scope.
            </div>
          )}
        </div>

        <div className="border-t border-border/35 px-3 py-3 xl:border-t-0 xl:border-l md:px-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
            <Layers3 className="size-3.5" />
            Workload
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
                  }}
                >
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
