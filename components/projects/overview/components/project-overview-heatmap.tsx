import { Badge } from "@/components/ui/badge";

import { ProjectHeatmapDay } from "../types";
import { aggregateHeatmapByWeek } from "../utils";

type ProjectOverviewHeatmapProps = {
  heatmap: ProjectHeatmapDay[];
  title: string;
};

export function ProjectOverviewHeatmap({
  heatmap,
  title,
}: ProjectOverviewHeatmapProps) {
  const weeklyLoad = aggregateHeatmapByWeek(heatmap);
  const hasHighWeek = weeklyLoad.some((item) => item.level === "high");
  const hasMediumWeek = weeklyLoad.some((item) => item.level === "medium");

  const summary = hasHighWeek
    ? "Delivery pressure is elevated in at least one part of the cycle, so this project needs active coordination."
    : hasMediumWeek
      ? "The current workload is balanced, with a few heavier stretches that still look manageable."
      : "The project is running at a light pace right now, with room to absorb more work if needed.";

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight md:text-[1.1rem]">
          Project Health
        </h2>
        <p className="text-muted-foreground text-[13px] leading-6 md:text-sm">
          {title} • {summary}
        </p>
      </div>

      <div className="space-y-4 border-y py-4">
        {weeklyLoad.map((week) => (
          <div
            key={week.label}
            className="grid gap-3 md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center"
          >
            <div className="text-[12px] font-medium md:text-[13px]">{week.label}</div>

            <div className="space-y-1.5">
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${week.fill}%` }}
                />
              </div>
              <div className="text-muted-foreground text-[11px] md:text-[12px]">
                {week.note}
              </div>
            </div>

            <div className="md:justify-self-end">
              <Badge variant="outline" className="text-[11px] font-medium capitalize">
                {week.level}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
