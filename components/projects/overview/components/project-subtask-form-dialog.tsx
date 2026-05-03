import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useWorkspaceAi from "@/hooks/use-workspace-ai";
import useWorkspaceStore from "@/stores/workspace";

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
  const { workspaceId } = useWorkspaceStore();
  const { useGenerateWorkspaceAiDraft, useWorkspaceAiStatus } = useWorkspaceAi();
  const generateDraftMutation = useGenerateWorkspaceAiDraft();
  const aiStatusQuery = useWorkspaceAiStatus(workspaceId || undefined, {
    enabled: open,
  });
  const aiDisabledReason =
    aiStatusQuery.data?.data?.available === false
      ? String(
          aiStatusQuery.data?.data?.disabledReason ||
            aiStatusQuery.data?.data?.reason ||
            "",
        ).trim() || "AI draft generation is unavailable in this environment."
      : "";
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<ProjectTaskStatus>(
    initialValues?.status ?? "todo",
  );
  const [assigneeId, setAssigneeId] = useState(
    initialValues?.assigneeId ?? members[0]?.id ?? "",
  );
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");

  const applyAiDraft = async () => {
    if (aiDisabledReason) {
      toast.error(aiDisabledReason);
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast("Describe the subtask draft you want first.");
      return;
    }

    const request = generateDraftMutation.mutateAsync({
      workspaceId: workspaceId || undefined,
      payload: {
        entityType: "subtask",
        description: trimmedPrompt,
        context: {
          taskName,
          startDate,
          dueDate,
          members: members.map((member) => ({ id: member.id, label: member.name })),
        },
      },
    });

    await toast.promise(request, {
      loading: "Generating subtask draft...",
      success: "Subtask draft ready to edit.",
      error: (error: Error) => error?.message || "Unable to generate subtask draft.",
    });
    const response = await request;

    const fields = response?.data?.draft?.fields as
      | {
          title?: string;
          status?: string;
          assigneeId?: string;
          startDate?: string;
          dueDate?: string;
        }
      | undefined;

    setTitle(String(fields?.title || "").trim() || `Follow-up for ${taskName}`);
    setStatus(
      SUBTASK_STATUS_OPTIONS.some((option) => option.value === fields?.status)
        ? (fields?.status as ProjectTaskStatus)
        : "todo",
    );

    if (fields?.assigneeId && members.some((member) => member.id === fields.assigneeId)) {
      setAssigneeId(fields.assigneeId);
    }

    const nextStartDate =
      String(fields?.startDate || "").trim() || startDate || new Date().toISOString().slice(0, 10);
    setStartDate(nextStartDate);
    setDueDate(String(fields?.dueDate || "").trim() || dueDate || nextStartDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="space-y-3 pr-6">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle>
                {mode === "create" ? "Create subtask" : "Edit subtask"}
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={generateDraftMutation.isPending}
                disabled={Boolean(aiDisabledReason)}
                onClick={() => {
                  void applyAiDraft();
                }}
              >
                <Sparkles />
                AI draft
              </Button>
            </div>
              <DialogDescription>
                This rolls up under {taskName}. Generate a subtask draft, then edit details before saving.
              </DialogDescription>
            <div className="rounded-xl border border-border/40 bg-card p-3">
              <Label htmlFor="subtask-ai-prompt" className="mb-2 block text-[12px] font-medium">
                Describe the subtask you want
              </Label>
              <Textarea
                id="subtask-ai-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-20"
                placeholder="Create a QA follow-up subtask for regression checks before release"
              />
              {aiDisabledReason ? (
                <p className="mt-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                  {aiDisabledReason}
                </p>
              ) : null}
            </div>
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
