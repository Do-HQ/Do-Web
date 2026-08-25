"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import useWorkspaceMeetings from "@/hooks/use-workspace-meetings";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceStore from "@/stores/workspace";
import type { EventChecklistTarget, WorkspaceMeeting } from "@/types/meeting";
import { cn } from "@/lib/utils";

type CreateEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the date when opened from a specific day. */
  defaultDate?: Date;
  onCreated?: (meetingId: string) => void;
  /**
   * Pass an event to edit it. The checklist picker is hidden in that case —
   * once an event exists, its checklist is managed where it is shown, from the
   * event detail modal and the task editor.
   */
  event?: WorkspaceMeeting | null;
};

type SelectableTask = EventChecklistTarget & {
  title: string;
  projectName: string;
  workflowName: string;
  isDone: boolean;
};

const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

/**
 * Creates an event — a date the workspace is working towards, optionally with
 * the tasks that have to be finished before it.
 *
 * Tasks are optional on purpose: plenty of events are just a date everyone
 * needs on the calendar.
 */
export function CreateEventDialog({
  open,
  onOpenChange,
  defaultDate,
  onCreated,
  event = null,
}: CreateEventDialogProps) {
  const isEdit = Boolean(event);
  const { workspaceId } = useWorkspaceStore();
  const { useCreateMeeting, useUpdateMeeting } = useWorkspaceMeetings();
  const { useWorkspaceProjects } = useWorkspaceProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateInput(defaultDate ?? new Date()));
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selected, setSelected] = useState<SelectableTask[]>([]);
  const [taskFilter, setTaskFilter] = useState("");

  const createMeeting = useCreateMeeting(workspaceId ?? "");
  const updateMeeting = useUpdateMeeting(
    workspaceId ?? "",
    event?.meetingId ?? "",
  );

  // Seed the form from the event being edited, and re-seed if a different one
  // is opened without the dialog unmounting.
  useEffect(() => {
    if (!open || !event) return;

    const start = event.startAt ? new Date(event.startAt) : new Date();
    const end = event.endAt ? new Date(event.endAt) : start;
    const hhmm = (value: Date) =>
      `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;

    setTitle(event.title ?? "");
    setDescription(event.description ?? "");
    setDate(toDateInput(start));
    setAllDay(Boolean(event.allDay));
    setStartTime(hhmm(start));
    setEndTime(hhmm(end));
  }, [open, event]);

  const projectsQuery = useWorkspaceProjects(open ? (workspaceId ?? "") : "", {
    page: 1,
    limit: 1000,
    search: "",
    archived: false,
  });

  /** Every open task in the workspace, flattened for the picker. */
  const availableTasks = useMemo<SelectableTask[]>(() => {
    const projects = projectsQuery.data?.data?.projects ?? [];
    const rows: SelectableTask[] = [];

    projects.forEach((project) => {
      const record = project?.record;
      (record?.workflows ?? []).forEach((workflow) => {
        if (workflow?.archived) return;
        (workflow?.tasks ?? []).forEach((task) => {
          rows.push({
            projectId: String(project.projectId ?? ""),
            workflowId: String(workflow.id ?? ""),
            taskId: String(task.id ?? ""),
            title: String(task.title ?? "Untitled task"),
            projectName: String(project.name ?? ""),
            workflowName: String(workflow.name ?? ""),
            isDone: String(task.status ?? "") === "done",
          });
        });
      });
    });

    return rows;
  }, [projectsQuery.data?.data?.projects]);

  const filteredTasks = useMemo(() => {
    const needle = taskFilter.trim().toLowerCase();
    if (!needle) return availableTasks.slice(0, 60);
    return availableTasks
      .filter(
        (task) =>
          task.title.toLowerCase().includes(needle) ||
          task.projectName.toLowerCase().includes(needle),
      )
      .slice(0, 60);
  }, [availableTasks, taskFilter]);

  const isSelected = (task: SelectableTask) =>
    selected.some(
      (item) =>
        item.taskId === task.taskId && item.projectId === task.projectId,
    );

  const toggleTask = (task: SelectableTask, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...current, task]
        : current.filter(
            (item) =>
              !(
                item.taskId === task.taskId && item.projectId === task.projectId
              ),
          ),
    );
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setSelected([]);
    setTaskFilter("");
  };

  const submit = async () => {
    if (!workspaceId) return;

    const trimmed = title.trim();
    if (!trimmed) {
      toast("Give the event a name.");
      return;
    }

    const startAt = allDay
      ? new Date(`${date}T00:00:00`)
      : new Date(`${date}T${startTime}:00`);
    const endAt = allDay
      ? new Date(`${date}T23:59:00`)
      : new Date(`${date}T${endTime}:00`);

    if (endAt <= startAt) {
      toast("The end time has to be after the start time.");
      return;
    }

    if (isEdit && event) {
      const request = updateMeeting.mutateAsync({
        title: trimmed,
        description: description.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay,
      });

      toast.promise(request, {
        loading: "Saving event...",
        success: "Event updated",
        error: (error) =>
          error instanceof Error ? error.message : "Could not save the event",
      });

      try {
        await request;
        reset();
        onOpenChange(false);
      } catch {
        // Reported by the toast; the dialog stays open so nothing is lost.
      }
      return;
    }

    const request = createMeeting.mutateAsync({
      title: trimmed,
      description: description.trim(),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      kind: "event",
      allDay,
      inviteeUserIds: [],
      checklist: selected.map(({ projectId, workflowId, taskId }) => ({
        projectId,
        workflowId,
        taskId,
      })),
    });

    toast.promise(request, {
      loading: "Creating event...",
      success: () =>
        selected.length
          ? `Event created with ${selected.length} task${selected.length === 1 ? "" : "s"}`
          : "Event created",
      error: (error) =>
        error instanceof Error ? error.message : "Could not create the event",
    });

    try {
      const created = await request;
      reset();
      onOpenChange(false);
      onCreated?.(created.data.meeting.meetingId);
    } catch {
      // Reported by the toast; the dialog stays open so nothing is lost.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            {/* <CalendarCheck className="size-4" /> */}
            {isEdit ? "Edit event" : "New event"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change the name, date, or timing. The checklist is managed from the event itself."
              : "A date the workspace is working towards. Add the tasks that need to be done first, or leave it as a date on the calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-3 overflow-x-hidden overflow-y-auto px-5 py-4">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="event-title">Name</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q3 launch"
              autoFocus
            />
          </div>

          <div className="grid min-w-0 gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <Checkbox
                  checked={allDay}
                  onCheckedChange={(v) => setAllDay(Boolean(v))}
                />
                All day
              </label>
            </div>
          </div>

          {!allDay ? (
            <div className="grid min-w-0 grid-cols-2 gap-3">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="event-start">Starts</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="event-end">Ends</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {isEdit ? null : (
            <div className="grid min-w-0 gap-2">
              <div className="flex items-center justify-between">
                <Label>Checklist</Label>
                <span className="text-muted-foreground text-[11px]">
                  {selected.length ? `${selected.length} selected` : "Optional"}
                </span>
              </div>
              <Input
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                placeholder="Search tasks"
                className="h-8"
              />
              <div className="border-border/50 h-44 w-full overflow-x-hidden overflow-y-auto rounded-md border">
                <div className="p-1 ">
                  {projectsQuery.isPending ? (
                    <p className="text-muted-foreground p-3 text-[12px]">
                      Loading tasks…
                    </p>
                  ) : filteredTasks.length ? (
                    filteredTasks.map((task) => (
                      <label
                        key={`${task.projectId}-${task.taskId}`}
                        className={cn(
                          "hover:bg-muted/60 flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5",
                          task.isDone && "opacity-60",
                        )}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={isSelected(task)}
                          onCheckedChange={(v) => toggleTask(task, Boolean(v))}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium">
                            {task.title}
                          </span>
                          <span className="text-muted-foreground block truncate text-[11px]">
                            {task.projectName} · {task.workflowName}
                            {task.isDone ? " · done" : ""}
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground p-3 text-[12px]">
                      {taskFilter
                        ? "No tasks match that search."
                        : "No open tasks in this workspace yet."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/50 px-5 py-3.5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={createMeeting.isPending || updateMeeting.isPending}
          >
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
