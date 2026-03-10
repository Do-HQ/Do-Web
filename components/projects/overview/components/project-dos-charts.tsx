import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GanttChartSquare } from "lucide-react";
import { cn } from "@/lib/utils";

import { FlattenedProjectTask } from "../types";
import { getSubtaskProgressLabel, getTaskStatusLabel } from "../utils";
import { ProjectInfoTip } from "./project-info-tip";

type ProjectDosChartsProps = {
  tasks: FlattenedProjectTask[];
  onEditTask: (workflowId: string, taskId: string) => void;
};

type TimelineRow = {
  task: FlattenedProjectTask;
  start: Date;
  end: Date;
  left: number;
  width: number;
};

type TimelineBuildResult = {
  rows: TimelineRow[];
  ticks: Date[];
  windowLabel: string;
  chartWidth: number;
  tickDivisions: number;
  todayOffset: number | null;
};

type TimelineZoom = "compact" | "balanced" | "expanded";

const ZOOM_OPTIONS: Array<{ value: TimelineZoom; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "balanced", label: "Balanced" },
  { value: "expanded", label: "Expanded" },
];

const BAR_STYLES = {
  todo: "bg-slate-500/75",
  "in-progress": "bg-primary/90",
  review: "bg-emerald-500/85",
  blocked: "bg-amber-500/85",
  done: "bg-zinc-500/85",
} as const;

function toStartOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function dayDiff(start: Date, end: Date) {
  const startKey = toStartOfDay(start).getTime();
  const endKey = toStartOfDay(end).getTime();
  return Math.max(0, Math.round((endKey - startKey) / 86_400_000));
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function parseTaskDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getFallbackSpanDays(task: FlattenedProjectTask) {
  if (task.subtaskCount > 0) {
    return Math.max(3, Math.min(14, task.subtaskCount * 2));
  }

  switch (task.status) {
    case "in-progress":
      return 6;
    case "review":
      return 4;
    case "done":
      return 5;
    case "blocked":
      return 4;
    default:
      return 3;
  }
}

function getTimelineScale(zoom: TimelineZoom) {
  switch (zoom) {
    case "compact":
      return { pxPerDay: 14, minWidth: 560 };
    case "expanded":
      return { pxPerDay: 28, minWidth: 760 };
    default:
      return { pxPerDay: 20, minWidth: 640 };
  }
}

function getTickStepDays(totalDays: number, zoom: TimelineZoom) {
  if (zoom === "expanded") {
    if (totalDays > 84) return 14;
    if (totalDays > 42) return 7;
    if (totalDays > 16) return 3;
    return 1;
  }

  if (zoom === "compact") {
    if (totalDays > 140) return 28;
    if (totalDays > 70) return 14;
    if (totalDays > 32) return 7;
    if (totalDays > 16) return 3;
    return 1;
  }

  if (totalDays > 120) return 21;
  if (totalDays > 56) return 14;
  if (totalDays > 28) return 7;
  if (totalDays > 14) return 3;
  return 1;
}

function buildTimelineRows(
  tasks: FlattenedProjectTask[],
  zoom: TimelineZoom,
): TimelineBuildResult {
  if (!tasks.length) {
    return {
      rows: [],
      ticks: [],
      windowLabel: "No timeline",
      chartWidth: 640,
      tickDivisions: 1,
      todayOffset: null,
    };
  }

  const orderedTasks = [...tasks]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 24);

  const baseRows = orderedTasks.map((task) => {
    const end = parseTaskDate(task.dueDate) ?? toStartOfDay(new Date());
    const explicitStart = parseTaskDate(task.startDate);
    const spanDays = getFallbackSpanDays(task);
    const start =
      explicitStart && explicitStart <= end
        ? explicitStart
        : addDays(end, -(spanDays - 1));

    return { task, start, end };
  });

  const minStart = baseRows.reduce(
    (current, row) => (row.start < current ? row.start : current),
    baseRows[0].start,
  );
  const maxEnd = baseRows.reduce(
    (current, row) => (row.end > current ? row.end : current),
    baseRows[0].end,
  );
  const totalDays = Math.max(1, dayDiff(minStart, maxEnd) + 1);
  const scale = getTimelineScale(zoom);
  const chartWidth = Math.max(scale.minWidth, totalDays * scale.pxPerDay);
  const tickStepDays = getTickStepDays(totalDays, zoom);

  const ticks: Date[] = [];
  for (let offset = 0; offset < totalDays; offset += tickStepDays) {
    ticks.push(addDays(minStart, offset));
  }
  const finalTick = addDays(minStart, totalDays - 1);
  if (
    !ticks.length ||
    ticks[ticks.length - 1].getTime() !== finalTick.getTime()
  ) {
    ticks.push(finalTick);
  }

  const rows = baseRows.map((row) => {
    const startOffset = dayDiff(minStart, row.start);
    const durationDays = Math.max(1, dayDiff(row.start, row.end) + 1);

    return {
      ...row,
      left: (startOffset / totalDays) * 100,
      width: Math.max(2.5, (durationDays / totalDays) * 100),
    };
  });

  const today = toStartOfDay(new Date());
  const todayOffset =
    today < minStart || today > maxEnd
      ? null
      : (dayDiff(minStart, today) / totalDays) * 100;

  return {
    rows,
    ticks,
    windowLabel: `${formatDateLabel(minStart)} - ${formatDateLabel(maxEnd)}`,
    chartWidth,
    tickDivisions: Math.max(1, ticks.length - 1),
    todayOffset,
  };
}

export function ProjectDosCharts({ tasks, onEditTask }: ProjectDosChartsProps) {
  const [zoom, setZoom] = useState<TimelineZoom>("balanced");
  const timeline = useMemo(() => buildTimelineRows(tasks, zoom), [tasks, zoom]);

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs">
      <div className="border-b border-border/20 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="text-[13px] font-semibold">Task timeline</div>
              <ProjectInfoTip content="Timeline uses each task's start and due dates. If start date is missing, a fallback window is estimated from status and subtask count." />
            </div>
            <div className="text-muted-foreground text-[12px] leading-5">
              Gantt-style timeline built from task start and due dates.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-muted/80 inline-flex rounded-md p-0.5">
              {ZOOM_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(option.value)}
                  className={cn(
                    "h-7 px-2 text-[11px]",
                    zoom === option.value
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Badge variant="outline" className="text-[11px]">
              {timeline.rows.length}/{tasks.length} tasks
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {timeline.windowLabel}
            </Badge>
            <ProjectInfoTip
              content="Window range shows the earliest start and latest due date among currently scoped tasks."
              align="end"
            />
          </div>
        </div>
      </div>

      {timeline.rows.length ? (
        <ScrollArea className="w-full">
          <div className="min-w-max p-3">
            <div className="grid grid-cols-[15.5rem_auto] items-end gap-3 px-1 pb-2">
              <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.08em]">
                Task
              </div>
              <div
                className="grid items-center gap-2 text-[11px] font-medium text-muted-foreground"
                style={{ width: `${timeline.chartWidth}px` }}
              >
                <div
                  className="grid gap-0"
                  style={{
                    gridTemplateColumns: `repeat(${timeline.ticks.length}, minmax(0, 1fr))`,
                  }}
                >
                  {timeline.ticks.map((tick, index) => (
                    <div key={`${tick.toISOString()}-${index}`}>
                      {formatDateLabel(tick)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {timeline.rows.map((row) => (
                <button
                  key={row.task.id}
                  type="button"
                  onClick={() => onEditTask(row.task.workflowId, row.task.id)}
                  className="group grid w-full grid-cols-[15.5rem_auto] items-center gap-3 rounded-lg bg-background/70 px-1.5 py-1.5 text-left transition-colors hover:bg-muted/15"
                >
                  <div className="rounded-md px-2 py-1.5 transition-colors group-hover:bg-background/85">
                    <div className="truncate text-[12px] font-medium leading-5">
                      {row.task.title}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px] leading-5">
                      <span>{row.task.workflowName}</span>
                      <span>{getTaskStatusLabel(row.task.status)}</span>
                      <span>{getSubtaskProgressLabel(row.task)}</span>
                      <span>
                        {formatDateLabel(row.start)} to {formatDateLabel(row.end)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="rounded-md px-2 py-1 transition-colors group-hover:bg-background/85"
                    style={{ width: `${timeline.chartWidth}px` }}
                  >
                    <div className="relative h-6 overflow-hidden rounded-md border border-border/25 bg-muted/30">
                      <div
                        className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border/20)_1px,transparent_1px)]"
                        style={{
                          backgroundSize: `${100 / timeline.tickDivisions}% 100%`,
                        }}
                      />
                      {timeline.todayOffset !== null ? (
                        <div
                          className="absolute bottom-0 top-0 w-px bg-primary/60"
                          style={{ left: `${timeline.todayOffset}%` }}
                        />
                      ) : null}
                      <div
                        className={cn(
                          "absolute top-1/2 h-2 -translate-y-1/2 rounded-full shadow-sm",
                          BAR_STYLES[row.task.status],
                        )}
                        style={{
                          left: `${row.left}%`,
                          width: `min(${row.width}%, calc(100% - ${row.left}%))`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="px-4 py-4">
          <Empty className="border-0 p-0 md:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GanttChartSquare className="size-4 text-primary/85" />
              </EmptyMedia>
              <EmptyDescription className="text-[12px]">
                No task timeline data yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </section>
  );
}
