"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import useWorkspaceAi from "@/hooks/use-workspace-ai";
import useWorkspaceStore from "@/stores/workspace";

import {
  ProjectTeamSummary,
  ProjectWorkflow,
  ProjectWorkflowEditorValues,
} from "../types";

type ProjectWorkflowSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  teams: ProjectTeamSummary[];
  existingWorkflows?: ProjectWorkflow[];
  initialValues?: Partial<ProjectWorkflowEditorValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectWorkflowEditorValues) => void;
};

export function ProjectWorkflowSheet({
  open,
  mode,
  teams,
  existingWorkflows = [],
  initialValues,
  onOpenChange,
  onSubmit,
}: ProjectWorkflowSheetProps) {
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
  const [createMode, setCreateMode] = useState<AiCreateMode>(
    mode === "edit" ? "manual" : "ai",
  );
  const [prompt, setPrompt] = useState("");
  const [draftReady, setDraftReady] = useState(mode === "edit");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [teamId, setTeamId] = useState(initialValues?.teamId ?? teams[0]?.id ?? "");

  const handleGenerateDraft = async () => {
    if (aiDisabledReason) {
      toast.error(aiDisabledReason);
      return;
    }

    const request = generateDraftMutation.mutateAsync({
      workspaceId: workspaceId || undefined,
      payload: {
        entityType: "workflow",
        description: prompt.trim(),
        context: {
          workflowName: name,
          teams: teams.map((team) => ({ id: team.id, label: team.name })),
          existingWorkflows: existingWorkflows
            .filter((workflow) => !workflow.archived)
            .map((workflow) => ({
              id: workflow.id,
              label: workflow.name,
            })),
        },
      },
    });

    await toast.promise(request, {
      loading: "Generating workflow draft...",
      success: "Workflow draft ready to edit.",
      error: (error: Error) => error?.message || "Unable to generate workflow draft.",
    });
    const response = await request;

    const fields = response?.data?.draft?.fields as
      | {
          name?: string;
          teamId?: string;
        }
      | undefined;

    setName(String(fields?.name || "").trim() || "Execution");
    if (
      fields?.teamId &&
      teams.some((teamOption) => teamOption.id === fields.teamId)
    ) {
      setTeamId(fields.teamId);
    }
    setDraftReady(true);
    setCreateMode("manual");
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
      description="Workflows are lightweight. In AI mode we use your existing workflow order to suggest the next logical stage, then you can edit before saving."
      mode={createMode}
      onModeChange={setCreateMode}
      prompt={prompt}
      onPromptChange={setPrompt}
      onGenerateDraft={handleGenerateDraft}
      canGenerate={Boolean(prompt.trim()) && !aiDisabledReason}
      aiDisabledReason={aiDisabledReason}
      isGeneratingDraft={generateDraftMutation.isPending}
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
