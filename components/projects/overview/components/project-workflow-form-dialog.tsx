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

import { ProjectWorkflowEditorValues } from "../types";

type ProjectWorkflowFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<ProjectWorkflowEditorValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectWorkflowEditorValues) => void;
};

export function ProjectWorkflowFormDialog({
  open,
  mode,
  initialValues,
  onOpenChange,
  onSubmit,
}: ProjectWorkflowFormDialogProps) {
  const [name, setName] = useState(initialValues?.name ?? "");

  const applyAiDraft = () => {
    setName((current) => current || "Execution phase");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle>
                {mode === "create" ? "Create workflow" : "Edit workflow"}
              </DialogTitle>
              <DialogDescription>
                Workflows are name-first. Team, timeline, and progress are inferred from the project context and the tasks created under the workflow.
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
              name: name.trim(),
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="workflow-name">Workflow name</Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Design"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Create workflow" : "Save workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
