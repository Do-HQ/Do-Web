"use client";

import { useState } from "react";

import {
  AiCreateMode,
  AiCreateSheetShell,
} from "@/components/shared/ai-create-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ProjectWorkflowEditorValues } from "../types";

type ProjectWorkflowSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<ProjectWorkflowEditorValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectWorkflowEditorValues) => void;
};

export function ProjectWorkflowSheet({
  open,
  mode,
  initialValues,
  onOpenChange,
  onSubmit,
}: ProjectWorkflowSheetProps) {
  const [createMode, setCreateMode] = useState<AiCreateMode>(
    mode === "edit" ? "manual" : "ai",
  );
  const [prompt, setPrompt] = useState("");
  const [draftReady, setDraftReady] = useState(mode === "edit");
  const [name, setName] = useState(initialValues?.name ?? "");

  const handleGenerateDraft = () => {
    const normalized = prompt.toLowerCase();

    setName(
      normalized.includes("design")
        ? "Design"
        : normalized.includes("launch")
          ? "Launch"
          : normalized.includes("qa")
            ? "QA"
            : normalized.includes("development")
              ? "Development"
              : "Execution phase",
    );
    setDraftReady(true);
  };

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
    });
  };

  return (
    <AiCreateSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Create workflow" : "Edit workflow"}
      description="Workflows are name-first. Team, scope, progress, and timeline are inferred from the project context and the tasks created under the workflow."
      mode={createMode}
      onModeChange={setCreateMode}
      prompt={prompt}
      onPromptChange={setPrompt}
      onGenerateDraft={handleGenerateDraft}
      canGenerate={Boolean(prompt.trim())}
      isDraftReady={draftReady}
      helperExamples={[
        "Create a design workflow for onboarding",
        "Create a QA workflow for store submission",
      ]}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim()}>
            {mode === "create" ? "Create workflow" : "Save workflow"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="workflow-name">Workflow name</Label>
          <Input
            id="workflow-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Design"
          />
        </div>

        <div className="rounded-xl border border-border/20 bg-muted/10 px-3 py-3 text-[12px] leading-5 text-muted-foreground">
          This workflow will inherit its initial scope from the current project. Its timeline and progress will be derived automatically from the tasks added under it.
        </div>
      </div>
    </AiCreateSheetShell>
  );
}
