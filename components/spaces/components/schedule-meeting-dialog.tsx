"use client";

import { useState, useMemo } from "react";
import { Bell, CalendarClock, Check, Clock, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import useWorkspace from "@/hooks/use-workspace";
import type { CreateMeetingPayload } from "@/types/meeting";

type MemberOption = { id: string; name: string; email: string };

const REMINDER_OPTIONS = [
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1 day", value: 1440 },
];

const DEFAULT_REMINDER_MINUTES = [30, 10];

const localDatetimeValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const roundUpToNext30 = (date: Date) => {
  const ms = 30 * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
};

const reminderLabel = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  if (mins === 60) return "1h";
  if (mins < 1440) return `${mins / 60}h`;
  return `${mins / 1440}d`;
};

const AddPeopleDialog = ({
  open,
  workspaceId,
  currentUserId,
  selectedIds,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  workspaceId: string;
  currentUserId: string;
  selectedIds: string[];
  onOpenChange: (v: boolean) => void;
  onConfirm: (ids: string[], members: MemberOption[]) => void;
}) => {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const debouncedSearch = useDebounce(search, 300);

  const workspaceHook = useWorkspace();
  const peopleQuery = workspaceHook.useWorkspacePeople(workspaceId, {
    page: 1,
    limit: 20,
    search: debouncedSearch,
  });

  const members: MemberOption[] = useMemo(() => {
    const raw = peopleQuery.data?.data?.members ?? [];
    return raw
      .filter((m) => String(m?.userId?._id || "") !== currentUserId)
      .map((m) => ({
        id: String(m.userId._id),
        name:
          `${m.userId.firstName || ""} ${m.userId.lastName || ""}`.trim() ||
          m.userId.email ||
          "Unknown",
        email: String(m.userId.email || ""),
      }));
  }, [peopleQuery.data, currentUserId]);

  const toggle = (id: string) =>
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const handleOpen = (v: boolean) => {
    if (v) setDraft(selectedIds);
    else setSearch("");
    onOpenChange(v);
  };

  const handleConfirm = () => {
    const selected = members.filter((m) => draft.includes(m.id));
    // Keep any previously selected members not in current search results
    const selectedMap = new Map(selected.map((m) => [m.id, m]));
    onConfirm(draft, Array.from(selectedMap.values()));
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="border-b px-5 pt-5 pb-4">
          <DialogTitle>Add people</DialogTitle>
          <DialogDescription>
            Search and select workspace members to invite.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              autoFocus
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
          {peopleQuery.isPending && (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">
              Searching…
            </p>
          )}
          {!peopleQuery.isPending && members.length === 0 && (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">
              No members found.
            </p>
          )}
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left"
            >
              <Checkbox
                checked={draft.includes(member.id)}
                className="pointer-events-none"
                onCheckedChange={() => {}}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {member.email}
                </p>
              </div>
              {draft.includes(member.id) && (
                <Check className="text-primary ml-auto size-3.5 shrink-0" />
              )}
            </button>
          ))}
        </ScrollArea>

        <DialogFooter className="border-t px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => handleOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Confirm{draft.length > 0 ? ` (${draft.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Sub-dialog: Reminders ───────────────────────────────────────────────────

const RemindersDialog = ({
  open,
  value,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  value: number[];
  onOpenChange: (v: boolean) => void;
  onConfirm: (mins: number[]) => void;
}) => {
  const [draft, setDraft] = useState<number[]>(value);

  const toggle = (mins: number) =>
    setDraft((prev) =>
      prev.includes(mins)
        ? prev.filter((m) => m !== mins)
        : [...prev, mins].sort((a, b) => b - a),
    );

  const handleOpen = (v: boolean) => {
    if (v) setDraft(value);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Email reminders</DialogTitle>
          <DialogDescription>
            Choose when to send reminder emails before the meeting starts. A
            "starting now" email is always sent at meeting time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-1">
          {REMINDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                draft.includes(opt.value)
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {draft.includes(opt.value) && <Check className="size-3" />}
              {opt.label} before
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => handleOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onConfirm(draft);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main dialog ──────────────────────────────────────────────────────────────

type ScheduleMeetingDialogProps = {
  open: boolean;
  workspaceId: string;
  currentUserId: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateMeetingPayload) => void;
};

const ScheduleMeetingDialog = ({
  open,
  workspaceId,
  currentUserId,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ScheduleMeetingDialogProps) => {
  const defaultStart = roundUpToNext30(new Date());
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(localDatetimeValue(defaultStart));
  const [endAt, setEndAt] = useState(localDatetimeValue(defaultEnd));
  const [reminderMinutes, setReminderMinutes] = useState<number[]>(
    DEFAULT_REMINDER_MINUTES,
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);

  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    const s = roundUpToNext30(new Date());
    setStartAt(localDatetimeValue(s));
    setEndAt(localDatetimeValue(new Date(s.getTime() + 60 * 60 * 1000)));
    setReminderMinutes(DEFAULT_REMINDER_MINUTES);
    setSelectedMemberIds([]);
    setSelectedMembers([]);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = () => {
    if (!title.trim() || !startAt || !endAt) return;
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (endDate <= startDate) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      inviteeUserIds: selectedMemberIds,
      reminderMinutes,
    });
  };

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(startAt) &&
    Boolean(endAt) &&
    new Date(endAt) > new Date(startAt) &&
    !isSubmitting;

  const reminderSummary =
    reminderMinutes.length === 0
      ? "None"
      : reminderMinutes
          .slice()
          .sort((a, b) => b - a)
          .map(reminderLabel)
          .join(", ") + " before";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-5 py-4">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base">
                Schedule a meeting
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="mtg-title">Title *</Label>
              <Input
                id="mtg-title"
                autoFocus
                placeholder="e.g. Weekly sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="mtg-desc">Description</Label>
              <Textarea
                id="mtg-desc"
                placeholder="Agenda or notes for attendees…"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
              />
            </div>

            {/* Date & time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="mtg-start"
                  className="flex items-center gap-1 text-xs"
                >
                  <Clock className="size-3" />
                  Start *
                </Label>
                <Input
                  id="mtg-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => {
                    setStartAt(e.target.value);
                    if (e.target.value) {
                      const s = new Date(e.target.value);
                      if (new Date(endAt) <= s) {
                        setEndAt(
                          localDatetimeValue(
                            new Date(s.getTime() + 60 * 60 * 1000),
                          ),
                        );
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="mtg-end"
                  className="flex items-center gap-1 text-xs"
                >
                  <Clock className="size-3" />
                  End *
                </Label>
                <Input
                  id="mtg-end"
                  type="datetime-local"
                  value={endAt}
                  min={startAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>

            {/* Sub-action buttons */}
            <div className="space-y-2 pt-1">
              {/* People */}
              <button
                type="button"
                onClick={() => setIsPeopleOpen(true)}
                className="border-border hover:bg-accent flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
              >
                <Users className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {selectedMemberIds.length === 0
                      ? "Add people"
                      : `${selectedMemberIds.length} person${selectedMemberIds.length === 1 ? "" : "s"} invited`}
                  </p>
                  {selectedMembers.length > 0 && (
                    <p className="text-muted-foreground truncate text-xs">
                      {selectedMembers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                </div>
                {selectedMemberIds.length > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {selectedMemberIds.length}
                  </Badge>
                )}
              </button>

              {/* Reminders */}
              <button
                type="button"
                onClick={() => setIsRemindersOpen(true)}
                className="border-border hover:bg-accent flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
              >
                <Bell className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Email reminders</p>
                  <p className="text-muted-foreground text-xs">
                    {reminderSummary}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="border-t px-5 py-3.5">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-dialog: Add people */}
      <AddPeopleDialog
        open={isPeopleOpen}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        selectedIds={selectedMemberIds}
        onOpenChange={setIsPeopleOpen}
        onConfirm={(ids, members) => {
          setSelectedMemberIds(ids);
          setSelectedMembers(members);
        }}
      />

      {/* Sub-dialog: Reminders */}
      <RemindersDialog
        open={isRemindersOpen}
        value={reminderMinutes}
        onOpenChange={setIsRemindersOpen}
        onConfirm={setReminderMinutes}
      />
    </>
  );
};

export default ScheduleMeetingDialog;
