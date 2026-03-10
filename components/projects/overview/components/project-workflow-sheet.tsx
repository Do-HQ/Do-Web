"use client";

import { useState } from "react";

import {
  AiCreateMode,
  AiCreateSheetShell,
} from "@/components/shared/ai-create-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ProjectTeamSummary, ProjectWorkflowEditorValues } from "../types";

type ProjectWorkflowSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  teams: ProjectTeamSummary[];
  initialValues?: Partial<ProjectWorkflowEditorValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectWorkflowEditorValues) => void;
};

export function ProjectWorkflowSheet({
  open,
  mode,
  teams,
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
  const [teamId, setTeamId] = useState(initialValues?.teamId ?? teams[0]?.id ?? "");

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
      teamId,
    });
  };

  return (
    <AiCreateSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Create workflow" : "Edit workflow"}
      description="Workflows are lightweight. Set a workflow name and owning team. Timeline/progress are inferred from tasks under the workflow."
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
          <Button type="button" onClick={handleSubmit} disabled={!name.trim() || !teamId}>
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

        <div className="grid gap-2">
          <Label htmlFor="workflow-team">Workflow team</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="workflow-team" className="w-full">
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

        <div className="rounded-xl border border-border/20 bg-muted/10 px-3 py-3 text-[12px] leading-5 text-muted-foreground">
          The assigned workflow team becomes the default team context for new tasks in this workflow.
        </div>
      </div>
    </AiCreateSheetShell>
  );
}
