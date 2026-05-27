"use client";

import { Activity } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

import { WorkflowVisual } from "./WorkflowTabs";

type WorkflowStateTrendProps = {
  workflows: WorkflowVisual[];
  activeWorkflowId: string | null;
};

type WorkflowTrendDatum = {
  id: string;
  name: string;
  status: WorkflowVisual["status"];
  statusLevel: number;
  statusLabel: string;
  xValue: number;
  color: string;
  isActive: boolean;
};

type TooltipPayloadEntry = {
  payload?: WorkflowTrendDatum;
};

type WorkflowTrendTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
};

type WorkflowXAxisTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value?: number;
  };
  data: WorkflowTrendDatum[];
};

type WorkflowTrendDotProps = {
  cx?: number;
  cy?: number;
  payload?: WorkflowTrendDatum;
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

const STATUS_LABEL_BY_LEVEL: Record<number, string> = {
  3: "Fast",
  2: "Average",
  1: "Slow",
  0: "Late",
};

const STATUS_TONE: Record<WorkflowVisual["status"], string> = {
  quick: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  average: "bg-sky-50 text-sky-700 ring-sky-200",
  delayed: "bg-amber-50 text-amber-700 ring-amber-200",
  late: "bg-rose-50 text-rose-700 ring-rose-200",
};

function getWrappedLabel(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 2) {
    return [value];
  }

  const firstLine: string[] = [];
  const secondLine: string[] = [];

  for (const word of words) {
    const targetLine = firstLine.join(" ").length < 14 ? firstLine : secondLine;

    if (targetLine.join(" ").length + word.length > 18 && targetLine.length) {
      secondLine.push(word);
      continue;
    }

    targetLine.push(word);
  }

  const lines = [firstLine.join(" "), secondLine.join(" ")]
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 2) {
    return [lines[0], `${lines.slice(1).join(" ").slice(0, 20)}...`];
  }

  if (lines[1] && lines[1].length > 22) {
    lines[1] = `${lines[1].slice(0, 20)}...`;
  }

  return lines;
}

function WorkflowTrendTooltip({ active, payload }: WorkflowTrendTooltipProps) {
  const item = payload?.[0]?.payload;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="min-w-40 rounded-md border border-border bg-background px-2.5 py-2 shadow-sm">
      <div className="mb-1 text-[10px] font-medium text-muted-foreground">
        Workflow state
      </div>
      <div className="text-[12px] font-semibold text-foreground">
        {item.name}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1",
            STATUS_TONE[item.status],
          )}
        >
          {item.statusLabel}
        </span>
        {item.isActive ? (
          <span className="text-[10px] font-medium text-orange-600">
            Active
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WorkflowXAxisTick({
  x = 0,
  y = 0,
  payload,
  data,
}: WorkflowXAxisTickProps) {
  const item = data.find((entry) => entry.xValue === payload?.value);
  const lines = getWrappedLabel(item?.name ?? "");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        className="fill-muted-foreground text-[9px] font-medium"
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 10 : 10}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function WorkflowTrendDot({ cx = 0, cy = 0, payload }: WorkflowTrendDotProps) {
  if (!payload) {
    return null;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.isActive ? 4.5 : 3.5}
      fill={payload.color}
      stroke="var(--background)"
      strokeWidth={1.5}
      className={cn(payload.isActive ? "animate-pulse" : "")}
    />
  );
}

export function WorkflowStateTrend({
  workflows,
  activeWorkflowId,
}: WorkflowStateTrendProps) {
  if (!workflows.length) {
    return null;
  }

  const chartData: WorkflowTrendDatum[] = workflows.map((workflow, index) => ({
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
    statusLevel: STATUS_LEVEL[workflow.status],
    statusLabel: STATUS_LABEL_BY_LEVEL[STATUS_LEVEL[workflow.status]],
    xValue: workflows.length === 1 ? 0.5 : index,
    color: STATUS_COLOR[workflow.status],
    isActive: workflow.id === activeWorkflowId,
  }));

  const activePoint = chartData.find((item) => item.isActive);
  const xMax = workflows.length === 1 ? 1 : workflows.length - 1;
  const shouldScroll = chartData.length > 7;
  const chartWidth = shouldScroll
    ? Math.max(680, chartData.length * 96)
    : "100%";

  return (
    <section className="w-full rounded-xl border border-border/20 bg-background/80 p-2.5">
      <div className="mb-2 flex items-center justify-end gap-2">
        {activeWorkflowId ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Activity className="size-3 text-orange-500" />
            Active workflow state
          </span>
        ) : null}
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden pb-1">
        <div className="h-[198px] min-w-full" style={{ width: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 14, bottom: 18, left: -18 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
                opacity={0.72}
              />
              <XAxis
                dataKey="xValue"
                type="number"
                domain={[0, xMax]}
                ticks={chartData.map((item) => item.xValue)}
                axisLine={false}
                tickLine={false}
                height={42}
                tick={<WorkflowXAxisTick data={chartData} />}
              />
              <YAxis
                width={52}
                domain={[0, 3]}
                ticks={[0, 1, 2, 3]}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 9,
                  fontWeight: 500,
                }}
                tickFormatter={(value) =>
                  STATUS_LABEL_BY_LEVEL[Number(value)] ?? ""
                }
              />
              <Tooltip
                cursor={{
                  stroke: "var(--foreground)",
                  strokeDasharray: "3 3",
                  opacity: 0.16,
                }}
                content={<WorkflowTrendTooltip />}
              />
              <Line
                type="monotone"
                dataKey="statusLevel"
                stroke="var(--foreground)"
                strokeOpacity={0.76}
                strokeWidth={2}
                dot={(props: unknown) => (
                  <WorkflowTrendDot {...(props as WorkflowTrendDotProps)} />
                )}
                activeDot={{
                  r: 5,
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
              {activePoint ? (
                <ReferenceDot
                  x={activePoint.xValue}
                  y={activePoint.statusLevel}
                  r={8}
                  fill="none"
                  stroke="#f97316"
                  strokeOpacity={0.42}
                  strokeWidth={1.8}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
