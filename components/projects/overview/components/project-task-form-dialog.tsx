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
  ProjectPipelineSummary,
  ProjectTaskEditorValues,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectTeamSummary,
} from "../types";

type ProjectTaskFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  workflowName: string;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  pipelines: ProjectPipelineSummary[];
  initialValues?: Partial<ProjectTaskEditorValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectTaskEditorValues) => void;
};

const TASK_STATUS_OPTIONS: { value: ProjectTaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const TASK_PRIORITY_OPTIONS: { value: ProjectTaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function ProjectTaskFormDialog({
  open,
  mode,
  workflowName,
  members,
  teams,
  pipelines,
  initialValues,
  onOpenChange,
  onSubmit,
}: ProjectTaskFormDialogProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [status, setStatus] = useState<ProjectTaskStatus>(
    initialValues?.status ?? "todo",
  );
  const [priority, setPriority] = useState<ProjectTaskPriority>(
    initialValues?.priority ?? "medium",
  );
  const [assigneeId, setAssigneeId] = useState(
    initialValues?.assigneeId ?? members[0]?.id ?? "",
  );
  const [teamId, setTeamId] = useState(initialValues?.teamId ?? teams[0]?.id ?? "");
  const [pipelineId, setPipelineId] = useState(
    initialValues?.pipelineId ?? pipelines[0]?.id ?? "",
  );
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");

  const applyAiDraft = () => {
    const activePipeline = pipelines.find((item) => item.id === pipelineId) ?? pipelines[0];

    setTitle(
      activePipeline ? `${activePipeline.name} delivery checkpoint` : `${workflowName} task`,
    );
    setStatus("todo");
    setPriority("medium");

    const nextStartDate = startDate || new Date().toISOString().slice(0, 10);
    if (!startDate) {
      setStartDate(nextStartDate);
    }

    if (!dueDate) {
      const target = new Date(`${nextStartDate}T00:00:00`);
      target.setDate(target.getDate() + 7);
      setDueDate(target.toISOString().slice(0, 10));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle>{mode === "create" ? "Create task" : "Edit task"}</DialogTitle>
              <DialogDescription>
                {workflowName} is the parent workflow. The AI draft button is a local stand-in for later assisted task generation.
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
              priority,
              assigneeId: assigneeId || undefined,
              teamId,
              pipelineId,
              startDate,
              dueDate,
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="task-title">Task title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Low fidelity wireframes"
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
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as ProjectTaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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

            <div className="grid gap-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Pipeline</Label>
              <Select value={pipelineId} onValueChange={setPipelineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-start-date">Start date</Label>
              <Input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={dueDate || undefined}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
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
              {mode === "create" ? "Create task" : "Save task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
