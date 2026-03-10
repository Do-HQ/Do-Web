"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDot,
  Clock3,
  Flag,
  ListFilter,
  ListTodo,
  Milestone,
  Rows3,
  ShieldAlert,
  TimerReset,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import type { WorkspaceProjectRecord } from "@/types/project";
import LoaderComponent from "../shared/loader";

type CalendarView = "month" | "week" | "day" | "year" | "agenda";
type CalendarEventType = "task" | "milestone" | "workflow" | "risk";

type WorkspaceCalendarEvent = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: CalendarEventType;
  status?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  href: string;
  meta?: string;
};

type EventTypeMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dotClassName: string;
  chipClassName: string;
  laneClassName: string;
};

const CALENDAR_VIEW_OPTIONS: Array<{
  value: CalendarView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "day", label: "Day", icon: CalendarClock },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "year", label: "Year", icon: Rows3 },
  { value: "agenda", label: "Agenda", icon: Clock3 },
];

const EVENT_TYPE_META: Record<CalendarEventType, EventTypeMeta> = {
  task: {
    label: "Tasks",
    icon: ListTodo,
    dotClassName: "bg-sky-500",
    chipClassName:
      "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    laneClassName: "bg-sky-500/80",
  },
  milestone: {
    label: "Milestones",
    icon: Milestone,
    dotClassName: "bg-amber-500",
    chipClassName:
      "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    laneClassName: "bg-amber-500/85",
  },
  workflow: {
    label: "Workflows",
    icon: CircleDot,
    dotClassName: "bg-violet-500",
    chipClassName:
      "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300",
    laneClassName: "bg-violet-500/85",
  },
  risk: {
    label: "Risks & Issues",
    icon: ShieldAlert,
    dotClassName: "bg-rose-500",
    chipClassName:
      "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    laneClassName: "bg-rose-500/85",
  },
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_HOUR = 6;
const END_HOUR = 22;
const YEAR_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DEFAULT_TYPE_FILTER: Record<CalendarEventType, boolean> = {
  task: true,
  milestone: true,
  workflow: true,
  risk: true,
};

const isValidDate = (value?: string) =>
  Boolean(value) && !Number.isNaN(new Date(value as string).getTime());

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const endOfDay = (value: Date) =>
  new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );

const addDays = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const addMonths = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const addYears = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setFullYear(next.getFullYear() + amount);
  return next;
};

const startOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1);

const endOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);

const startOfWeek = (value: Date) => {
  const current = startOfDay(value);
  const weekday = current.getDay();
  const mondayShift = weekday === 0 ? -6 : 1 - weekday;
  return addDays(current, mondayShift);
};

const dateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameDay = (left: Date, right: Date) => dateKey(left) === dateKey(right);

const intersectsDay = (event: WorkspaceCalendarEvent, day: Date) =>
  event.start <= endOfDay(day) && event.end >= startOfDay(day);

const hasTimeComponent = (value: string) => /T\d{2}:\d{2}/.test(value);

const withHour = (value: Date, hour: number, minute = 0) => {
  const next = new Date(value);
  next.setHours(hour, minute, 0, 0);
  return next;
};

const addMinutes = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setMinutes(next.getMinutes() + amount);
  return next;
};

const parseWithFallbackTime = (
  raw: string,
  fallbackHour: number,
  fallbackMinute = 0,
) => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (hasTimeComponent(raw)) {
    return parsed;
  }

  return withHour(parsed, fallbackHour, fallbackMinute);
};

const formatDayHeading = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);

const formatMonthTitle = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);

const formatCompactDate = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);

const formatTime = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

const sortEvents = (events: WorkspaceCalendarEvent[]) =>
  [...events].sort((left, right) => {
    if (left.start.getTime() !== right.start.getTime()) {
      return left.start.getTime() - right.start.getTime();
    }

    if (left.end.getTime() !== right.end.getTime()) {
      return left.end.getTime() - right.end.getTime();
    }

    return left.title.localeCompare(right.title);
  });

const buildMonthGrid = (anchorDate: Date) => {
  const monthStart = startOfMonth(anchorDate);
  const firstCell = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
};

const buildRangeLabel = (view: CalendarView, anchorDate: Date) => {
  if (view === "month") {
    return formatMonthTitle(anchorDate);
  }

  if (view === "year") {
    return String(anchorDate.getFullYear());
  }

  if (view === "day") {
    return formatDayHeading(anchorDate);
  }

  if (view === "week") {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = addDays(weekStart, 6);
    return `${formatCompactDate(weekStart)} - ${formatCompactDate(weekEnd)}, ${weekEnd.getFullYear()}`;
  }

  const agendaEnd = addDays(anchorDate, 30);
  return `${formatCompactDate(anchorDate)} - ${formatCompactDate(agendaEnd)}`;
};

const summarizeByType = (events: WorkspaceCalendarEvent[]) => {
  const summary: Record<CalendarEventType, number> = {
    task: 0,
    milestone: 0,
    workflow: 0,
    risk: 0,
  };

  events.forEach((event) => {
    summary[event.type] += 1;
  });

  return summary;
};

const toWorkspaceCalendarEvents = (projects: WorkspaceProjectRecord[]) => {
  const events: WorkspaceCalendarEvent[] = [];

  projects.forEach((projectEntry) => {
    const projectRecord = projectEntry?.record;
    const projectId = String(
      projectEntry?.projectId || projectRecord?.id || "",
    ).trim();
    if (!projectId) {
      return;
    }

    const projectName =
      String(
        projectEntry?.name || projectRecord?.name || "Untitled project",
      ).trim() || "Untitled project";

    const workflows = Array.isArray(projectRecord?.workflows)
      ? projectRecord.workflows
      : [];
    const milestones = Array.isArray(projectRecord?.milestones)
      ? projectRecord.milestones
      : [];
    const risks = Array.isArray(projectRecord?.risks)
      ? projectRecord.risks
      : [];

    workflows
      .filter((workflow) => !workflow.archived)
      .forEach((workflow) => {
        if (
          isValidDate(workflow.startedAt) &&
          isValidDate(workflow.targetEndDate)
        ) {
          const start = parseWithFallbackTime(String(workflow.startedAt), 9);
          const end = parseWithFallbackTime(String(workflow.targetEndDate), 17);

          if (start && end) {
            events.push({
              id: `workflow-${projectId}-${workflow.id}`,
              projectId,
              projectName,
              title: workflow.name,
              type: "workflow",
              status: workflow.status,
              start,
              end,
              allDay: true,
              href: `/projects/${projectId}?tab=workflows&workflow=${workflow.id}`,
              meta: workflow.status,
            });
          }
        }

        workflow.tasks.forEach((task) => {
          const dueRaw = String(task.dueDate || "").trim();
          const startRaw = String(task.startDate || "").trim();
          const anchorRaw = dueRaw || startRaw;

          if (!isValidDate(anchorRaw)) {
            return;
          }

          const start =
            (isValidDate(startRaw) && parseWithFallbackTime(startRaw, 10)) ||
            parseWithFallbackTime(anchorRaw, 10);
          const end =
            (isValidDate(dueRaw) && parseWithFallbackTime(dueRaw, 11)) ||
            (start ? addMinutes(start, 90) : null);

          if (!start || !end) {
            return;
          }

          events.push({
            id: `task-${projectId}-${workflow.id}-${task.id}`,
            projectId,
            projectName,
            title: task.title,
            type: "task",
            status: task.status,
            start,
            end: end.getTime() <= start.getTime() ? addMinutes(start, 90) : end,
            allDay: !hasTimeComponent(anchorRaw),
            href: `/projects/${projectId}?tab=dos&workflow=${workflow.id}&task=${task.id}`,
            meta: workflow.name,
          });
        });
      });

    milestones.forEach((milestone) => {
      if (!isValidDate(milestone.dueDate)) {
        return;
      }

      const start = parseWithFallbackTime(String(milestone.dueDate), 12);
      if (!start) {
        return;
      }

      events.push({
        id: `milestone-${projectId}-${milestone.id}`,
        projectId,
        projectName,
        title: milestone.title,
        type: "milestone",
        start,
        end: addMinutes(start, 60),
        allDay: true,
        href: `/projects/${projectId}?tab=overview`,
        meta: milestone.owner,
      });
    });

    risks
      .filter((risk) => String(risk.state || "open") !== "closed")
      .forEach((risk) => {
        const source = String(risk.updatedAt || risk.createdAt || "").trim();
        if (!isValidDate(source)) {
          return;
        }

        const start = parseWithFallbackTime(source, 15);
        if (!start) {
          return;
        }

        events.push({
          id: `risk-${projectId}-${risk.id}`,
          projectId,
          projectName,
          title: risk.title,
          type: "risk",
          status: risk.state || risk.status,
          start,
          end: addMinutes(start, 45),
          allDay: false,
          href: `/projects/${projectId}?tab=risks-issues&risk=${risk.id}`,
          meta: risk.kind,
        });
      });
  });

  return sortEvents(events);
};

const WorkspaceCalendar = () => {
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspaceProjects } = useWorkspaceProject();
  const projectQueryParams = useMemo(
    () => ({ page: 1, limit: 1000, search: "", archived: false }),
    [],
  );
  const workspaceProjectsQuery = useWorkspaceProjects(
    workspaceId ?? "",
    projectQueryParams,
  );
  const records = useMemo(
    () => workspaceProjectsQuery.data?.data?.projects || [],
    [workspaceProjectsQuery.data?.data?.projects],
  );

  const [view, setView] = useState<CalendarView>("month");
  const [rightPanelTab, setRightPanelTab] = useState<"calendar" | "timeline">(
    "calendar",
  );
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilters, setTypeFilters] =
    useState<Record<CalendarEventType, boolean>>(DEFAULT_TYPE_FILTER);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const today = startOfDay(now);

  const allEvents = useMemo(
    () => toWorkspaceCalendarEvents(records),
    [records],
  );
  const isProjectsLoading = workspaceProjectsQuery.isPending;
  const isProjectsError = workspaceProjectsQuery.isError;
  const hasAnyEvents = allEvents.length > 0;
  const projectOptions = useMemo(
    () =>
      records
        .map((project) => ({
          id: String(project.projectId || "").trim(),
          name: String(project.name || "").trim(),
        }))
        .filter((project) => Boolean(project.id) && Boolean(project.name)),
    [records],
  );

  useEffect(() => {
    if (selectedProjectId === "all") {
      return;
    }

    const stillExists = projectOptions.some(
      (project) => project.id === selectedProjectId,
    );
    if (!stillExists) {
      setSelectedProjectId("all");
    }
  }, [projectOptions, selectedProjectId]);

  const visibleEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return allEvents.filter((event) => {
      if (!typeFilters[event.type]) {
        return false;
      }

      if (
        selectedProjectId !== "all" &&
        event.projectId !== selectedProjectId
      ) {
        return false;
      }

      if (normalizedSearch) {
        const haystack =
          `${event.title} ${event.projectName} ${event.meta || ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, searchTerm, selectedProjectId, typeFilters]);

  const timelineTaskEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sortEvents(
      allEvents.filter((event) => {
        if (event.type !== "task") {
          return false;
        }

        if (
          selectedProjectId !== "all" &&
          event.projectId !== selectedProjectId
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack =
          `${event.title} ${event.projectName} ${event.meta || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    );
  }, [allEvents, searchTerm, selectedProjectId]);

  const selectedEvent = useMemo(
    () => visibleEvents.find((event) => event.id === selectedEventId) || null,
    [visibleEvents, selectedEventId],
  );
  const selectedEventMeta = selectedEvent
    ? EVENT_TYPE_META[selectedEvent.type]
    : null;

  const selectedDateEvents = useMemo(
    () => visibleEvents.filter((event) => intersectsDay(event, selectedDate)),
    [selectedDate, visibleEvents],
  );

  const eventSummary = useMemo(
    () => summarizeByType(visibleEvents),
    [visibleEvents],
  );
  const upcomingEvents = useMemo(() => {
    const cutoff = today.getTime();
    return visibleEvents
      .filter((event) => event.end.getTime() >= cutoff)
      .slice(0, 8);
  }, [today, visibleEvents]);

  const miniCalendarHighlightDays = useMemo(() => {
    const seen = new Set<string>();
    const dates: Date[] = [];

    visibleEvents.forEach((event) => {
      const key = dateKey(event.start);
      if (!seen.has(key)) {
        seen.add(key);
        dates.push(startOfDay(event.start));
      }
    });

    return dates;
  }, [visibleEvents]);

  const monthGridDays = useMemo(() => buildMonthGrid(anchorDate), [anchorDate]);
  const monthDayEventsMap = useMemo(() => {
    const map = new Map<string, WorkspaceCalendarEvent[]>();
    const firstDay = monthGridDays[0];
    const lastDay = monthGridDays[monthGridDays.length - 1];

    monthGridDays.forEach((day) => {
      map.set(dateKey(day), []);
    });

    visibleEvents.forEach((event) => {
      let cursor = startOfDay(event.start < firstDay ? firstDay : event.start);
      const eventEndDay = startOfDay(event.end > lastDay ? lastDay : event.end);

      while (cursor.getTime() <= eventEndDay.getTime()) {
        const key = dateKey(cursor);
        const current = map.get(key);
        if (current) {
          current.push(event);
        }
        cursor = addDays(cursor, 1);
      }
    });

    map.forEach((events, key) => {
      map.set(key, sortEvents(events));
    });

    return map;
  }, [monthGridDays, visibleEvents]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDate]);

  const agendaEvents = useMemo(() => {
    const agendaStart = startOfDay(anchorDate);
    const agendaEnd = endOfDay(addDays(agendaStart, 30));

    return visibleEvents.filter(
      (event) =>
        event.start.getTime() <= agendaEnd.getTime() &&
        event.end.getTime() >= agendaStart.getTime(),
    );
  }, [anchorDate, visibleEvents]);

  const agendaGroups = useMemo(() => {
    const map = new Map<string, WorkspaceCalendarEvent[]>();

    agendaEvents.forEach((event) => {
      const key = dateKey(event.start);
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, sortEvents(list));
    });

    return Array.from(map.entries())
      .sort(
        (left, right) =>
          new Date(left[0]).getTime() - new Date(right[0]).getTime(),
      )
      .map(([key, events]) => ({
        key,
        date: new Date(key),
        events,
      }));
  }, [agendaEvents]);

  const rangeLabel = buildRangeLabel(view, anchorDate);
  const activeViewOption =
    CALENDAR_VIEW_OPTIONS.find((option) => option.value === view) ??
    CALENDAR_VIEW_OPTIONS[0];

  const navigatePeriod = (direction: "prev" | "next") => {
    const factor = direction === "next" ? 1 : -1;

    setAnchorDate((current) => {
      if (view === "month") {
        return addMonths(current, factor);
      }
      if (view === "week") {
        return addDays(current, factor * 7);
      }
      if (view === "day") {
        return addDays(current, factor);
      }
      if (view === "year") {
        return addYears(current, factor);
      }
      return addDays(current, factor * 30);
    });
  };

  const resetToToday = () => {
    setAnchorDate(today);
    setSelectedDate(today);
  };

  const toggleTypeFilter = (type: CalendarEventType) => {
    setTypeFilters((current) => ({
      ...current,
      [type]: !current[type],
    }));
  };

  const renderEventChip = (event: WorkspaceCalendarEvent, compact = false) => {
    const meta = EVENT_TYPE_META[event.type];
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => {
          setSelectedEventId(event.id);
          const eventDay = startOfDay(event.start);
          setSelectedDate(eventDay);
          setAnchorDate(eventDay);
          setView("day");
        }}
        className={cn(
          "group/event flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent/55",
          meta.chipClassName,
          compact ? "text-[11px]" : "text-[12px]",
        )}
      >
        <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
        <span className="min-w-0 truncate">{event.title}</span>
      </button>
    );
  };

  const renderMonthView = () => {
    const anchorMonth = anchorDate.getMonth();
    const anchorYear = anchorDate.getFullYear();

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="bg-muted/35 grid grid-cols-7 rounded-t-lg px-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="bg-muted/20 grid h-full grid-cols-7 grid-rows-6 gap-px">
            {monthGridDays.map((day) => {
              const key = dateKey(day);
              const dayEvents = monthDayEventsMap.get(key) || [];
              const isCurrentMonth =
                day.getMonth() === anchorMonth &&
                day.getFullYear() === anchorYear;
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const eventCounts = dayEvents.reduce(
                (counts, event) => {
                  counts[event.type] += 1;
                  return counts;
                },
                { task: 0, milestone: 0, workflow: 0, risk: 0 } as Record<
                  CalendarEventType,
                  number
                >,
              );

              return (
                <div
                  key={key}
                  className={cn(
                    "bg-background/75 flex min-h-0 flex-col gap-1.5 p-1.5 transition-colors",
                    !isCurrentMonth && "bg-muted/35",
                    isSelected && "bg-accent/65",
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-md text-[11px] font-medium",
                        isToday && "bg-primary text-primary-foreground",
                        !isToday && isCurrentMonth && "text-foreground",
                        !isCurrentMonth && "text-muted-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex items-center gap-1">
                      {(Object.keys(eventCounts) as CalendarEventType[]).map(
                        (type) =>
                          eventCounts[type] > 0 ? (
                            <span
                              key={`${key}-${type}`}
                              className={cn(
                                "size-1.5 rounded-full",
                                EVENT_TYPE_META[type].dotClassName,
                              )}
                            />
                          ) : null,
                      )}
                    </div>
                  </div>

                  <div className="mt-0.5 min-h-0 flex-1 space-y-1 overflow-hidden">
                    {dayEvents
                      .slice(0, 2)
                      .map((event) => renderEventChip(event, true))}
                    {dayEvents.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className="text-muted-foreground hover:text-foreground inline-flex text-[10px]"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekOrDayView = (mode: "week" | "day") => {
    const days = mode === "day" ? [startOfDay(anchorDate)] : weekDays;
    const slotCount = END_HOUR - START_HOUR;
    const dayStartMinutes = START_HOUR * 60;
    const dayEndMinutes = END_HOUR * 60;
    const totalMinutes = dayEndMinutes - dayStartMinutes;
    const allDayByDay = new Map<string, WorkspaceCalendarEvent[]>();
    const timedByDay = new Map<string, WorkspaceCalendarEvent[]>();

    days.forEach((day) => {
      const key = dateKey(day);
      allDayByDay.set(
        key,
        sortEvents(
          visibleEvents.filter(
            (event) => intersectsDay(event, day) && event.allDay,
          ),
        ),
      );
      timedByDay.set(
        key,
        sortEvents(
          visibleEvents.filter(
            (event) => intersectsDay(event, day) && !event.allDay,
          ),
        ),
      );
    });

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="bg-muted/35 grid rounded-t-lg px-1"
          style={{
            gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="text-muted-foreground px-2 py-1.5 text-[11px]">
            All day
          </div>
          {days.map((day) => {
            const key = dateKey(day);
            const allDayEvents = allDayByDay.get(key) || [];
            const isToday = isSameDay(day, today);
            return (
              <div key={key} className="px-2 py-1.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] font-medium">
                    {mode === "day"
                      ? formatDayHeading(day)
                      : `${WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]} ${day.getDate()}`}
                  </p>
                  {isToday ? (
                    <Badge className="h-5 text-[10px]">Today</Badge>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {allDayEvents
                    .slice(0, 2)
                    .map((event) => renderEventChip(event, true))}
                  {allDayEvents.length > 2 ? (
                    <p className="text-muted-foreground text-[10px]">
                      +{allDayEvents.length - 2} more all-day
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className="bg-muted/20 grid h-full min-h-full gap-px"
            style={{
              gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            <div
              className="bg-background/80 grid min-h-0"
              style={{
                gridTemplateRows: `repeat(${slotCount}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: slotCount }, (_, index) => {
                const hour = START_HOUR + index;
                return (
                  <div
                    key={`hour-${hour}`}
                    className="text-muted-foreground border-muted/50 border-b px-2 pt-1 text-[10px]"
                  >
                    {new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                    }).format(withHour(today, hour))}
                  </div>
                );
              })}
            </div>

            {days.map((day) => {
              const key = dateKey(day);
              const timedEvents = timedByDay.get(key) || [];

              return (
                <div
                  key={`timeline-${key}`}
                  className="bg-background/80 relative grid min-h-0 overflow-hidden"
                  style={{
                    gridTemplateRows: `repeat(${slotCount}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: slotCount }, (_, index) => (
                    <div
                      key={`${key}-slot-${index}`}
                      className="border-muted/45 border-b"
                    />
                  ))}

                  {timedEvents.map((event) => {
                    const startMinutes =
                      event.start.getHours() * 60 + event.start.getMinutes();
                    const endMinutes =
                      event.end.getHours() * 60 + event.end.getMinutes();
                    const clampedStart = Math.max(
                      dayStartMinutes,
                      startMinutes,
                    );
                    const clampedEnd = Math.min(
                      dayEndMinutes,
                      Math.max(clampedStart + 30, endMinutes),
                    );
                    const topPercent =
                      ((clampedStart - dayStartMinutes) / totalMinutes) * 100;
                    const heightPercent = Math.max(
                      (30 / totalMinutes) * 100,
                      ((clampedEnd - clampedStart) / totalMinutes) * 100,
                    );
                    const meta = EVENT_TYPE_META[event.type];

                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={cn(
                          "absolute right-1 left-1 rounded-md px-2 py-1 text-left shadow-[inset_0_0_0_1px_hsl(var(--border)/0.28)]",
                          meta.chipClassName,
                        )}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setSelectedDate(day);
                        }}
                      >
                        <p className="truncate text-[11px] font-medium">
                          {event.title}
                        </p>
                        <p className="truncate text-[10px] opacity-80">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </p>
                      </button>
                    );
                  })}

                  {(() => {
                    const nowMinutes = now.getHours() * 60 + now.getMinutes();
                    const nowTopPercent =
                      ((nowMinutes - dayStartMinutes) / totalMinutes) * 100;
                    const showNowIndicator =
                      nowTopPercent >= 0 && nowTopPercent <= 100;

                    if (!showNowIndicator) {
                      return null;
                    }

                    return (
                      <div
                        className="pointer-events-none absolute right-1 left-1 rounded-md border border-dashed border-primary/45"
                        style={{
                          top: `${nowTopPercent}%`,
                        }}
                      />
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = anchorDate.getFullYear();

    const monthEventCounts = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = endOfMonth(monthStart);
      const count = visibleEvents.filter(
        (event) =>
          event.start.getTime() <= monthEnd.getTime() &&
          event.end.getTime() >= monthStart.getTime(),
      ).length;

      return count;
    });

    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid auto-rows-fr grid-cols-1 gap-2 p-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const monthDate = new Date(year, monthIndex, 1);
            const monthDays = buildMonthGrid(monthDate);
            const monthCurrent = monthDate.getMonth();
            const monthCount = monthEventCounts[monthIndex];
            const monthTypeCounts = visibleEvents.reduce(
              (counts, event) => {
                if (
                  event.start.getFullYear() === year &&
                  event.start.getMonth() === monthIndex
                ) {
                  counts[event.type] += 1;
                }
                return counts;
              },
              { task: 0, milestone: 0, workflow: 0, risk: 0 } as Record<
                CalendarEventType,
                number
              >,
            );

            return (
              <button
                key={`year-month-${monthIndex}`}
                type="button"
                className="bg-muted/25 hover:bg-muted/45 flex h-full min-h-[13rem] flex-col rounded-lg p-2.5 text-left transition-colors"
                onClick={() => {
                  setAnchorDate(monthDate);
                  setView("month");
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {YEAR_MONTH_LABELS[monthIndex]}
                  </p>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {monthCount} events
                  </Badge>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day) => {
                    const hasEvents = visibleEvents.some((event) =>
                      intersectsDay(event, day),
                    );
                    const inMonth = day.getMonth() === monthCurrent;

                    return (
                      <div
                        key={`${monthIndex}-${dateKey(day)}`}
                        className={cn(
                          "flex h-6 items-center justify-center rounded text-[10px]",
                          inMonth
                            ? "text-foreground"
                            : "text-muted-foreground/45",
                          hasEvents && inMonth && "bg-primary/10 text-primary",
                        )}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {(Object.keys(EVENT_TYPE_META) as CalendarEventType[]).map(
                    (type) =>
                      monthTypeCounts[type] > 0 ? (
                        <span
                          key={`${monthIndex}-${type}-count`}
                          className="text-muted-foreground inline-flex items-center gap-1 text-[10px]"
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              EVENT_TYPE_META[type].dotClassName,
                            )}
                          />
                          {monthTypeCounts[type]} {EVENT_TYPE_META[type].label}
                        </span>
                      ) : null,
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const renderAgendaView = () => {
    if (!agendaGroups.length) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <Empty className="max-w-lg">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No upcoming items in this range</EmptyTitle>
              <EmptyDescription>
                Expand your filters or move the agenda range to discover more
                events.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }

    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2.5 p-2.5">
          {agendaGroups.map((group) => (
            <section key={group.key} className="bg-muted/20 rounded-lg">
              <header className="bg-accent/40 px-2.5 py-1.5">
                <p className="text-[12px] font-semibold">
                  {formatDayHeading(group.date)}
                </p>
              </header>
              <div className="divide-muted-foreground/10 divide-y">
                {group.events.map((event) => {
                  const meta = EVENT_TYPE_META[event.type];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <span
                        className={cn(
                          "h-6 w-1 rounded-full",
                          meta.laneClassName,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium">
                          {event.title}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {event.projectName} •{" "}
                          {event.allDay
                            ? "All day"
                            : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="h-5 text-[10px]">
                        <Icon className="size-3" />
                        {meta.label}
                      </Badge>
                      <Link
                        href={event.href}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "h-7 text-[11px]",
                        )}
                      >
                        Open
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderTimelineView = () => {
    if (!timelineTaskEvents.length) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <Empty className="max-w-xl">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TimerReset className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No task timeline in this scope</EmptyTitle>
              <EmptyDescription>
                Create tasks with start and due dates to populate the workspace
                timeline.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }

    const msInDay = 24 * 60 * 60 * 1000;
    const minStart = timelineTaskEvents.reduce(
      (lowest, event) =>
        event.start.getTime() < lowest.getTime() ? event.start : lowest,
      timelineTaskEvents[0].start,
    );
    const maxEnd = timelineTaskEvents.reduce(
      (highest, event) =>
        event.end.getTime() > highest.getTime() ? event.end : highest,
      timelineTaskEvents[0].end,
    );
    const timelineStart = startOfDay(minStart);
    const timelineEnd = endOfDay(maxEnd);
    const totalDays = Math.max(
      1,
      Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / msInDay),
    );

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="bg-muted/35 border-border/35 flex items-center justify-between border-b px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Workspace task timeline</p>
            <p className="text-muted-foreground text-[11px]">
              {timelineTaskEvents.length} task
              {timelineTaskEvents.length === 1 ? "" : "s"} ·{" "}
              {formatCompactDate(timelineStart)} -{" "}
              {formatCompactDate(timelineEnd)}
            </p>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1.5 p-2.5">
            {timelineTaskEvents.map((event) => {
              const clampedStart = startOfDay(event.start);
              const clampedEnd = endOfDay(event.end);
              const offsetDays = Math.max(
                0,
                Math.floor(
                  (clampedStart.getTime() - timelineStart.getTime()) / msInDay,
                ),
              );
              const durationDays = Math.max(
                1,
                Math.ceil(
                  (clampedEnd.getTime() - clampedStart.getTime()) / msInDay,
                ),
              );
              const leftPercent = (offsetDays / totalDays) * 100;
              const widthPercent = Math.max(
                (1 / totalDays) * 100,
                (durationDays / totalDays) * 100,
              );
              const isOverdue =
                event.end.getTime() < now.getTime() && event.status !== "done";

              return (
                <button
                  key={`timeline-row-${event.id}`}
                  type="button"
                  className="bg-background/70 hover:bg-accent/40 ring-border/25 grid w-full grid-cols-[minmax(0,18rem)_minmax(0,1fr)] items-center gap-2 rounded-md px-2.5 py-2 text-left ring-1 transition-colors"
                  onClick={() => {
                    setSelectedEventId(event.id);
                    const eventDay = startOfDay(event.start);
                    setSelectedDate(eventDay);
                    setAnchorDate(eventDay);
                    setRightPanelTab("calendar");
                    setView("day");
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">
                      {event.title}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {event.projectName}
                      {event.meta ? ` • ${event.meta}` : ""}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="bg-muted/50 relative h-2 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "absolute top-0 h-full rounded-full",
                          isOverdue ? "bg-rose-500/85" : "bg-sky-500/85",
                        )}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground text-[10.5px]">
                      {formatCompactDate(event.start)} -{" "}
                      {formatCompactDate(event.end)}
                      {isOverdue ? " • Overdue" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 gap-3">
      <aside className="bg-muted/20 ring-border/35 flex w-[19rem] shrink-0 flex-col gap-2.5 rounded-xl p-2.5 ring-1">
        <div className="space-y-1">
          <p className="text-[15px] font-semibold">Calendar</p>
          <p className="text-muted-foreground text-[12px]">
            Plan project timelines, due dates, and daily workload.
          </p>
        </div>

        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search events"
          className="h-8 text-[12px]"
        />

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) {
              return;
            }
            setSelectedDate(startOfDay(nextDate));
            setAnchorDate(startOfDay(nextDate));
          }}
          modifiers={{
            hasEvents: miniCalendarHighlightDays,
          }}
          modifiersClassNames={{
            hasEvents:
              "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
          }}
          className="bg-background/65 w-full rounded-lg p-1.5 [--cell-size:--spacing(6.5)]"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full",
            month_grid: "w-full border-collapse",
            weekdays: "flex w-full",
            weekday:
              "text-[10.5px] text-muted-foreground rounded-md flex-1 text-center font-normal",
          }}
        />
        <p className="text-muted-foreground px-0.5 text-[11px]">
          {selectedDateEvents.length} event
          {selectedDateEvents.length === 1 ? "" : "s"} on{" "}
          {formatCompactDate(selectedDate)}
        </p>

        <div className="bg-background/50 space-y-1.5 rounded-lg p-2">
          <div className="flex items-center gap-1.5">
            <ListFilter className="text-muted-foreground size-3.5" />
            <p className="text-[11.5px] font-semibold uppercase tracking-wide">
              Calendars
            </p>
          </div>
          <div className="space-y-1">
            {(Object.keys(EVENT_TYPE_META) as CalendarEventType[]).map(
              (type) => {
                const meta = EVENT_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    className={cn(
                      "hover:bg-accent/50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]",
                      typeFilters[type] && "bg-accent/55",
                    )}
                    onClick={() => toggleTypeFilter(type)}
                  >
                    <span
                      className={cn("size-2 rounded-full", meta.dotClassName)}
                    />
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">{meta.label}</span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {eventSummary[type]}
                    </Badge>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="bg-background/50 space-y-1.5 rounded-lg p-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide">
            Project
          </p>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
            disabled={isProjectsLoading}
          >
            <SelectTrigger className="bg-background/80 h-8 w-full text-[12.5px]">
              <SelectValue
                placeholder={isProjectsLoading ? "Loading projects..." : "All projects"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-border/35" />

        <div className="min-h-0 flex flex-1 flex-col space-y-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide">
            Upcoming
          </p>
          <ScrollArea className="bg-background/50 min-h-0 flex-1 rounded-lg">
            <div className="space-y-1 p-2">
              {upcomingEvents.length ? (
                upcomingEvents.map((event) => {
                  const meta = EVENT_TYPE_META[event.type];
                  const Icon = meta.icon;
                  const eventDay = startOfDay(event.start);
                  const eventTimeLabel = event.allDay
                    ? `${formatCompactDate(eventDay)} · All day`
                    : `${formatCompactDate(eventDay)} · ${formatTime(event.start)}`;
                  return (
                    <button
                      key={`upcoming-${event.id}`}
                      type="button"
                      className={cn(
                        "bg-background/55 hover:bg-accent/45 ring-border/25 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left ring-1 transition-colors",
                        selectedEventId === event.id &&
                          "bg-accent/50 ring-border/45",
                      )}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setSelectedDate(startOfDay(event.start));
                        setAnchorDate(startOfDay(event.start));
                      }}
                    >
                      <span
                        className={cn(
                          "mt-1 size-2 rounded-full",
                          meta.dotClassName,
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-[12px] font-medium leading-4.5">
                          {event.title}
                        </span>
                        <span className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
                          {event.projectName}
                        </span>
                        <span className="text-muted-foreground mt-0.5 line-clamp-1 text-[10.5px]">
                          {eventTimeLabel} • {meta.label}
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 h-5 shrink-0 gap-1 px-1.5 text-[10px]",
                          meta.chipClassName,
                        )}
                      >
                        <Icon className="size-3" />
                        {meta.label}
                      </Badge>
                    </button>
                  );
                })
              ) : (
                <div className="text-muted-foreground p-3 text-[11px]">
                  No upcoming items.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {selectedEvent ? (
          <div className="bg-background/55 ring-border/35 space-y-2.5 rounded-lg p-2.5 ring-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide">
                Selected event
              </p>
              {selectedEventMeta ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 gap-1 px-1.5 text-[10px]",
                    selectedEventMeta.chipClassName,
                  )}
                >
                  <selectedEventMeta.icon className="size-3" />
                  {selectedEventMeta.label}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="line-clamp-2 text-[13px] font-semibold leading-4.5">
                {selectedEvent.title}
              </p>

              <div className="text-muted-foreground space-y-1 text-[11px]">
                <p className="flex items-center gap-1.5">
                  <Flag className="size-3.5" />
                  <span className="truncate">{selectedEvent.projectName}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  <span className="truncate">
                    {selectedEvent.allDay
                      ? formatDayHeading(selectedEvent.start)
                      : `${formatDayHeading(selectedEvent.start)} · ${formatTime(
                          selectedEvent.start,
                        )} - ${formatTime(selectedEvent.end)}`}
                  </span>
                </p>
                {selectedEvent.meta ? (
                  <p className="truncate text-[10.5px]">{selectedEvent.meta}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => {
                  const day = startOfDay(selectedEvent.start);
                  setSelectedDate(day);
                  setAnchorDate(day);
                  setView("day");
                }}
              >
                Focus day
              </Button>
              <Link
                href={selectedEvent.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-7 text-[11px]",
                )}
              >
                Open item
              </Link>
            </div>
          </div>
        ) : null}
      </aside>

      <section className="bg-muted/15 ring-border/35 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl ring-1">
        <header className="bg-background/65 flex flex-wrap items-center gap-2 px-2.5 py-2">
          {rightPanelTab === "calendar" ? (
            <div className="mr-2 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => navigatePeriod("prev")}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => navigatePeriod("next")}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={resetToToday}
              >
                Today
              </Button>
            </div>
          ) : null}

          <div className="mr-auto">
            <p className="text-sm font-semibold">
              {rightPanelTab === "calendar" ? rangeLabel : "Task timeline"}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {rightPanelTab === "calendar" ? (
                <>
                  {visibleEvents.length} event
                  {visibleEvents.length === 1 ? "" : "s"} in view
                </>
              ) : (
                <>
                  {timelineTaskEvents.length} task
                  {timelineTaskEvents.length === 1 ? "" : "s"} in timeline
                </>
              )}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {rightPanelTab === "calendar" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-[11px]"
                  >
                    <activeViewOption.icon className="size-3.5" />
                    {activeViewOption.label}
                    <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {CALENDAR_VIEW_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = option.value === view;
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setView(option.value)}
                        className="text-[12px]"
                      >
                        <Icon className="size-3.5 text-muted-foreground" />
                        <span className="flex-1">{option.label}</span>
                        {isActive ? <Check className="size-3.5" /> : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Tabs
              value={rightPanelTab}
              onValueChange={(value) =>
                setRightPanelTab(value as "calendar" | "timeline")
              }
              className="gap-0"
            >
              <TabsList className="h-8">
                <TabsTrigger
                  value="calendar"
                  className="h-7 px-2.5 text-[11px] font-medium"
                >
                  Calendar
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="h-7 px-2.5 text-[11px] font-medium"
                >
                  Timeline
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {isProjectsLoading ? (
          <LoaderComponent />
        ) : isProjectsError ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <Empty className="max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Flag className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Unable to load calendar data</EmptyTitle>
                <EmptyDescription>
                  We could not fetch project timelines from the server for this
                  workspace.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : rightPanelTab === "timeline" ? (
          renderTimelineView()
        ) : !hasAnyEvents ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <Empty className="max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Flag className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No project events yet</EmptyTitle>
                <EmptyDescription>
                  Create tasks, milestones, or workflows in projects and they
                  will appear here automatically.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : view === "month" ? (
          renderMonthView()
        ) : view === "week" ? (
          renderWeekOrDayView("week")
        ) : view === "day" ? (
          renderWeekOrDayView("day")
        ) : view === "year" ? (
          renderYearView()
        ) : (
          renderAgendaView()
        )}
      </section>
    </div>
  );
};

export default WorkspaceCalendar;
