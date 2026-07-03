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
import useWorkspaceMeetings from "@/hooks/use-workspace-meetings";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import type { WorkspaceProjectRecord } from "@/types/project";
import LoaderComponent from "../shared/loader";
import { useDebounce } from "@/hooks/use-debounce";

type CalendarView = "month" | "week" | "day" | "year" | "agenda";
type CalendarEventType = "task" | "milestone" | "workflow" | "risk" | "meeting";

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
  meeting: {
    label: "Meetings",
    icon: CalendarClock,
    dotClassName: "bg-teal-500",
    chipClassName:
      "border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300",
    laneClassName: "bg-teal-500/85",
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
  meeting: true,
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
    meeting: 0,
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

  const { useMeetingsList } = useWorkspaceMeetings();
  const meetingQueryParams = useMemo(
    () => ({ limit: 500, status: "scheduled" as const }),
    [],
  );
  const meetingsQuery = useMeetingsList(workspaceId ?? "", meetingQueryParams, {
    enabled: Boolean(workspaceId),
  });
  const meetingEvents = useMemo<WorkspaceCalendarEvent[]>(() => {
    const meetings = meetingsQuery.data?.data?.meetings ?? [];
    return meetings
      .filter((m) => m.startAt && m.endAt)
      .map((m) => ({
        id: `meeting-${m.meetingId}`,
        projectId: "",
        projectName: "",
        title: m.title,
        type: "meeting" as const,
        status: m.status,
        start: new Date(m.startAt),
        end: new Date(m.endAt),
        allDay: false,
        href: m.spaceRoomId ? `/spaces?room=${m.spaceRoomId}` : "/spaces",
        meta: m.location || m.description || "",
      }));
  }, [meetingsQuery.data?.data?.meetings]);

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
  const [expandedAllDayKeys, setExpandedAllDayKeys] = useState<string[]>([]);
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
    () => [...toWorkspaceCalendarEvents(records), ...meetingEvents],
    [records, meetingEvents],
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

  // Debounce
  const debouncedSearch = useDebounce(searchTerm, 500);

  const visibleEvents = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    return allEvents.filter((event) => {
      if (!typeFilters[event.type]) {
        return false;
      }

      if (
        selectedProjectId !== "all" &&
        event.type !== "meeting" &&
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
  }, [allEvents, debouncedSearch, selectedProjectId, typeFilters]);

  const timelineTaskEvents = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();

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
  }, [allEvents, debouncedSearch, selectedProjectId]);

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

  const toggleAllDayExpansion = (key: string) => {
    setExpandedAllDayKeys((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key],
    );
  };

  const focusDayView = (value: Date) => {
    const eventDay = startOfDay(value);
    setSelectedDate(eventDay);
    setAnchorDate(eventDay);
    setView("day");
    setRightPanelTab("calendar");
  };

  const renderEventChip = (event: WorkspaceCalendarEvent, compact = false) => {
    const meta = EVENT_TYPE_META[event.type];
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => {
          setSelectedEventId(event.id);
          focusDayView(event.start);
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
              <span className="sm:hidden">{label.slice(0, 2)}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="h-full min-h-full min-w-[42rem]">
            <div className="bg-muted/20 grid h-full min-h-full grid-cols-7 grid-rows-6 gap-px">
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
                    onClick={() => focusDayView(day)}
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
                          onClick={() => focusDayView(day)}
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
      </div>
    );
  };

  const renderWeekOrDayView = (mode: "week" | "day") => {
    const days = mode === "day" ? [startOfDay(anchorDate)] : weekDays;
    const minW = mode === "week" ? 700 : 360;
    const TIME_COL_W = 52;
    const HOUR_H = 64; // px per hour — drives all positioning
    const slotCount = END_HOUR - START_HOUR;
    const gridH = slotCount * HOUR_H;
    const dayStartMins = START_HOUR * 60;
    const dayEndMins = END_HOUR * 60;

    const allDayByDay = new Map<string, WorkspaceCalendarEvent[]>();
    const timedByDay = new Map<string, WorkspaceCalendarEvent[]>();
    days.forEach((day) => {
      const key = dateKey(day);
      allDayByDay.set(key, sortEvents(visibleEvents.filter((e) => intersectsDay(e, day) && e.allDay)));
      timedByDay.set(key, sortEvents(visibleEvents.filter((e) => intersectsDay(e, day) && !e.allDay)));
    });

    // Cluster-aware overlap layout: non-overlapping events get full column width.
    type EventLayout = {
      event: WorkspaceCalendarEvent;
      col: number;
      totalCols: number;
      top: number;
      height: number;
    };
    const layoutDay = (events: WorkspaceCalendarEvent[]): EventLayout[] => {
      if (!events.length) return [];
      const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
      const result: EventLayout[] = [];
      let i = 0;
      while (i < sorted.length) {
        // Find the boundary of this overlapping cluster
        let clusterEndMins = sorted[i].end.getHours() * 60 + sorted[i].end.getMinutes();
        let j = i + 1;
        while (j < sorted.length) {
          const nextStartMins = sorted[j].start.getHours() * 60 + sorted[j].start.getMinutes();
          if (nextStartMins < clusterEndMins) {
            clusterEndMins = Math.max(clusterEndMins, sorted[j].end.getHours() * 60 + sorted[j].end.getMinutes());
            j++;
          } else break;
        }
        // Assign columns within this cluster
        const cluster = sorted.slice(i, j);
        const colEnds: number[] = [];
        const clusterAssignments: Array<[WorkspaceCalendarEvent, number]> = [];
        for (const ev of cluster) {
          const sMins = Math.max(dayStartMins, ev.start.getHours() * 60 + ev.start.getMinutes());
          const eMins = Math.min(dayEndMins, Math.max(sMins + 30, ev.end.getHours() * 60 + ev.end.getMinutes()));
          let col = colEnds.findIndex((end) => end <= sMins);
          if (col === -1) { col = colEnds.length; colEnds.push(0); }
          colEnds[col] = eMins;
          clusterAssignments.push([ev, col]);
        }
        const numCols = colEnds.length;
        for (const [ev, col] of clusterAssignments) {
          const sMins = Math.max(dayStartMins, ev.start.getHours() * 60 + ev.start.getMinutes());
          const eMins = Math.min(dayEndMins, Math.max(sMins + 30, ev.end.getHours() * 60 + ev.end.getMinutes()));
          result.push({
            event: ev,
            col,
            totalCols: numCols,
            top: ((sMins - dayStartMins) / 60) * HOUR_H,
            height: Math.max(HOUR_H / 2, ((eMins - sMins) / 60) * HOUR_H),
          });
        }
        i = j;
      }
      return result;
    };

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const nowTop = ((nowMins - dayStartMins) / 60) * HOUR_H;
    const showNow = nowMins >= dayStartMins && nowMins < dayEndMins;

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <div style={{ minWidth: minW }}>
            {/* Sticky all-day + column header */}
            <div className="sticky top-0 z-10 border-b border-border/25 bg-card">
              <div
                className="grid"
                style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${days.length}, minmax(0, 1fr))` }}
              >
                <div className="flex items-end justify-end px-2 pb-2 text-[10px] text-muted-foreground">
                  All day
                </div>
                {days.map((day) => {
                  const key = dateKey(day);
                  const expansionKey = `${mode}-${key}`;
                  const allDayEvents = allDayByDay.get(key) || [];
                  const isExpanded = expandedAllDayKeys.includes(expansionKey);
                  const visibleAllDay = isExpanded ? allDayEvents : allDayEvents.slice(0, 2);
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "border-l border-border/20 px-2 py-2",
                        isToday && "bg-primary/[0.04]",
                      )}
                    >
                      <div className="mb-1.5 flex items-center gap-1.5">
                        {mode === "week" ? (
                          <>
                            <span className="text-[10.5px] font-medium text-muted-foreground">
                              {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                            </span>
                            <button
                              type="button"
                              onClick={() => focusDayView(day)}
                              className={cn(
                                "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                                isToday
                                  ? "bg-primary text-primary-foreground"
                                  : "text-foreground/75 hover:bg-muted",
                              )}
                            >
                              {day.getDate()}
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[12px] font-semibold">
                              {formatDayHeading(day)}
                            </span>
                            {isToday ? (
                              <Badge className="h-4.5 text-[10px]">Today</Badge>
                            ) : null}
                          </>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {visibleAllDay.map((event) => renderEventChip(event, true))}
                        {allDayEvents.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => toggleAllDayExpansion(expansionKey)}
                            className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                          >
                            {isExpanded ? "Show less" : `+${allDayEvents.length - 2} more`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time grid */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${days.length}, minmax(0, 1fr))` }}
            >
              {/* Hour labels */}
              <div
                className="relative border-r border-border/20"
                style={{ height: gridH }}
              >
                {Array.from({ length: slotCount }, (_, i) => {
                  const hour = START_HOUR + i;
                  return (
                    <div
                      key={hour}
                      className="absolute flex w-full items-start justify-end pr-2 text-[10px] text-muted-foreground"
                      style={{ top: i * HOUR_H, height: HOUR_H }}
                    >
                      <span className="-mt-2">
                        {new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(
                          withHour(today, hour),
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {days.map((day) => {
                const key = dateKey(day);
                const isToday = isSameDay(day, today);
                const layouts = layoutDay(timedByDay.get(key) || []);
                return (
                  <div
                    key={`col-${key}`}
                    className={cn(
                      "relative border-l border-border/20",
                      isToday && "bg-primary/[0.025]",
                    )}
                    style={{ height: gridH }}
                  >
                    {/* Hour lines */}
                    {Array.from({ length: slotCount }, (_, i) => (
                      <div
                        key={`hr-${i}`}
                        className="pointer-events-none absolute inset-x-0 border-t border-border/20"
                        style={{ top: i * HOUR_H }}
                      />
                    ))}
                    {/* Half-hour lines */}
                    {Array.from({ length: slotCount }, (_, i) => (
                      <div
                        key={`hf-${i}`}
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/10"
                        style={{ top: i * HOUR_H + HOUR_H / 2 }}
                      />
                    ))}

                    {/* Now indicator — today's column only */}
                    {showNow && isToday ? (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                        style={{ top: nowTop - 1 }}
                      >
                        <span className="-ml-[3px] size-[6px] shrink-0 rounded-full bg-primary" />
                        <div className="h-0.5 flex-1 bg-primary opacity-70" />
                      </div>
                    ) : null}

                    {/* Events */}
                    {layouts.map(({ event, col, totalCols, top, height }) => {
                      const meta = EVENT_TYPE_META[event.type];
                      const GAP = 2;
                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={cn(
                            "absolute overflow-hidden rounded-md px-2 py-1 text-left shadow-[inset_0_0_0_1px_hsl(var(--border)/0.22)] transition-opacity hover:opacity-90",
                            meta.chipClassName,
                          )}
                          style={{
                            top,
                            height,
                            left: `calc(${(col / totalCols) * 100}% + ${GAP}px)`,
                            width: `calc(${(1 / totalCols) * 100}% - ${GAP * 2}px)`,
                          }}
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setSelectedDate(day);
                          }}
                        >
                          <p className="truncate text-[11px] font-medium leading-4">
                            {event.title}
                          </p>
                          {height >= HOUR_H / 2 + 14 ? (
                            <p className="truncate text-[10px] opacity-75">
                              {formatTime(event.start)} – {formatTime(event.end)}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
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
      return visibleEvents.filter(
        (event) =>
          event.start.getTime() <= monthEnd.getTime() &&
          event.end.getTime() >= monthStart.getTime(),
      ).length;
    });

    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const monthDate = new Date(year, monthIndex, 1);
            const monthDays = buildMonthGrid(monthDate);
            const monthCurrent = monthDate.getMonth();
            const monthCount = monthEventCounts[monthIndex];
            const isCurrentMonth =
              monthIndex === today.getMonth() && year === today.getFullYear();
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
                className={cn(
                  "flex flex-col rounded-lg p-2.5 text-left transition-colors",
                  isCurrentMonth
                    ? "bg-primary/[0.05] ring-1 ring-primary/25 hover:bg-primary/[0.08]"
                    : "bg-muted/25 hover:bg-muted/40",
                )}
                onClick={() => {
                  setAnchorDate(monthDate);
                  setView("month");
                }}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <p className={cn(
                    "text-[13px] font-semibold",
                    isCurrentMonth && "text-primary",
                  )}>
                    {YEAR_MONTH_LABELS[monthIndex]}
                  </p>
                  {monthCount > 0 ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4.5 text-[10px]",
                        isCurrentMonth && "border-primary/30 text-primary",
                      )}
                    >
                      {monthCount}
                    </Badge>
                  ) : null}
                </div>

                {/* Weekday labels */}
                <div className="mb-0.5 grid grid-cols-7">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="text-center text-[9px] font-medium text-muted-foreground/60"
                    >
                      {label[0]}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-y-0.5">
                  {monthDays.map((day) => {
                    const dayEvents = visibleEvents.filter((event) =>
                      intersectsDay(event, day),
                    );
                    const inMonth = day.getMonth() === monthCurrent;
                    const isDayToday = isSameDay(day, today);
                    return (
                      <div
                        key={`${monthIndex}-${dateKey(day)}`}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full text-[9px]",
                            !inMonth && "text-muted-foreground/30",
                            inMonth && !isDayToday && "text-foreground/75",
                            isDayToday &&
                              "bg-primary text-primary-foreground font-semibold",
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {inMonth && dayEvents.length > 0 ? (
                          <div className="flex gap-px">
                            {dayEvents.slice(0, 3).map((ev, di) => (
                              <span
                                key={di}
                                className={cn(
                                  "size-[3px] rounded-full",
                                  EVENT_TYPE_META[ev.type].dotClassName,
                                )}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-[3px]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Type breakdown */}
                {monthCount > 0 ? (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
                    {(Object.keys(EVENT_TYPE_META) as CalendarEventType[]).map(
                      (type) =>
                        monthTypeCounts[type] > 0 ? (
                          <span
                            key={`${monthIndex}-${type}-count`}
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
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
                ) : null}
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
        <div className="space-y-1.5 p-2.5">
          {agendaGroups.map((group) => {
            const isGroupToday = isSameDay(group.date, today);
            return (
              <section key={group.key} className="rounded-lg overflow-hidden border border-border/20">
                <button
                  type="button"
                  onClick={() => focusDayView(group.date)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-accent/50",
                    isGroupToday
                      ? "bg-primary/[0.07]"
                      : "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "text-[12px] font-semibold",
                      isGroupToday && "text-primary",
                    )}
                  >
                    {formatDayHeading(group.date)}
                  </span>
                  {isGroupToday ? (
                    <Badge className="h-4.5 text-[10px]">Today</Badge>
                  ) : null}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {group.events.length} item{group.events.length === 1 ? "" : "s"}
                  </span>
                </button>
                <div className="divide-y divide-border/15">
                  {group.events.map((event) => {
                    const meta = EVENT_TYPE_META[event.type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/25"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          focusDayView(event.start);
                        }}
                      >
                        <span
                          className={cn(
                            "h-6 w-1 shrink-0 rounded-full",
                            meta.laneClassName,
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">
                            {event.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {event.projectName}
                            {event.allDay
                              ? " · All day"
                              : ` · ${formatTime(event.start)} – ${formatTime(event.end)}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="h-5 shrink-0 text-[10px]">
                          <Icon className="size-3" />
                          {meta.label}
                        </Badge>
                        <Link
                          href={event.href}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 shrink-0 text-[11px]",
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open
                        </Link>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
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

    // ── Layout constants ─────────────────────────────────────────────────────
    const LABEL_W = 220;
    const ROW_H = 48;
    const MONTH_H = 22;
    const DATE_H = 26;
    const HDR_H = MONTH_H + DATE_H;
    const BAR_H = 24;
    const PAD = 2;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const _daysBetween = (a: Date, b: Date) =>
      Math.round(
        (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
      );

    const _pxPerDay = (n: number) =>
      n <= 21 ? 48 : n <= 45 ? 32 : n <= 90 ? 20 : n <= 180 ? 12 : 8;

    const _tickStep = (n: number) =>
      n <= 21 ? 1 : n <= 90 ? 7 : n <= 180 ? 14 : 30;

    // ── Window ───────────────────────────────────────────────────────────────
    const minDate = timelineTaskEvents.reduce(
      (m, e) => (e.start < m ? e.start : m),
      timelineTaskEvents[0].start,
    );
    const maxDate = timelineTaskEvents.reduce(
      (m, e) => (e.end > m ? e.end : m),
      timelineTaskEvents[0].end,
    );
    const winStart = startOfDay(addDays(minDate, -PAD));
    const winEnd = startOfDay(addDays(maxDate, PAD));
    const totalDays = Math.max(1, _daysBetween(winStart, winEnd) + 1);
    const pxPerDay = _pxPerDay(totalDays);
    const stepDays = _tickStep(totalDays);
    const chartWidth = totalDays * pxPerDay;
    const totalWidth = LABEL_W + chartWidth;

    // ── Month segments (two-row header) ──────────────────────────────────────
    const months: Array<{ label: string; left: number; width: number }> = [];
    {
      let d = 0;
      while (d < totalDays) {
        const date = addDays(winStart, d);
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        const nextD = Math.min(_daysBetween(winStart, nextMonth), totalDays);
        const label = new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
        }).format(date);
        months.push({
          label,
          left: d * pxPerDay,
          width: (nextD - d) * pxPerDay,
        });
        d = nextD;
      }
    }

    // ── Tick marks ───────────────────────────────────────────────────────────
    const ticks: Array<{
      label: string;
      left: number;
      isMonthBoundary: boolean;
    }> = [];
    for (let d = 0; d < totalDays; d += stepDays) {
      const date = addDays(winStart, d);
      const label =
        stepDays >= 28
          ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
            }).format(date)
          : String(date.getDate());
      ticks.push({
        label,
        left: d * pxPerDay,
        isMonthBoundary: date.getDate() === 1,
      });
    }

    // ── Today ────────────────────────────────────────────────────────────────
    const todayIdx = _daysBetween(winStart, startOfDay(now));
    const todayLeft =
      todayIdx >= 0 && todayIdx < totalDays ? todayIdx * pxPerDay : null;

    // ── Bar positions ─────────────────────────────────────────────────────────
    const rows = timelineTaskEvents.map((event) => {
      const startDay = Math.max(0, _daysBetween(winStart, event.start));
      const endDay = Math.min(
        totalDays - 1,
        _daysBetween(winStart, event.end),
      );
      const durDays = Math.max(1, endDay - startDay + 1);
      const barLeft = startDay * pxPerDay;
      const barWidth = Math.max(pxPerDay, durDays * pxPerDay);
      const isOverdue =
        event.end.getTime() < now.getTime() && event.status !== "done";
      const barColor = isOverdue
        ? "bg-rose-500/80"
        : EVENT_TYPE_META[event.type].laneClassName;
      return { event, barLeft, barWidth, barColor };
    });

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <div style={{ minWidth: totalWidth, position: "relative" }}>
            {/* ── Header ───────────────────────────────────────────────── */}
            <div
              className="sticky top-0 z-20 flex border-b border-border/25 bg-card"
              style={{ height: HDR_H }}
            >
              {/* Intersection cell — sticky both ways */}
              <div
                className="sticky left-0 z-30 flex items-end border-r border-border/25 bg-card px-3 pb-2"
                style={{ width: LABEL_W, minWidth: LABEL_W }}
              >
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  Task
                </span>
              </div>

              {/* Timeline header */}
              <div className="relative flex-1" style={{ height: HDR_H }}>
                {/* Month row */}
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 flex items-center overflow-hidden border-r border-border/20 px-2"
                    style={{ left: m.left, width: m.width, height: MONTH_H }}
                  >
                    <span className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80">
                      {m.label}
                    </span>
                  </div>
                ))}

                {/* Date ticks */}
                {ticks.map((tick, i) => (
                  <div key={i}>
                    <div
                      className={cn(
                        "pointer-events-none absolute bottom-0",
                        tick.isMonthBoundary
                          ? "border-l border-border/40"
                          : "border-l border-border/20",
                      )}
                      style={{ left: tick.left, top: MONTH_H }}
                    />
                    <div
                      className={cn(
                        "absolute flex items-center",
                        tick.isMonthBoundary
                          ? "text-foreground/65"
                          : "text-muted-foreground/80",
                      )}
                      style={{
                        left: tick.left + 4,
                        top: MONTH_H,
                        height: DATE_H,
                      }}
                    >
                      <span className="text-[10px] font-medium">
                        {tick.label}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Today line in header */}
                {todayLeft !== null ? (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-primary/50"
                    style={{ left: todayLeft }}
                  />
                ) : null}
              </div>
            </div>

            {/* ── Task rows ────────────────────────────────────────────── */}
            {rows.map(({ event, barLeft, barWidth, barColor }) => (
              <button
                key={`tl-${event.id}`}
                type="button"
                className="group flex w-full cursor-pointer border-b border-border/12 text-left hover:bg-muted/10"
                style={{ height: ROW_H }}
                onClick={() => {
                  setSelectedEventId(event.id);
                  const eventDay = startOfDay(event.start);
                  setSelectedDate(eventDay);
                  setAnchorDate(eventDay);
                  setRightPanelTab("calendar");
                  setView("day");
                }}
              >
                {/* Sticky label cell */}
                <div
                  className="sticky left-0 z-10 flex min-w-0 flex-col justify-center border-r border-border/20 bg-card px-3"
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                >
                  <div className="truncate text-[12px] font-medium leading-5">
                    {event.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="max-w-[8rem] truncate">
                      {event.projectName}
                    </span>
                    {event.meta ? (
                      <>
                        <span className="text-border/60">·</span>
                        <span className="truncate">{event.meta}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Timeline cell */}
                <div className="relative flex-1" style={{ height: ROW_H }}>
                  {/* Grid lines */}
                  {ticks.map((tick, i) => (
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

                  {/* Today line */}
                  {todayLeft !== null ? (
                    <div
                      className="pointer-events-none absolute inset-y-2 w-0.5 rounded-full bg-primary/35"
                      style={{ left: todayLeft }}
                    />
                  ) : null}

                  {/* Bar */}
                  <div
                    className={cn(
                      "pointer-events-none absolute top-1/2 -translate-y-1/2 flex items-center overflow-hidden rounded-sm group-hover:brightness-110",
                      barColor,
                    )}
                    style={{ left: barLeft, width: barWidth, height: BAR_H }}
                  >
                    {barWidth > 56 ? (
                      <span className="truncate px-2 text-[10.5px] font-medium text-white/90">
                        {event.title}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}

            {/* ── Today badge at bottom ────────────────────────────────── */}
            {todayLeft !== null ? (
              <div
                className="pointer-events-none absolute bottom-0 z-10"
                style={{ left: LABEL_W + todayLeft - 16 }}
              >
                <span className="rounded-t-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  Today
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      data-tour="calendar-shell"
      className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 max-lg:flex-col max-lg:overflow-auto"
    >
      <aside
        data-tour="calendar-sidebar"
        className="bg-muted/20 ring-border/35 flex w-full shrink-0 flex-col gap-2.5 rounded-xl p-2.5 ring-1 lg:w-[19rem] max-lg:order-2 max-lg:max-h-[44dvh] max-lg:overflow-y-auto"
      >
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
            focusDayView(nextDate);
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
                placeholder={
                  isProjectsLoading ? <LoaderComponent /> : "All projects"
                }
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

        <div
          data-tour="calendar-upcoming"
          className="min-h-0 flex flex-1 flex-col space-y-2"
        >
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

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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

      <section
        data-tour="calendar-surface"
        className="bg-muted/15 ring-border/35 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl ring-1 max-lg:order-1 max-lg:min-h-[56dvh]"
      >
        <header className="bg-background/65 flex flex-wrap items-center gap-2 px-2.5 py-2 max-md:items-start">
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

          <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {rightPanelTab === "calendar" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-tour="calendar-view-switch"
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
