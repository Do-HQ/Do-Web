import { Badge } from "@/components/ui/badge";

import { ProjectMilestone } from "../types";
import { formatPipelineLabel, formatShortDate } from "../utils";

type ProjectOverviewCalendarProps = {
  milestones: ProjectMilestone[];
};

export function ProjectOverviewCalendar({
  milestones,
}: ProjectOverviewCalendarProps) {
  const visibleMilestones = milestones.slice(0, 5);

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight md:text-[1.1rem]">
          Key Milestones
        </h2>
        <p className="text-muted-foreground text-[13px] leading-6 md:text-sm">
          The next major checkpoints the project team is actively moving toward.
        </p>
      </div>

      {visibleMilestones.length ? (
        <div className="divide-y border-y">
          {visibleMilestones.map((milestone) => {
            const [month, day] = formatShortDate(milestone.dueDate).split(" ");

            return (
              <div
                key={milestone.id}
                className="grid gap-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_11rem] md:items-center"
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border bg-muted/20 text-center">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.08em]">
                    {month}
                  </span>
                  <span className="text-lg font-semibold leading-none">{day}</span>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium leading-6">{milestone.title}</div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[12px] md:text-[13px]">
                    <span>Owner: {milestone.owner}</span>
                    <span>•</span>
                    <span>{formatPipelineLabel(milestone.pipelineId)}</span>
                  </div>
                </div>

                <div className="space-y-2 md:text-right">
                  <div className="flex items-center justify-between gap-3 text-[12px] md:block md:text-[13px]">
                    <span className="text-muted-foreground md:hidden">Progress</span>
                    <span className="font-medium">{milestone.completion}%</span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full md:ml-auto md:max-w-[11rem]">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(milestone.completion, 100))}%` }}
                    />
                  </div>
                  <div className="md:flex md:justify-end">
                    <Badge variant="outline" className="text-[11px] font-medium">
                      {formatShortDate(milestone.dueDate)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground border-y py-4 text-[13px] md:text-sm">
          No milestones are visible for the current scope.
        </div>
      )}
    </section>
  );
}
