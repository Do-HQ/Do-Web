"use client";

import { useState } from "react";
import {
  Check,
  CircleDashed,
  Flag,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useWorkspaceMeetings from "@/hooks/use-workspace-meetings";
import useWorkspaceStore from "@/stores/workspace";
import { cn } from "@/lib/utils";
import type { WorkspaceMeeting } from "@/types/meeting";

type EventDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  /** Hands the loaded event back so the caller can open it in the edit form. */
  onEdit?: (event: WorkspaceMeeting) => void;
};

const formatWhen = (
  start: string | null,
  end: string | null,
  allDay: boolean,
) => {
  if (!start) return "";

  const startDate = new Date(start);
  const day = startDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (allDay || !end) return `${day} · All day`;

  const time = (value: string) =>
    new Date(value).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  return `${day} · ${time(start)} – ${time(end)}`;
};

export function EventDetailDialog({
  open,
  onOpenChange,
  meetingId,
  onEdit,
}: EventDetailDialogProps) {
  const { workspaceId } = useWorkspaceStore();
  const { useMeeting, useRemoveEventChecklistItem, useCancelMeeting } =
    useWorkspaceMeetings();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meetingQuery = useMeeting(workspaceId ?? "", meetingId, {
    enabled: open && Boolean(workspaceId && meetingId),
  });
  const removeItem = useRemoveEventChecklistItem(workspaceId ?? "", meetingId);
  const cancelMeeting = useCancelMeeting(workspaceId ?? "");

  const meeting = meetingQuery.data?.data?.meeting;
  const items = meeting?.checklistItems ?? [];
  const progress = meeting?.checklistProgress;
  const percent = progress?.percent ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-5 py-4">
          <DialogTitle className="pr-6 text-left text-[16px] leading-6">
            {meeting?.title || (meetingQuery.isPending ? "Loading…" : "Event")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {meeting
              ? formatWhen(meeting.startAt, meeting.endAt, meeting.allDay)
              : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-4 overflow-x-hidden overflow-y-auto px-5 pb-5">
          {meeting?.description ? (
            <p className="text-muted-foreground text-[13px] leading-5">
              {meeting.description}
            </p>
          ) : null}

          {meeting?.location ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{meeting.location}</span>
            </p>
          ) : null}

          {meeting?.organizer?.name ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <Flag className="size-3.5 shrink-0" />
              <span className="truncate">
                Created by {meeting.organizer.name}
              </span>
            </p>
          ) : null}

          <div className="grid min-w-0 gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11.5px] font-semibold tracking-wide uppercase">
                Checklist
              </p>
              {progress?.total ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-[10px] tabular-nums",
                    progress.isComplete &&
                      "border-emerald-500/40 text-emerald-600",
                  )}
                >
                  {progress.done}/{progress.total}
                </Badge>
              ) : null}
            </div>

            {progress?.total ? (
              <div
                className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Checklist progress"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    progress.isComplete ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}

            {meetingQuery.isPending ? (
              <p className="text-muted-foreground py-2 text-[12px]">
                Loading checklist…
              </p>
            ) : items.length ? (
              <ul className="min-w-0 divide-y divide-border/40">
                {items.map((item) => (
                  <li
                    key={item.linkId}
                    className="group flex min-w-0 items-start gap-2.5 py-2"
                  >
                    {item.isDone ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <CircleDashed className="text-muted-foreground/70 mt-0.5 size-4 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13px] leading-5 break-words",
                          item.isDone && "text-muted-foreground line-through",
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-muted-foreground truncate text-[11.5px] leading-4">
                        {item.parentTaskTitle
                          ? `${item.parentTaskTitle} · ${item.projectName}`
                          : `${item.projectName} · ${item.workflowName}`}
                        {item.isArchived ? " · archived" : ""}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.title} from this event`}
                      className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      disabled={removeItem.isPending}
                      onClick={() =>
                        toast.promise(removeItem.mutateAsync(item.linkId), {
                          loading: "Removing from checklist...",
                          success: "Removed from checklist",
                          error: (error) =>
                            error instanceof Error
                              ? error.message
                              : "Could not remove that task",
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground py-2 text-[12.5px] leading-5">
                No tasks tied to this event yet. Pick it in the Event field when
                you create a task.
              </p>
            )}
          </div>
        </div>

        {meeting ? (
          <DialogFooter className="border-border/50 shrink-0 gap-2 border-t px-5 py-3.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                onEdit?.(meeting);
                onOpenChange(false);
              }}
            >
              <Pencil className="size-3.5" />
              Edit event
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="text-foreground font-medium">
                {meeting?.title}
              </span>
              ? It will be removed from the calendar and from Google Calendar.
              The tasks on its checklist are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cancelMeeting.isPending}
              onClick={async () => {
                const request = cancelMeeting.mutateAsync(meetingId);

                toast.promise(request, {
                  loading: "Deleting event...",
                  success: "Event deleted",
                  error: (error) =>
                    error instanceof Error
                      ? error.message
                      : "Could not delete the event",
                });

                try {
                  await request;
                  setConfirmDelete(false);
                  onOpenChange(false);
                } catch {
                  // Reported by the toast; the confirm stays open to retry.
                }
              }}
            >
              Delete event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
