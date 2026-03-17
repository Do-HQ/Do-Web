"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { AiCreateMode, AiCreateSheetShell } from "@/components/shared/ai-create-sheet";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import useWorkspaceTemplate from "@/hooks/use-workspace-template";
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

const PIPELINE_OPTIONS: { value: ProjectPipelineTemplateKey; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
];

type CreateProjectSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTemplateId?: string;
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

export function CreateProjectSheet({
  open,
  onOpenChange,
  initialTemplateId,
}: CreateProjectSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const upsertProjectRecord = useProjectStore((state) => state.upsertProjectRecord);
  const { useCreateWorkspaceProject } = useWorkspaceProject();
  const { useWorkspaceTemplates, useApplyWorkspaceTemplate } = useWorkspaceTemplate();

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
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [autoAppliedTemplateId, setAutoAppliedTemplateId] = useState("");
  const [templatePanelOpen, setTemplatePanelOpen] = useState(true);

  const templatesQuery = useWorkspaceTemplates(
    workspaceId ?? "",
    {
      page: 1,
      limit: 100,
      kind: "project",
      search: "",
      archived: false,
    },
    {
      enabled: Boolean(workspaceId) && open,
    },
  );

  const projectTemplates = templatesQuery.data?.data?.templates ?? [];
  const selectedTemplate = projectTemplates.find(
    (template) => template.id === selectedTemplateId,
  );
  const selectedTemplatePlaceholders = useMemo(
    () => selectedTemplate?.placeholders ?? [],
    [selectedTemplate?.placeholders],
  );

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

  const applyTemplateMutation = useApplyWorkspaceTemplate({
    onSuccess: (response) => {
      const resolved = response.data.resolvedTemplate as {
        nameTemplate?: string;
        summaryTemplate?: string;
        status?: ProjectStatus;
        initialPipelineTemplate?: ProjectPipelineTemplateKey;
        startOffsetDays?: number;
        durationDays?: number;
      };

      const today = new Date().toISOString().slice(0, 10);
      const nextStartDate = addDays(
        today,
        Number.isFinite(Number(resolved?.startOffsetDays))
          ? Number(resolved.startOffsetDays)
          : 0,
      );
      const nextDuration = Math.max(
        1,
        Number.isFinite(Number(resolved?.durationDays))
          ? Number(resolved.durationDays)
          : 21,
      );

      setName(String(resolved?.nameTemplate || "").trim());
      setSummary(String(resolved?.summaryTemplate || "").trim());
      setStatus(
        STATUS_OPTIONS.some((option) => option.value === resolved?.status)
          ? (resolved.status as ProjectStatus)
          : "on-track",
      );
      setInitialPipelineTemplate(
        PIPELINE_OPTIONS.some(
          (option) => option.value === resolved?.initialPipelineTemplate,
        )
          ? (resolved.initialPipelineTemplate as ProjectPipelineTemplateKey)
          : "product",
      );
      setStartDate(nextStartDate);
      setTargetEndDate(addDays(nextStartDate, nextDuration));
      setMode("manual");
      setDraftReady(true);
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

  useEffect(() => {
    if (!open) {
      setAutoAppliedTemplateId("");
      return;
    }

    if (!initialTemplateId) {
      return;
    }

    setSelectedTemplateId(initialTemplateId);

    if (!workspaceId || autoAppliedTemplateId === initialTemplateId) {
      return;
    }

    setAutoAppliedTemplateId(initialTemplateId);
    applyTemplateMutation.mutate({
      workspaceId,
      templateId: initialTemplateId,
      payload: {
        variables: {},
      },
    });
  }, [
    applyTemplateMutation,
    autoAppliedTemplateId,
    initialTemplateId,
    open,
    workspaceId,
  ]);

  useEffect(() => {
    if (!selectedTemplatePlaceholders.length) {
      setTemplateVariables({});
      return;
    }

    setTemplateVariables((current) => {
      const next: Record<string, string> = {};

      selectedTemplatePlaceholders.forEach((placeholder) => {
        next[placeholder] = current[placeholder] ?? "";
      });

      return next;
    });
  }, [selectedTemplatePlaceholders]);

  useEffect(() => {
    if (!open) {
      setTemplatePanelOpen(true);
      return;
    }

    if (selectedTemplateId) {
      setTemplatePanelOpen(true);
    }
  }, [open, selectedTemplateId]);

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

  const handleApplySelectedTemplate = () => {
    if (!workspaceId || !selectedTemplateId) {
      return;
    }

    applyTemplateMutation.mutate({
      workspaceId,
      templateId: selectedTemplateId,
      payload: {
        variables: templateVariables,
      },
    });
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
      description="Draft the project from a prompt, apply a template, then review and submit."
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
            loading={createWorkspaceProjectMutation.isPending}
            disabled={
              !name.trim() ||
              !startDate ||
              !targetEndDate ||
              !workspaceId ||
              createWorkspaceProjectMutation.isPending
            }
          >
            Create project
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Collapsible
          open={templatePanelOpen}
          onOpenChange={setTemplatePanelOpen}
          className="px-0 py-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/45"
              >
                <div>
                  <div className="text-[12px] font-semibold">Use template</div>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-5">
                    Select a saved project template and apply placeholder values.
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${templatePanelOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-2.5 space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-2">
                <Label>Project template</Label>
                <Select
                  value={selectedTemplateId || "none"}
                  onValueChange={(value) => setSelectedTemplateId(value === "none" ? "" : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {projectTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="sm:min-w-[7.5rem]"
                loading={applyTemplateMutation.isPending}
                disabled={!selectedTemplateId || applyTemplateMutation.isPending}
                onClick={handleApplySelectedTemplate}
              >
                Apply
              </Button>
            </div>

            {selectedTemplatePlaceholders.length ? (
              <div className="rounded-lg border border-border/30 bg-background/60 p-2.5">
                <div className="mb-2 text-[11px] font-medium">Template variables</div>
                <div className="grid gap-2">
                  {selectedTemplatePlaceholders.map((placeholder) => (
                    <div
                      key={placeholder}
                      className="grid gap-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center"
                    >
                      <Label className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                        {`{{${placeholder}}}`}
                      </Label>
                      <Input
                        value={templateVariables[placeholder] ?? ""}
                        onChange={(event) =>
                          setTemplateVariables((current) => ({
                            ...current,
                            [placeholder]: event.target.value,
                          }))
                        }
                        placeholder={`Value for ${placeholder}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>

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
                  {PIPELINE_OPTIONS.map((option) => (
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
