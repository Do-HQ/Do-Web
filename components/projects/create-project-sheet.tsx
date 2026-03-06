"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

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
import { Textarea } from "@/components/ui/textarea";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import { getProjectRoute } from "@/utils/constants";

import {
  ProjectEditorValues,
  ProjectPipelineTemplateKey,
  ProjectStatus,
} from "./overview/types";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "on-track", label: "On track" },
  { value: "at-risk", label: "At risk" },
  { value: "paused", label: "Paused" },
];

const TEMPLATE_OPTIONS: { value: ProjectPipelineTemplateKey; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
];

type CreateProjectSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function addDays(baseDate: string, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function extractProjectName(prompt: string) {
  const normalized = prompt.trim();

  if (!normalized) {
    return "";
  }

  const stripped = normalized
    .replace(/^create\s+/i, "")
    .replace(/^a\s+/i, "")
    .replace(/^an\s+/i, "")
    .replace(/\s+project.*$/i, "")
    .trim();

  return stripped || normalized;
}

export function CreateProjectSheet({ open, onOpenChange }: CreateProjectSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const upsertProjectRecord = useProjectStore((state) => state.upsertProjectRecord);
  const { useCreateWorkspaceProject } = useWorkspaceProject();
  const [mode, setMode] = useState<AiCreateMode>("ai");
  const [prompt, setPrompt] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("on-track");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEndDate] = useState(
    addDays(new Date().toISOString().slice(0, 10), 21),
  );
  const [initialPipelineTemplate, setInitialPipelineTemplate] =
    useState<ProjectPipelineTemplateKey>("product");

  const createWorkspaceProjectMutation = useCreateWorkspaceProject({
    onSuccess: (response, variables) => {
      const createdProject = response.data.project;

      if (createdProject?.record) {
        upsertProjectRecord(createdProject.record);
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-projects", variables.workspaceId],
      });

      onOpenChange(false);
      router.push(getProjectRoute(createdProject.projectId));
    },
  });

  const helperExamples = useMemo(
    () => [
      "Create a mobile banking app project for Q2 launch",
      "Create a growth launch project for a new campaign",
      "Create an operations rollout project for support automation",
    ],
    [],
  );

  const handleGenerateDraft = () => {
    const nextName = extractProjectName(prompt) || "New Project";
    const normalized = prompt.toLowerCase();

    setName(
      nextName
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    );
    setSummary(
      normalized.includes("launch")
        ? "AI drafted a launch-oriented project scaffold with a clear delivery range."
        : "AI drafted a compact project scaffold from your prompt.",
    );
    setStatus(normalized.includes("risk") ? "at-risk" : "on-track");
    setInitialPipelineTemplate(
      normalized.includes("market")
        ? "marketing"
        : normalized.includes("ops") || normalized.includes("operation")
          ? "operations"
          : "product",
    );
    setDraftReady(true);
  };

  const handleSubmit = () => {
    const values: ProjectEditorValues = {
      name: name.trim(),
      summary: summary.trim(),
      emoji: "",
      status,
      startDate,
      targetEndDate,
      initialPipelineTemplate,
    };

    if (!workspaceId) {
      return;
    }

    createWorkspaceProjectMutation.mutate({
      workspaceId,
      payload: {
        name: values.name,
        summary: values.summary,
        status: values.status,
        startDate: values.startDate,
        targetEndDate: values.targetEndDate,
        initialPipelineTemplate: values.initialPipelineTemplate,
        },
    });
  };

  return (
    <AiCreateSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create project"
      description="Draft the project from a prompt, then review and submit. Manual mode is always available."
      mode={mode}
      onModeChange={setMode}
      prompt={prompt}
      onPromptChange={setPrompt}
      onGenerateDraft={handleGenerateDraft}
      canGenerate={Boolean(prompt.trim())}
      isDraftReady={draftReady}
      helperExamples={helperExamples}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !name.trim() ||
              !startDate ||
              !targetEndDate ||
              !workspaceId ||
              createWorkspaceProjectMutation.isPending
            }
          >
            {createWorkspaceProjectMutation.isPending ? "Creating..." : "Create project"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Mobile App"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="project-summary">Summary</Label>
          <Textarea
            id="project-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="min-h-24"
          />
        </div>

        <div className="rounded-xl border border-border/20 bg-muted/10 px-3 py-3">
          <div className="mb-3 text-[12px] font-medium">Project setup</div>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Pipeline template</Label>
              <Select
                value={initialPipelineTemplate}
                onValueChange={(value) =>
                  setInitialPipelineTemplate(value as ProjectPipelineTemplateKey)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="project-start">Start date</Label>
            <Input
              id="project-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="project-end">Target end</Label>
            <Input
              id="project-end"
              type="date"
              value={targetEndDate}
              onChange={(event) => setTargetEndDate(event.target.value)}
            />
          </div>
        </div>

      </div>
    </AiCreateSheetShell>
  );
}
