"use client";

import { useMemo } from "react";
import { GanttChartSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { FlattenedProjectTask } from "../types";
import { getTaskStatusLabel } from "../utils";
import { ProjectInfoTip } from "./project-info-tip";

// ─── layout constants ─────────────────────────────────────────────────────────
const LABEL_COL_WIDTH = 228;
const ROW_HEIGHT = 48;
const MONTH_HEADER_H = 22;
const DATE_HEADER_H = 26;
const HEADER_H = MONTH_HEADER_H + DATE_HEADER_H;
const BAR_H = 24;
const PADDING_DAYS = 2;
const MAX_TASKS = 60;

// ─── types ────────────────────────────────────────────────────────────────────
export type ProjectDosChartsProps = {
  tasks: FlattenedProjectTask[];
  onEditTask: (workflowId: string, taskId: string) => void;
};

interface MonthSegment {
  label: string;
  left: number;
  width: number;
}

interface Tick {
  date: Date;
  label: string;
  left: number;
  isMonthBoundary: boolean;
}

interface TimelineRow {
  task: FlattenedProjectTask;
  start: Date;
  end: Date;
  barLeft: number;
  barWidth: number;
  isEstimated: boolean;
}

interface TimelineData {
  rows: TimelineRow[];
  months: MonthSegment[];
  ticks: Tick[];
  chartWidth: number;
  todayLeft: number | null;
  windowStart: Date;
  windowEnd: Date;
  pxPerDay: number;
}

// ─── status colours ───────────────────────────────────────────────────────────
const STATUS_BAR: Record<FlattenedProjectTask["status"], string> = {
  todo: "bg-slate-400/80 dark:bg-slate-500/80",
  "in-progress": "bg-primary",
  review: "bg-emerald-500/85",
  blocked: "bg-amber-500/85",
  done: "bg-zinc-400/75 dark:bg-zinc-500/75",
};

const STATUS_BAR_TEXT: Record<FlattenedProjectTask["status"], string> = {
  todo: "text-gray-800 dark:text-white/90",
  "in-progress": "text-white/90",
  review: "text-white/90",
  blocked: "text-white/90",
  done: "text-gray-800 dark:text-white/90",
};

// ─── date helpers ─────────────────────────────────────────────────────────────
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
  );
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function fmtMonthYear(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(d);
}

function fmtDayLabel(d: Date, stepDays: number): string {
  if (stepDays >= 28) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(d);
  }
  return String(d.getDate());
}

function fmtShortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// ─── scale helpers ────────────────────────────────────────────────────────────
function getPxPerDay(totalDays: number): number {
  if (totalDays <= 21) return 48;
  if (totalDays <= 45) return 32;
  if (totalDays <= 90) return 20;
  if (totalDays <= 180) return 12;
  return 8;
}

function getTickStep(totalDays: number): number {
  if (totalDays <= 21) return 1;
  if (totalDays <= 45) return 7;
  if (totalDays <= 90) return 7;
  if (totalDays <= 180) return 14;
  return 30;
}

function getFallbackSpan(task: FlattenedProjectTask): number {
  if (task.subtaskCount > 0)
    return Math.max(3, Math.min(14, task.subtaskCount * 2));
  switch (task.status) {
    case "in-progress": return 7;
    case "review":      return 5;
    case "done":        return 7;
    case "blocked":     return 5;
    default:            return 3;
  }
}

// ─── builder ──────────────────────────────────────────────────────────────────
function buildTimeline(tasks: FlattenedProjectTask[]): TimelineData | null {
  if (!tasks.length) return null;

  const capped = tasks.slice(0, MAX_TASKS);

  // Resolve each task's real or estimated start/end
  const resolved = capped.map((task) => {
    const due   = parseDate(task.dueDate);
    const start = parseDate(task.startDate);
    const end   = due ?? startOfDay(new Date());
    const span  = getFallbackSpan(task);
    const resolvedStart =
      start && start <= end ? start : addDays(end, -(span - 1));
    return { task, start: resolvedStart, end, isEstimated: !due || !start };
  });

  // Compute the visible window
  const minDate = resolved.reduce(
    (m, r) => (r.start < m ? r.start : m),
    resolved[0].start,
  );
  const maxDate = resolved.reduce(
    (m, r) => (r.end > m ? r.end : m),
    resolved[0].end,
  );
  const windowStart = startOfDay(addDays(minDate, -PADDING_DAYS));
  const windowEnd   = startOfDay(addDays(maxDate, PADDING_DAYS));
  const totalDays   = Math.max(1, daysBetween(windowStart, windowEnd) + 1);

  const pxPerDay   = getPxPerDay(totalDays);
  const stepDays   = getTickStep(totalDays);
  const chartWidth = totalDays * pxPerDay;

  // Month segments (for the two-row header)
  const months: MonthSegment[] = [];
  {
    let d = 0;
    while (d < totalDays) {
      const date      = addDays(windowStart, d);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const nextD     = Math.min(daysBetween(windowStart, nextMonth), totalDays);
      months.push({ label: fmtMonthYear(date), left: d * pxPerDay, width: (nextD - d) * pxPerDay });
      d = nextD;
    }
  }

  // Day / week ticks
  const ticks: Tick[] = [];
  for (let d = 0; d < totalDays; d += stepDays) {
    const date = addDays(windowStart, d);
    ticks.push({
      date,
      label: fmtDayLabel(date, stepDays),
      left: d * pxPerDay,
      isMonthBoundary: date.getDate() === 1,
    });
  }

  // Today line
  const today    = startOfDay(new Date());
  const todayDay = daysBetween(windowStart, today);
  const todayLeft =
    todayDay >= 0 && todayDay < totalDays ? todayDay * pxPerDay : null;

  // Bar positions
  const rows: TimelineRow[] = resolved.map(({ task, start, end, isEstimated }) => {
    const startDay    = Math.max(0, daysBetween(windowStart, start));
    const endDay      = Math.min(totalDays - 1, daysBetween(windowStart, end));
    const durationDays = Math.max(1, endDay - startDay + 1);
    const barLeft     = startDay * pxPerDay;
    const barWidth    = Math.max(pxPerDay, durationDays * pxPerDay);
    return { task, start, end, barLeft, barWidth, isEstimated };
  });

  return { rows, months, ticks, chartWidth, todayLeft, windowStart, windowEnd, pxPerDay };
}

// ─── component ────────────────────────────────────────────────────────────────
export function ProjectDosCharts({ tasks, onEditTask }: ProjectDosChartsProps) {
  const timeline = useMemo(() => buildTimeline(tasks), [tasks]);
  const totalWidth = timeline ? LABEL_COL_WIDTH + timeline.chartWidth : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs">
      {/* Card header */}
      <div className="border-b border-border/20 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold">Task timeline</span>
              <ProjectInfoTip content="Each bar covers a task's start-to-due span. Lighter bars use estimated dates." />
            </div>
            <p className="text-muted-foreground text-[12px] leading-5">
              Gantt-style view of tasks by date range.
            </p>
          </div>
          {timeline ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                {timeline.rows.length}
                {tasks.length > MAX_TASKS ? `/${tasks.length}` : ""} tasks
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {fmtShortDate(timeline.windowStart)} – {fmtShortDate(timeline.windowEnd)}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>

      {timeline ? (
        /* ── Scrollable chart area ── */
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalWidth, position: "relative" }}>

            {/* ── Column header ────────────────────────────────────────── */}
            <div
              className="flex border-b border-border/25 bg-card"
              style={{ height: HEADER_H }}
            >
              {/* Sticky task-name header cell */}
              <div
                className="sticky left-0 z-20 flex items-end border-r border-border/25 bg-card px-3 pb-2"
                style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
              >
                <span className="text-muted-foreground text-[10.5px] font-semibold uppercase tracking-[0.07em]">
                  Task
                </span>
              </div>

              {/* Timeline header */}
              <div className="relative flex-1" style={{ height: HEADER_H }}>
                {/* Month row */}
                {timeline.months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 flex items-center overflow-hidden border-r border-border/20 px-2"
                    style={{ left: m.left, width: m.width, height: MONTH_HEADER_H }}
                  >
                    <span className="text-muted-foreground/80 truncate text-[10px] font-semibold uppercase tracking-[0.06em]">
                      {m.label}
                    </span>
                  </div>
                ))}

                {/* Tick marks + labels */}
                {timeline.ticks.map((tick, i) => (
                  <div key={i}>
                    {/* Vertical tick line */}
                    <div
                      className={cn(
                        "pointer-events-none absolute bottom-0",
                        tick.isMonthBoundary
                          ? "border-l border-border/40"
                          : "border-l border-border/20",
                      )}
                      style={{ left: tick.left, top: MONTH_HEADER_H }}
                    />
                    {/* Date label */}
                    <div
                      className={cn(
                        "absolute flex items-center",
                        tick.isMonthBoundary
                          ? "text-foreground/65"
                          : "text-muted-foreground/80",
                      )}
                      style={{
                        left: tick.left + 4,
                        top: MONTH_HEADER_H,
                        height: DATE_HEADER_H,
                      }}
                    >
                      <span className="text-[10px] font-medium">{tick.label}</span>
                    </div>
                  </div>
                ))}

                {/* Today line in header */}
                {timeline.todayLeft !== null ? (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-primary/50"
                    style={{ left: timeline.todayLeft }}
                  />
                ) : null}
              </div>
            </div>

            {/* ── Task rows ─────────────────────────────────────────────── */}
            {timeline.rows.map((row) => (
              <button
                key={row.task.id}
                type="button"
                onClick={() => onEditTask(row.task.workflowId, row.task.id)}
                className="group flex w-full cursor-pointer border-b border-border/12 text-left hover:bg-muted/10"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Sticky label cell */}
                <div
                  className="sticky left-0 z-10 flex min-w-0 flex-col justify-center border-r border-border/20 bg-card px-3"
                  style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
                >
                  <div className="truncate text-[12px] font-medium leading-5">
                    {row.task.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="max-w-[8rem] truncate">{row.task.workflowName}</span>
                    <span className="text-border/60">·</span>
                    <span>{getTaskStatusLabel(row.task.status)}</span>
                  </div>
                </div>

                {/* Timeline cell */}
                <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                  {/* Background grid lines */}
                  {timeline.ticks.map((tick, i) => (
                    <div
                      key={i}
                      className={cn(
                        "pointer-events-none absolute inset-y-0",
                        tick.isMonthBoundary
                          ? "border-l border-border/25"
                          : "border-l border-border/10",
                      )}
                      style={{ left: tick.left }}
                    />
                  ))}

                  {/* Today vertical line */}
                  {timeline.todayLeft !== null ? (
                    <div
                      className="pointer-events-none absolute inset-y-2 w-0.5 rounded-full bg-primary/35"
                      style={{ left: timeline.todayLeft }}
                    />
                  ) : null}

                  {/* Task bar */}
                  <div
                    className={cn(
                      "pointer-events-none absolute top-1/2 -translate-y-1/2 flex items-center overflow-hidden rounded-sm transition-opacity group-hover:brightness-110",
                      STATUS_BAR[row.task.status],
                      row.isEstimated ? "opacity-55" : "opacity-100",
                    )}
                    style={{
                      left: row.barLeft,
                      width: row.barWidth,
                      height: BAR_H,
                    }}
                  >
                    {row.barWidth > 56 ? (
                      <span className={cn("truncate px-2 text-[10.5px] font-medium", STATUS_BAR_TEXT[row.task.status])}>
                        {row.task.title}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}

            {/* ── Today badge at bottom ─────────────────────────────────── */}
            {timeline.todayLeft !== null ? (
              <div
                className="pointer-events-none absolute bottom-0 z-10"
                style={{ left: LABEL_COL_WIDTH + timeline.todayLeft - 16 }}
              >
                <span className="rounded-t-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  Today
                </span>
              </div>
            ) : null}
          </div>
        </div>
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

      {/* Overflow notice */}
      {tasks.length > MAX_TASKS ? (
        <div className="border-t border-border/20 px-3 py-1.5 text-center">
          <span className="text-muted-foreground text-[11px]">
            Showing first {MAX_TASKS} of {tasks.length} tasks
          </span>
        </div>
      ) : null}
    </section>
  );
}
