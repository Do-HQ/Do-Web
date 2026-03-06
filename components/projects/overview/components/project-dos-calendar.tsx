import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { FlattenedProjectTask, ProjectMember } from "../types";
import {
  formatShortDate,
  getSubtaskProgressLabel,
  getTaskStatusLabel,
  resolveMemberById,
} from "../utils";

type ProjectDosCalendarProps = {
  taskMap: Record<string, FlattenedProjectTask[]>;
  selectedDate: Date | undefined;
  onSelectDate: (value: Date | undefined) => void;
  members: ProjectMember[];
  onEditTask: (workflowId: string, taskId: string) => void;
};

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ProjectDosCalendar({
  taskMap,
  selectedDate,
  onSelectDate,
  members,
  onEditTask,
}: ProjectDosCalendarProps) {
  const taskDates = Object.keys(taskMap)
    .sort()
    .map((key) => new Date(`${key}T00:00:00`));
  const selectedKey = selectedDate ? toDateKey(selectedDate) : undefined;
  const selectedTasks = selectedKey ? taskMap[selectedKey] ?? [] : [];

  return (
    <section className="rounded-xl border border-border/35 bg-card/75 p-3 shadow-xs">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold">Due date planner</div>
            <div className="text-muted-foreground text-[12px] leading-5">
              Select a day to review the tasks due in the current scope.
            </div>
          </div>
          <Badge variant="outline" className="text-[11px]">
            {taskDates.length} active date{taskDates.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="grid gap-3 xl:grid-cols-[20.5rem_minmax(0,1fr)] xl:items-start">
          <div className="mx-auto w-full max-w-[20.5rem] xl:mx-0">
            <div className="rounded-xl border border-border/20 bg-background/90 p-3 shadow-xs">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectDate}
                modifiers={{ hasTasks: taskDates }}
                modifiersClassNames={{
                  hasTasks:
                    "rounded-md bg-primary/8 text-foreground font-medium after:absolute after:bottom-1.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                }}
                showOutsideDays={false}
                className="w-fit [--cell-size:2.55rem] p-2.5"
                classNames={{
                  months: "flex flex-col gap-2",
                  month: "w-full gap-2.5",
                  nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
                  month_caption: "h-(--cell-size) w-full px-(--cell-size)",
                  caption_label: "text-[13px] font-semibold",
                  weekdays: "mt-1 flex",
                  weekday: "flex-1 text-[11px] text-muted-foreground",
                  week: "mt-1.5 flex w-full",
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/20 bg-background/70 p-3">
            <div>
              <div className="text-[13px] font-semibold">Selected day</div>
              <div className="text-muted-foreground text-[12px] leading-5">
                {selectedDate
                  ? `${formatShortDate(toDateKey(selectedDate))} • ${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"}`
                  : "Choose a day on the calendar to inspect due work."}
              </div>
            </div>

            {selectedTasks.length ? (
              <ScrollArea className="mt-3 max-h-[20rem] pr-2">
                <div className="space-y-2.5">
                  {selectedTasks.map((task) => {
                    const assignee = resolveMemberById(members, task.assigneeId);

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onEditTask(task.workflowId, task.id)}
                        className="w-full rounded-xl border border-border/20 bg-background/90 px-3 py-2.5 text-left transition-colors hover:bg-muted/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="truncate text-[13px] font-medium leading-5">{task.title}</div>
                            <div className="text-muted-foreground text-[12px] leading-5">
                              {task.workflowName} • {assignee?.name ?? "Unassigned"}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[11px]">
                            {getTaskStatusLabel(task.status)}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-2 text-[12px] leading-5">
                          {getSubtaskProgressLabel(task)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-muted-foreground mt-3 rounded-xl border border-dashed border-border/20 bg-background/60 px-3 py-4 text-[12px] leading-5">
                No due tasks for the selected day.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
