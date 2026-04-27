"use client";

import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";

import { WorkflowVisual } from "./WorkflowTabs";

type WorkflowStateTrendProps = {
  workflows: WorkflowVisual[];
  activeWorkflowId: string | null;
};

const STATUS_LEVEL: Record<WorkflowVisual["status"], number> = {
  quick: 3,
  average: 2,
  delayed: 1,
  late: 0,
};

const STATUS_COLOR: Record<WorkflowVisual["status"], string> = {
  quick: "#10b981",
  average: "#0ea5e9",
  delayed: "#f59e0b",
  late: "#ef4444",
};

const LEVEL_LABELS = [
  { level: 3, label: "Fast" },
  { level: 2, label: "Average" },
  { level: 1, label: "Slow" },
  { level: 0, label: "Late" },
];

export function WorkflowStateTrend({
  workflows,
  activeWorkflowId,
}: WorkflowStateTrendProps) {
  if (!workflows.length) {
    return null;
  }

  const chartHeight = 176;
  const xPadding = 36;
  const yTop = 18;
  const yBottom = 38;
  const yTrackHeight = chartHeight - yTop - yBottom;
  const chartWidth = Math.max(360, workflows.length * 112);
  const xStep =
    workflows.length > 1 ? (chartWidth - xPadding * 2) / (workflows.length - 1) : 0;

  const points = workflows.map((workflow, index) => {
    const x =
      workflows.length === 1 ? chartWidth / 2 : xPadding + index * xStep;
    const y =
      yTop + (3 - STATUS_LEVEL[workflow.status]) * (yTrackHeight / 3);

    return {
      x,
      y,
      workflow,
      isActive: workflow.id === activeWorkflowId,
    };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="rounded-xl border border-border/20 bg-background/80 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-medium text-foreground">Workflow state trend</h3>
        {activeWorkflowId ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Activity className="size-3.5 text-orange-500" />
            Active workflow state
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative min-w-max" style={{ width: chartWidth, height: chartHeight }}>
          <svg
            width={chartWidth}
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="absolute inset-0"
            role="img"
            aria-label="Workflow performance state trend chart"
          >
            {LEVEL_LABELS.map((item) => {
              const y =
                yTop + (3 - item.level) * (yTrackHeight / 3);

              return (
                <g key={item.label}>
                  <line
                    x1={xPadding}
                    y1={y}
                    x2={chartWidth - xPadding}
                    y2={y}
                    stroke="currentColor"
                    className="text-border/50"
                    strokeDasharray="3 3"
                  />
                </g>
              );
            })}

            <polyline
              fill="none"
              stroke="currentColor"
              className="text-foreground/70"
              strokeWidth={2}
              points={polylinePoints}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {points.map((point) => (
              <g key={point.workflow.id}>
                {point.isActive ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={9}
                    fill="none"
                    stroke="#f97316"
                    strokeOpacity={0.5}
                    strokeWidth={2}
                  />
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.isActive ? 5 : 4}
                  fill={STATUS_COLOR[point.workflow.status]}
                  className={cn(point.isActive ? "animate-pulse" : "")}
                />
              </g>
            ))}
          </svg>

          {LEVEL_LABELS.map((item) => {
            const y =
              yTop + (3 - item.level) * (yTrackHeight / 3);

            return (
              <span
                key={item.label}
                className="absolute -translate-y-1/2 text-[10px] font-medium text-muted-foreground"
                style={{ left: 0, top: y }}
              >
                {item.label}
              </span>
            );
          })}

          {points.map((point) => (
            <span
              key={`${point.workflow.id}-label`}
              className="absolute top-[calc(100%-30px)] -translate-x-1/2 text-center text-[10px] text-muted-foreground"
              style={{ left: point.x, width: 96 }}
              title={point.workflow.name}
            >
              <span className="block truncate">{point.workflow.name}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
