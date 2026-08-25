"use client";

import { Check, CircleDashed, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import useWorkspaceMeetings from "@/hooks/use-workspace-meetings";
import useWorkspaceStore from "@/stores/workspace";
import { cn } from "@/lib/utils";

type EventChecklistPanelProps = {
  meetingId: string;
  /** Rows shown before the list is truncated into "view all". */
  maxRows?: number;
  onViewAll?: () => void;
};

/**
 * The checklist for one event, resolved against live task data.
 *
 * Status is never edited here — it is owned by the task. This panel reflects it
 * and lets someone remove a task from the checklist, which does not touch the
 * task itself.
 */
export function EventChecklistPanel({
  meetingId,
  maxRows = 3,
  onViewAll,
}: EventChecklistPanelProps) {
  const { workspaceId } = useWorkspaceStore();
  const { useMeeting, useRemoveEventChecklistItem } = useWorkspaceMeetings();

  const meetingQuery = useMeeting(workspaceId ?? "", meetingId, {
    enabled: Boolean(workspaceId && meetingId),
  });
  const removeItem = useRemoveEventChecklistItem(workspaceId ?? "", meetingId);

  const meeting = meetingQuery.data?.data?.meeting;
  const items = meeting?.checklistItems ?? [];
  const progress = meeting?.checklistProgress;

  if (meetingQuery.isPending) {
    return (
      <p className="text-muted-foreground px-0.5 py-2 text-[11px]">
        Loading checklist…
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="text-muted-foreground px-0.5 py-2 text-[11px] leading-4">
        No tasks tied to this event yet. Pick it in the Event field when you
        create a task.
      </p>
    );
  }

  const percent = progress?.percent ?? 0;
  // The sidebar is a narrow, shared column — a long checklist has nowhere to
  // go here, so it is capped and the rest lives in the detail modal.
  const visibleItems = items.slice(0, maxRows);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-semibold tracking-wide uppercase">
          Checklist
        </p>
        <span
          className={cn(
            "text-[11px] font-medium tabular-nums",
            progress?.isComplete ? "text-emerald-600" : "text-muted-foreground",
          )}
        >
          {progress?.done ?? 0}/{progress?.total ?? 0}
        </span>
      </div>

      {/* Progress is the one number people scan for, so it gets a bar. */}
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
            progress?.isComplete ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="w-full overflow-x-hidden">
        <ul className="space-y-0.5 pr-1">
          {visibleItems.map((item) => (
            <li
              key={item.linkId}
              className="group hover:bg-muted/50 flex items-start gap-2 rounded-sm px-1 py-1.5"
            >
              {item.isDone ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              ) : (
                <CircleDashed className="text-muted-foreground/70 mt-0.5 size-3.5 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-[12px] leading-4",
                    item.isDone && "text-muted-foreground line-through",
                  )}
                >
                  {item.title}
                </p>
                <p className="text-muted-foreground truncate text-[10.5px] leading-4">
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
                className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
                <Trash2 className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {hiddenCount > 0 || onViewAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-6 w-full justify-start px-1 text-[11px]"
          onClick={onViewAll}
        >
          {hiddenCount > 0 ? `View all ${items.length} tasks` : "View details"}
        </Button>
      ) : null}
    </div>
  );
}
