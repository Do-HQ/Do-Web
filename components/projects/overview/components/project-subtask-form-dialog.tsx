import { useState } from "react";
import { Sparkles } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ProjectMember,
  ProjectSubtaskEditorValues,
  ProjectTaskStatus,
} from "../types";

type ProjectSubtaskFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  taskName: string;
  members: ProjectMember[];
  initialValues?: Partial<ProjectSubtaskEditorValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectSubtaskEditorValues) => void;
};

const SUBTASK_STATUS_OPTIONS: { value: ProjectTaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

export function ProjectSubtaskFormDialog({
  open,
  mode,
  taskName,
  members,
  initialValues,
  onOpenChange,
  onSubmit,
}: ProjectSubtaskFormDialogProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [status, setStatus] = useState<ProjectTaskStatus>(
    initialValues?.status ?? "todo",
  );
  const [assigneeId, setAssigneeId] = useState(
    initialValues?.assigneeId ?? members[0]?.id ?? "",
  );
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");

  const applyAiDraft = () => {
    setTitle(`AI drafted follow-up for ${taskName}`);
    setStatus("todo");

    const nextStartDate = startDate || new Date().toISOString().slice(0, 10);
    if (!startDate) {
      setStartDate(nextStartDate);
    }

    if (!dueDate) {
      const target = new Date(`${nextStartDate}T00:00:00`);
      target.setDate(target.getDate() + 4);
      setDueDate(target.toISOString().slice(0, 10));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle>
                {mode === "create" ? "Create subtask" : "Edit subtask"}
              </DialogTitle>
              <DialogDescription>
                This rolls up under {taskName}. The AI draft button is a local stand-in for later assisted subtask generation.
              </DialogDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={applyAiDraft}>
              <Sparkles />
              AI draft
            </Button>
          </div>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              title: title.trim(),
              status,
              assigneeId: assigneeId || undefined,
              startDate,
              dueDate,
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="subtask-title">Subtask title</Label>
            <Input
              id="subtask-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Follow-up review"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProjectTaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBTASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subtask-start-date">Start date</Label>
              <Input
                id="subtask-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={dueDate || undefined}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subtask-due-date">Due date</Label>
              <Input
                id="subtask-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                min={startDate || undefined}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Create subtask" : "Save subtask"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
