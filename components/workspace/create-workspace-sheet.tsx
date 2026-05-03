"use client";

import { useState } from "react";
import { toast } from "sonner";

import { AiCreateMode, AiCreateSheetShell } from "@/components/shared/ai-create-sheet";
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
import { CreateWorkspaceRequestBody } from "@/types/workspace";

type CreateWorkspaceSheetProps = {
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateWorkspaceRequestBody) => void;
};

export function CreateWorkspaceSheet({
  open,
  loading,
  onOpenChange,
  onSubmit,
}: CreateWorkspaceSheetProps) {
  const [mode, setMode] = useState<AiCreateMode>("ai");
  const [prompt, setPrompt] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CreateWorkspaceRequestBody["type"]>("private");
  const { useGenerateWorkspaceAiDraft, useWorkspaceAiStatus } = useWorkspaceAi();
  const generateDraftMutation = useGenerateWorkspaceAiDraft();
  const aiStatusQuery = useWorkspaceAiStatus(undefined, { enabled: open });
  const aiDisabledReason =
    aiStatusQuery.data?.data?.available === false
      ? String(
          aiStatusQuery.data?.data?.disabledReason ||
            aiStatusQuery.data?.data?.reason ||
            "",
        ).trim() || "AI draft generation is unavailable in this environment."
      : "";

  const handleGenerateDraft = async () => {
    if (aiDisabledReason) {
      toast.error(aiDisabledReason);
      return;
    }

    const request = generateDraftMutation.mutateAsync({
      payload: {
        entityType: "workspace",
        description: prompt.trim(),
      },
    });

    await toast.promise(request, {
      loading: "Generating workspace draft...",
      success: "Workspace draft ready to edit.",
      error: (error: Error) => error?.message || "Unable to generate workspace draft.",
    });
    const response = await request;

    const fields = response?.data?.draft?.fields as
      | {
          name?: string;
          type?: string;
        }
      | undefined;
    const nextName = String(fields?.name || "").trim();
    const nextType = String(fields?.type || "").trim();
    setName(nextName || "New Workspace");
    setType(nextType === "public" ? "public" : "private");
    setDraftReady(true);
    setMode("manual");
  };

  return (
    <AiCreateSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create workspace"
      description="Create the workspace from a short prompt, or switch to manual mode and fill it directly."
      mode={mode}
      onModeChange={setMode}
      prompt={prompt}
      onPromptChange={setPrompt}
      onGenerateDraft={handleGenerateDraft}
      canGenerate={Boolean(prompt.trim()) && !aiDisabledReason}
      aiDisabledReason={aiDisabledReason}
      isGeneratingDraft={generateDraftMutation.isPending}
      isDraftReady={draftReady}
      helperExamples={[
        "Create a private workspace for internal mobile delivery",
        "Create a public community workspace for design partners",
      ]}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={loading}
            disabled={!name.trim()}
            onClick={() => onSubmit({ name: name.trim(), type })}
          >
            Create workspace
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Mobile Delivery"
            autoFocus
          />
        </div>

        <div className="grid gap-2">
          <Label>Workspace visibility</Label>
          <Select value={type} onValueChange={(value) => setType(value as CreateWorkspaceRequestBody["type"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private workspace</SelectItem>
              <SelectItem value="public">Public workspace</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AiCreateSheetShell>
  );
}
