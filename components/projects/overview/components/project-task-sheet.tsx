"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChartNoAxesColumn,
  CheckCheck,
  ChevronDown,
  Loader,
  LucideIcon,
  Plus,
  ShieldAlert,
  SquareCheckBig,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceAi from "@/hooks/use-workspace-ai";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import useWorkspaceTemplate from "@/hooks/use-workspace-template";

import {
  ProjectKanbanSection,
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTaskDraftSubtask,
  ProjectTaskEditorValues,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectTeamSummary,
} from "../types";
import { getDerivedTaskStatusFromSubtasks, getTaskStatusLabel } from "../utils";

type ProjectTaskDependencyOption = {
  id: string;
  title: string;
  workflowId: string;
  workflowName: string;
};

type ProjectTaskSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  workflowId: string;
  workflowName: string;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  pipelines: ProjectPipelineSummary[];
  sections: ProjectKanbanSection[];
  dependencyOptions: ProjectTaskDependencyOption[];
  currentTaskId?: string;
  initialValues?: Partial<ProjectTaskEditorValues>;
  initiallyExpandSubtasks?: boolean;
  seedBlankSubtask?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectTaskEditorValues) => void;
  loading: boolean;
};

const STATUS_OPTIONS: {
  value: ProjectTaskStatus;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "todo", label: "To do", icon: SquareCheckBig },
  { value: "in-progress", label: "In progress", icon: Loader },
  { value: "review", label: "Review", icon: ChartNoAxesColumn },
  { value: "done", label: "Done", icon: CheckCheck },
  { value: "blocked", label: "Blocked", icon: ShieldAlert },
];

const PRIORITY_OPTIONS: { value: ProjectTaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const SECTION_STATUS_PREFIX = "section::";

function addDays(baseDate: string, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildBlankSubtask(
  startDate: string,
  dueDate: string,
  assigneeId?: string,
): ProjectTaskDraftSubtask {
  return {
    title: "",
    status: "todo",
    assigneeId,
    startDate,
    dueDate,
  };
}

export function ProjectTaskSheet({
  open,
  mode,
  workflowId,
  workflowName,
  members,
  teams,
  pipelines,
  sections,
  dependencyOptions,
  currentTaskId,
  initialValues,
  initiallyExpandSubtasks,
  seedBlankSubtask,
  onOpenChange,
  onSubmit,
  loading,
}: ProjectTaskSheetProps) {
  const isCreateMode = mode === "create";
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspacePeople } = useWorkspace();
  const { useGenerateWorkspaceAiDraft, useWorkspaceAiStatus } = useWorkspaceAi();
  const { useWorkspaceTeamDetail } = useWorkspaceTeam();
  const { useWorkspaceTemplates, useApplyWorkspaceTemplate } =
    useWorkspaceTemplate();
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
  const getProjectScopedAssignableMembers = useCallback(
    (nextTeamId: string) => {
      const team = teams.find((item) => item.id === nextTeamId);

      if (!team) {
        return members;
      }

      const scopedMembers = members.filter(
        (member) =>
          team.memberIds.includes(member.id) ||
          member.teamIds.includes(team.id),
      );

      return scopedMembers.length ? scopedMembers : members;
    },
    [members, teams],
  );
  const fallbackTeamId = initialValues?.teamId ?? teams[0]?.id ?? "";
  const initialAssignableMembers =
    getProjectScopedAssignableMembers(fallbackTeamId);
  const initialAssigneeId =
    initialValues?.assigneeId &&
    initialAssignableMembers.some(
      (member) => member.id === initialValues.assigneeId,
    )
      ? initialValues.assigneeId
      : (initialAssignableMembers[0]?.id ?? members[0]?.id ?? "");
  const defaultStartDate =
    initialValues?.startDate ?? new Date().toISOString().slice(0, 10);
  const defaultDueDate = initialValues?.dueDate ?? addDays(defaultStartDate, 7);
  const seededSubtasks = useMemo(() => {
    const nextSubtasks = [...(initialValues?.subtasks ?? [])];

    if (seedBlankSubtask) {
      nextSubtasks.push(
        buildBlankSubtask(
          defaultStartDate,
          defaultDueDate,
          initialValues?.assigneeId,
        ),
      );
    }

    return nextSubtasks;
  }, [
    defaultStartDate,
    defaultDueDate,
    initialValues?.assigneeId,
    initialValues?.subtasks,
    seedBlankSubtask,
  ]);

  const [createMode, setCreateMode] = useState<AiCreateMode>(
    mode === "edit" ? "manual" : "ai",
  );
  const [prompt, setPrompt] = useState("");
  const [draftReady, setDraftReady] = useState(mode === "edit");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [status, setStatus] = useState<ProjectTaskStatus>(
    initialValues?.status ?? "todo",
  );
  const [priority, setPriority] = useState<ProjectTaskPriority>(
    initialValues?.priority ?? "medium",
  );
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId);
  const [teamId, setTeamId] = useState(fallbackTeamId);
  const [pipelineId, setPipelineId] = useState(
    initialValues?.pipelineId ?? pipelines[0]?.id ?? "",
  );
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [sectionId, setSectionId] = useState(initialValues?.sectionId ?? "");
  const [dependencyTaskIds, setDependencyTaskIds] = useState<string[]>(
    initialValues?.dependencyTaskIds ?? [],
  );
  const [subtasksOpen, setSubtasksOpen] = useState(
    Boolean(initiallyExpandSubtasks || seededSubtasks.length),
  );
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [subtasks, setSubtasks] =
    useState<ProjectTaskDraftSubtask[]>(seededSubtasks);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateVariables, setTemplateVariables] = useState<
    Record<string, string>
  >({});
  const derivedStatusFromSubtasks = useMemo(
    () => getDerivedTaskStatusFromSubtasks(subtasks),
    [subtasks],
  );
  const effectiveStatus = derivedStatusFromSubtasks ?? status;
  const statusSelectValue = useMemo(() => {
    const hasSection =
      Boolean(sectionId) && sections.some((item) => item.id === sectionId);
    return hasSection
      ? `${SECTION_STATUS_PREFIX}${sectionId}`
      : effectiveStatus;
  }, [effectiveStatus, sectionId, sections]);
  const canQueryWorkspaceTeam =
    Boolean(workspaceId) && /^[a-fA-F0-9]{24}$/.test(teamId);
  const workspacePeopleQuery = useWorkspacePeople(workspaceId!, {
    page: 1,
    limit: 100,
    search: "",
  });
  const workspaceTeamDetailQuery = useWorkspaceTeamDetail(
    workspaceId!,
    canQueryWorkspaceTeam ? teamId : "",
    {
      page: 1,
      limit: 100,
      search: "",
    },
  );
  const selectedTeamForForm = useMemo(
    () => teams.find((team) => team.id === teamId) ?? null,
    [teamId, teams],
  );
  const selectedPipelineForForm = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === pipelineId) ?? null,
    [pipelineId, pipelines],
  );
  const workspaceMembers = useMemo(() => {
    return (workspacePeopleQuery.data?.data?.members || [])
      .map((member) => {
        const user = member?.userId;
        if (!user?._id) {
          return null;
        }

        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email ||
          "Unknown member";

        return {
          id: String(user._id),
          name,
          teamIds: [],
        };
      })
      .filter(Boolean) as Array<Pick<ProjectMember, "id" | "name" | "teamIds">>;
  }, [workspacePeopleQuery.data]);
  const workspaceTeamMembers = useMemo(() => {
    return (workspaceTeamDetailQuery.data?.data?.members || [])
      .map((member) => {
        const user = member?.userId;
        if (!user?._id) {
          return null;
        }

        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email ||
          "Unknown member";

        return {
          id: String(user._id),
          name,
          teamIds: [teamId],
        };
      })
      .filter(Boolean) as Array<Pick<ProjectMember, "id" | "name" | "teamIds">>;
  }, [teamId, workspaceTeamDetailQuery.data]);
  const availableAssignees = useMemo(() => {
    if (workspaceTeamMembers.length) {
      return workspaceTeamMembers;
    }

    const projectScopedMembers = getProjectScopedAssignableMembers(teamId);
    if (projectScopedMembers.length) {
      return projectScopedMembers;
    }

    if (workspaceMembers.length) {
      return workspaceMembers;
    }

    return members;
  }, [
    getProjectScopedAssignableMembers,
    members,
    teamId,
    workspaceMembers,
    workspaceTeamMembers,
  ]);
  const taskTemplatesQuery = useWorkspaceTemplates(
    workspaceId ?? "",
    {
      page: 1,
      limit: 100,
      kind: "task",
      search: "",
      archived: false,
    },
    {
      enabled: Boolean(workspaceId) && open,
    },
  );
  const taskTemplates = taskTemplatesQuery.data?.data?.templates ?? [];
  const selectedTaskTemplate = taskTemplates.find(
    (template) => template.id === selectedTemplateId,
  );
  const selectedTaskTemplatePlaceholders = useMemo(
    () => selectedTaskTemplate?.placeholders ?? [],
    [selectedTaskTemplate?.placeholders],
  );
  const applyTaskTemplateMutation = useApplyWorkspaceTemplate({
    onSuccess: (response) => {
      const resolved = response.data.resolvedTemplate as {
        titleTemplate?: string;
        status?: ProjectTaskStatus;
        priority?: ProjectTaskPriority;
        startInDays?: number;
        dueInDays?: number;
        sectionId?: string;
        subtasks?: Array<{
          titleTemplate?: string;
          status?: ProjectTaskStatus;
        }>;
      };

      const today = new Date().toISOString().slice(0, 10);
      const nextStartDate = addDays(
        today,
        Number.isFinite(Number(resolved?.startInDays))
          ? Number(resolved.startInDays)
          : 0,
      );
      const nextDueDate = addDays(
        nextStartDate,
        Math.max(
          0,
          Number.isFinite(Number(resolved?.dueInDays))
            ? Number(resolved.dueInDays)
            : 7,
        ),
      );

      setTitle(String(resolved?.titleTemplate || "").trim());
      setStatus(
        STATUS_OPTIONS.some((option) => option.value === resolved?.status)
          ? (resolved.status as ProjectTaskStatus)
          : "todo",
      );
      setPriority(
        PRIORITY_OPTIONS.some((option) => option.value === resolved?.priority)
          ? (resolved.priority as ProjectTaskPriority)
          : "medium",
      );
      setStartDate(nextStartDate);
      setDueDate(nextDueDate);
      setSectionId(String(resolved?.sectionId || "").trim());

      const nextSubtasks = Array.isArray(resolved?.subtasks)
        ? resolved.subtasks
            .map((subtask) => ({
              title: String(subtask?.titleTemplate || "").trim(),
              status: STATUS_OPTIONS.some(
                (option) => option.value === subtask?.status,
              )
                ? (subtask?.status as ProjectTaskStatus)
                : "todo",
              assigneeId: assigneeId || undefined,
              startDate: nextStartDate,
              dueDate: nextDueDate,
            }))
            .filter((subtask) => subtask.title)
        : [];

      if (nextSubtasks.length) {
        setSubtasks(nextSubtasks);
        setSubtasksOpen(true);
      }

      setCreateMode("manual");
      setDraftReady(true);
    },
  });

  useEffect(() => {
    if (!availableAssignees.length) {
      return;
    }

    const currentAssigneeStillValid = availableAssignees.some(
      (member) => member.id === assigneeId,
    );

    if (currentAssigneeStillValid) {
      return;
    }

    setAssigneeId(availableAssignees[0]?.id ?? "");
  }, [assigneeId, availableAssignees]);

  useEffect(() => {
    if (!sectionId) {
      return;
    }

    const stillExists = sections.some((section) => section.id === sectionId);

    if (!stillExists) {
      setSectionId("");
    }
  }, [sectionId, sections]);

  useEffect(() => {
    if (!selectedTaskTemplatePlaceholders.length) {
      setTemplateVariables({});
      return;
    }

    setTemplateVariables((current) => {
      const next: Record<string, string> = {};

      selectedTaskTemplatePlaceholders.forEach((placeholder) => {
        next[placeholder] = current[placeholder] ?? "";
      });

      return next;
    });
  }, [selectedTaskTemplatePlaceholders]);

  useEffect(() => {
    if (!open) {
      setTemplatePanelOpen(false);
      return;
    }

    if (selectedTemplateId && !templatePanelOpen) {
      setTemplatePanelOpen(true);
    }
  }, [open, selectedTemplateId, templatePanelOpen]);

  const handleTeamChange = (nextTeamId: string) => {
    setTeamId(nextTeamId);

    const nextAssignableMembers = getProjectScopedAssignableMembers(nextTeamId);
    const keepCurrentAssignee = nextAssignableMembers.some(
      (member) => member.id === assigneeId,
    );

    if (keepCurrentAssignee) {
      return;
    }

    const nextAssigneeId =
      initialValues?.assigneeId &&
      nextAssignableMembers.some(
        (member) => member.id === initialValues.assigneeId,
      )
        ? initialValues.assigneeId
        : (nextAssignableMembers[0]?.id ?? "");

    setAssigneeId(nextAssigneeId);
  };

  const suggestedAssignee = useMemo(
    () => availableAssignees.find((member) => member.id === assigneeId) ?? null,
    [assigneeId, availableAssignees],
  );
  const visibleDependencyOptions = useMemo(() => {
    const excludedTaskId = String(currentTaskId || "").trim();
    const normalizedOptions = dependencyOptions
      .filter((option) => {
        const optionId = String(option.id || "").trim();
        return optionId && optionId !== excludedTaskId;
      })
      .sort((left, right) => {
        const leftWorkflowPriority = left.workflowId === workflowId ? 0 : 1;
        const rightWorkflowPriority = right.workflowId === workflowId ? 0 : 1;

        if (leftWorkflowPriority !== rightWorkflowPriority) {
          return leftWorkflowPriority - rightWorkflowPriority;
        }

        if (left.workflowName !== right.workflowName) {
          return left.workflowName.localeCompare(right.workflowName);
        }

        return left.title.localeCompare(right.title);
      });

    return normalizedOptions;
  }, [currentTaskId, dependencyOptions, workflowId]);
  const selectedDependencyOptions = useMemo(() => {
    const optionMap = new Map(
      visibleDependencyOptions.map((option) => [option.id, option]),
    );
    return dependencyTaskIds
      .map((taskId) => optionMap.get(taskId))
      .filter(Boolean) as ProjectTaskDependencyOption[];
  }, [dependencyTaskIds, visibleDependencyOptions]);

  const toggleDependencyTask = (taskId: string, checked: boolean | string) => {
    const shouldInclude = checked === true || checked === "indeterminate";
    setDependencyTaskIds((current) => {
      if (shouldInclude) {
        if (current.includes(taskId)) {
          return current;
        }
        return [...current, taskId];
      }

      return current.filter((id) => id !== taskId);
    });
  };

  const handleGenerateDraft = async () => {
    if (aiDisabledReason) {
      toast.error(aiDisabledReason);
      return;
    }

    const request = generateDraftMutation.mutateAsync({
      workspaceId: workspaceId || undefined,
      payload: {
        entityType: "task",
        description: prompt.trim(),
        workflowId,
        context: {
          workflowName,
          startDate,
          dueDate,
          teams: teams.map((team) => ({ id: team.id, label: team.name })),
          members: availableAssignees.map((member) => ({
            id: member.id,
            label: member.name,
          })),
          pipelines: pipelines.map((pipeline) => ({
            id: pipeline.id,
            label: pipeline.name,
          })),
        },
      },
    });

    await toast.promise(request, {
      loading: "Generating task draft...",
      success: "Task draft ready to edit.",
      error: (error: Error) => error?.message || "Unable to generate task draft.",
    });
    const response = await request;

    const fields = response?.data?.draft?.fields as
      | {
          title?: string;
          status?: string;
          priority?: string;
          teamId?: string;
          assigneeId?: string;
          pipelineId?: string;
          startDate?: string;
          dueDate?: string;
          subtasks?: Array<{
            title?: string;
            status?: string;
            assigneeId?: string;
            startDate?: string;
            dueDate?: string;
          }>;
        }
      | undefined;

    setTitle(String(fields?.title || "").trim() || `${workflowName} task`);
    setPriority(
      PRIORITY_OPTIONS.some((option) => option.value === fields?.priority)
        ? (fields?.priority as ProjectTaskPriority)
        : "medium",
    );
    setStatus(
      STATUS_OPTIONS.some((option) => option.value === fields?.status)
        ? (fields?.status as ProjectTaskStatus)
        : "todo",
    );

    const nextTeamId =
      fields?.teamId && teams.some((teamOption) => teamOption.id === fields.teamId)
        ? fields.teamId
        : teamId;
    if (nextTeamId) {
      handleTeamChange(nextTeamId);
    }

    const nextAssigneeId =
      fields?.assigneeId &&
      availableAssignees.some((member) => member.id === fields.assigneeId)
        ? fields.assigneeId
        : assigneeId;
    setAssigneeId(nextAssigneeId);

    if (
      fields?.pipelineId &&
      pipelines.some((pipelineOption) => pipelineOption.id === fields.pipelineId)
    ) {
      setPipelineId(fields.pipelineId);
    }

    const nextStartDate = String(fields?.startDate || "").trim() || startDate;
    const nextDueDate = String(fields?.dueDate || "").trim() || dueDate;
    setStartDate(nextStartDate);
    setDueDate(nextDueDate);

    const aiSubtasks = Array.isArray(fields?.subtasks) ? fields.subtasks : [];
    if (aiSubtasks.length) {
      setSubtasksOpen(true);
      setSubtasks(
        aiSubtasks
          .map((subtask) => ({
            title: String(subtask?.title || "").trim(),
            status: STATUS_OPTIONS.some((option) => option.value === subtask?.status)
              ? (subtask?.status as ProjectTaskStatus)
              : "todo",
            assigneeId:
              subtask?.assigneeId &&
              availableAssignees.some((member) => member.id === subtask.assigneeId)
                ? subtask.assigneeId
                : nextAssigneeId || undefined,
            startDate: String(subtask?.startDate || "").trim() || nextStartDate,
            dueDate: String(subtask?.dueDate || "").trim() || nextDueDate,
          }))
          .filter((subtask) => subtask.title)
          .slice(0, 8),
      );
    }

    setSectionId("");
    setCreateMode("manual");
    setDraftReady(true);
  };

  const handleApplyTaskTemplate = () => {
    if (!workspaceId || !selectedTemplateId) {
      return;
    }

    applyTaskTemplateMutation.mutate({
      workspaceId,
      templateId: selectedTemplateId,
      payload: {
        variables: templateVariables,
      },
    });
  };

  const handleSubtaskChange = (
    index: number,
    key: keyof ProjectTaskDraftSubtask,
    value: string,
  ) => {
    setSubtasks((current) =>
      current.map((subtask, currentIndex) =>
        currentIndex === index ? { ...subtask, [key]: value } : subtask,
      ),
    );
  };

  const handleStatusSelectChange = (value: string) => {
    if (value.startsWith(SECTION_STATUS_PREFIX)) {
      setSectionId(value.slice(SECTION_STATUS_PREFIX.length));
      return;
    }

    if (subtasks.length) {
      return;
    }

    setStatus(value as ProjectTaskStatus);
    setSectionId("");
  };

  const handleSubmit = () => {
    onSubmit({
      title: title.trim(),
      status: effectiveStatus,
      priority,
      assigneeId: assigneeId || undefined,
      teamId,
      pipelineId,
      startDate,
      dueDate,
      sectionId: sectionId || undefined,
      dependencyTaskIds,
      subtasks: subtasks
        .map((subtask) => ({
          ...subtask,
          title: subtask.title.trim(),
          assigneeId: subtask.assigneeId || undefined,
          startDate: subtask.startDate || startDate,
        }))
        .filter((subtask) => subtask.title),
    });
  };

  return (
    <AiCreateSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Create task" : "Edit task"}
      description={`${workflowName} is the parent workflow. Draft the task from a prompt or switch to manual mode.`}
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
        "Create a task to design low fidelity wireframes with 3 subtasks",
        "Create a QA task to review store metadata",
      ]}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !title.trim() || !teamId || !pipelineId || !startDate || !dueDate
            }
            loading={loading}
          >
            {mode === "create" ? "Create task" : "Save task"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {isCreateMode ? (
          <Collapsible
            open={templatePanelOpen}
            onOpenChange={setTemplatePanelOpen}
            className="px-0 py-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold">Template assistant</div>
                <p className="text-muted-foreground mt-1 text-[11px] leading-5">
                  {selectedTaskTemplate
                    ? `Selected: ${selectedTaskTemplate.name}`
                    : "Hidden by default so manual task creation stays focused."}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={templatePanelOpen ? "secondary" : "outline"}
                className="min-w-[8.5rem] justify-between gap-2 text-[11px]"
                onClick={() => setTemplatePanelOpen((current) => !current)}
              >
                {templatePanelOpen ? "Hide template" : "Use template"}
                <ChevronDown
                  className={`size-4 shrink-0 transition-transform ${templatePanelOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </div>

            <CollapsibleContent className="mt-2.5 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="grid gap-2">
                  <Label>Task template</Label>
                  <Select
                    value={selectedTemplateId || "none"}
                    onValueChange={(value) =>
                      setSelectedTemplateId(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a task template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {taskTemplates.map((template) => (
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
                  loading={applyTaskTemplateMutation.isPending}
                  disabled={!selectedTemplateId || applyTaskTemplateMutation.isPending}
                  onClick={handleApplyTaskTemplate}
                >
                  Apply
                </Button>
              </div>

              {selectedTaskTemplatePlaceholders.length ? (
                <div className="rounded-lg border border-border/30 bg-background/60 p-2.5">
                  <div className="mb-2 text-[11px] font-medium">Template variables</div>
                  <div className="grid gap-2">
                    {selectedTaskTemplatePlaceholders.map((placeholder) => (
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
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="task-title">Task title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Low fidelity wireframes"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 items-start">
          <div className="grid min-w-0 gap-2 ">
            <Label>Status</Label>
            <Select
              value={statusSelectValue}
              onValueChange={handleStatusSelectChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  {STATUS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={subtasks.length > 0}
                      >
                        <Icon size={20} />
                        {option.label}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
                {sections.length ? (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Custom sections</SelectLabel>
                      {sections.map((section) => (
                        <SelectItem
                          key={section.id}
                          value={`${SECTION_STATUS_PREFIX}${section.id}`}
                        >
                          {section.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                ) : null}
              </SelectContent>
            </Select>
            {subtasks.length ? (
              <div className="text-muted-foreground text-[11px] leading-5">
                Task status is derived from subtasks and currently resolves to{" "}
                <span className="text-foreground font-medium">
                  {getTaskStatusLabel(effectiveStatus)}
                </span>
                .
              </div>
            ) : null}
          </div>
          <div className="grid min-w-0 gap-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority(value as ProjectTaskPriority)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isCreateMode ? (
          <div className="rounded-xl border border-border/35 bg-muted/15 px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-muted-foreground text-[11px]">
                  Workflow
                </div>
                <div className="text-[12px] font-medium">{workflowName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-[11px]">Team</div>
                <div className="text-[12px] font-medium">
                  {selectedTeamForForm?.name ?? "Inherited from current scope"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-[11px]">
                  Pipeline
                </div>
                <div className="text-[12px] font-medium">
                  {selectedPipelineForForm?.name ??
                    "Inherited from current scope"}
                </div>
              </div>
            </div>
            <div className="text-muted-foreground mt-2 text-[11px] leading-5">
              Team and pipeline are inherited from this workflow. Timeline and
              progress roll up from this task and its subtasks.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={handleTeamChange}>
                <SelectTrigger className="w-full">
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
            <div className="grid min-w-0 gap-2">
              <Label>Pipeline</Label>
              <Select value={pipelineId} onValueChange={setPipelineId}>
                <SelectTrigger className="w-full">
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
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 items-start">
          <div className="grid min-w-0 gap-2">
            <Label>{isCreateMode ? "Assignee (suggested)" : "Assignee"}</Label>
            <Select
              value={assigneeId || undefined}
              onValueChange={setAssigneeId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {availableAssignees.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCreateMode ? (
              <div className="text-muted-foreground text-[11px] leading-5">
                Defaulted from the current workflow scope
                {suggestedAssignee ? `: ${suggestedAssignee.name}` : ""}.
              </div>
            ) : null}
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="task-start-date">Start date</Label>
              <Input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={dueDate || undefined}
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>
        </div>

        {isCreateMode ? (
          <div className="grid gap-2">
            <Label>Dependencies</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                >
                  {dependencyTaskIds.length
                    ? `${dependencyTaskIds.length} predecessor${dependencyTaskIds.length > 1 ? "s" : ""} selected`
                    : "Select predecessor tasks"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="max-h-72 w-[22rem] overflow-y-auto sm:w-[28rem]"
                align="start"
              >
                <DropdownMenuLabel>Task must wait for</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleDependencyOptions.length ? (
                  visibleDependencyOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.id}
                      checked={dependencyTaskIds.includes(option.id)}
                      onCheckedChange={(checked) =>
                        toggleDependencyTask(option.id, checked)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      <span className="truncate text-[12px]">
                        {option.title}
                      </span>
                      <span className="text-muted-foreground ml-1 truncate text-[11px]">
                        {option.workflowName}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="text-muted-foreground px-2 py-2 text-[11px]">
                    No other tasks available for dependencies.
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedDependencyOptions.length ? (
              <div className="text-muted-foreground flex flex-wrap gap-1 text-[11px]">
                {selectedDependencyOptions.map((option) => (
                  <span
                    key={option.id}
                    className="bg-muted rounded-md px-2 py-0.5"
                  >
                    {option.title}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-[11px] leading-5">
                Optional. Selected tasks become predecessors before this task can
                be marked done.
              </div>
            )}
          </div>
        ) : null}

        <Collapsible open={subtasksOpen} onOpenChange={setSubtasksOpen}>
          <div className="rounded-xl border border-border/35 bg-muted/15">
            <div className="flex items-center justify-between gap-2 px-3 py-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-1.5"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      subtasksOpen && "rotate-180",
                    )}
                  />
                  Subtasks
                </Button>
              </CollapsibleTrigger>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubtasksOpen(true);
                  setSubtasks((current) => [
                    ...current,
                    buildBlankSubtask(
                      startDate,
                      dueDate,
                      assigneeId || undefined,
                    ),
                  ]);
                }}
              >
                <Plus />
                Add subtask
              </Button>
            </div>

            <CollapsibleContent>
              <div className="space-y-3 border-t border-border/35 px-3 py-3">
                {subtasks.length ? (
                  subtasks.map((subtask, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-border/25 bg-background/80 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] font-medium">
                          Subtask {index + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setSubtasks((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input
                          value={subtask.title}
                          onChange={(event) =>
                            handleSubtaskChange(
                              index,
                              "title",
                              event.target.value,
                            )
                          }
                          placeholder="Prepare screens for review"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
                          <Label>Status</Label>
                          <Select
                            value={subtask.status}
                            onValueChange={(value) =>
                              handleSubtaskChange(index, "status", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid min-w-0 gap-2">
                          <Label>Assignee</Label>
                          <Select
                            value={subtask.assigneeId || undefined}
                            onValueChange={(value) =>
                              handleSubtaskChange(index, "assigneeId", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAssignees.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
                          <Label>Start date</Label>
                          <Input
                            type="date"
                            value={subtask.startDate || startDate}
                            onChange={(event) =>
                              handleSubtaskChange(
                                index,
                                "startDate",
                                event.target.value,
                              )
                            }
                            max={subtask.dueDate || dueDate || undefined}
                          />
                        </div>
                        <div className="grid min-w-0 gap-2">
                          <Label>Due date</Label>
                          <Input
                            type="date"
                            value={subtask.dueDate}
                            onChange={(event) =>
                              handleSubtaskChange(
                                index,
                                "dueDate",
                                event.target.value,
                              )
                            }
                            min={subtask.startDate || startDate || undefined}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-[12px] leading-5">
                    No subtasks yet. Add one to break this task down further.
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </AiCreateSheetShell>
  );
}
