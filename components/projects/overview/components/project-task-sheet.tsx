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
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceTeam from "@/hooks/use-workspace-team";

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

type ProjectTaskSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  workflowName: string;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  pipelines: ProjectPipelineSummary[];
  sections: ProjectKanbanSection[];
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
  workflowName,
  members,
  teams,
  pipelines,
  sections,
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
  const { useWorkspaceTeamDetail } = useWorkspaceTeam();
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
  const [subtasksOpen, setSubtasksOpen] = useState(
    Boolean(initiallyExpandSubtasks || seededSubtasks.length),
  );
  const [subtasks, setSubtasks] =
    useState<ProjectTaskDraftSubtask[]>(seededSubtasks);
  const statusSelectValue = useMemo(() => {
    const hasSection = Boolean(sectionId) && sections.some((item) => item.id === sectionId);
    return hasSection ? `${SECTION_STATUS_PREFIX}${sectionId}` : status;
  }, [sectionId, sections, status]);
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

  const handleGenerateDraft = () => {
    const normalized = prompt.toLowerCase();
    const match = normalized.match(/(\d+)\s+subtasks?/i);
    const requestedCount = match ? Math.min(Number(match[1]), 5) : 0;

    setTitle(
      normalized.includes("wireframe")
        ? "Low fidelity wireframes"
        : normalized.includes("research")
          ? "Design research study"
          : `${workflowName} task`,
    );
    setPriority(normalized.includes("high") ? "high" : "medium");
    setStatus("todo");
    setSectionId("");
    setDraftReady(true);

    if (requestedCount > 0) {
      setSubtasksOpen(true);
      setSubtasks(
        Array.from({ length: requestedCount }, (_, index) => ({
          title: `Subtask ${index + 1}`,
          status: "todo",
          assigneeId,
          startDate,
          dueDate,
        })),
      );
    }
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

    setStatus(value as ProjectTaskStatus);
    setSectionId("");
  };

  const handleSubmit = () => {
    onSubmit({
      title: title.trim(),
      status,
      priority,
      assigneeId: assigneeId || undefined,
      teamId,
      pipelineId,
      startDate,
      dueDate,
      sectionId: sectionId || undefined,
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
      canGenerate={Boolean(prompt.trim())}
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
        <div className="grid gap-2">
          <Label htmlFor="task-title">Task title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Low fidelity wireframes"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid min-w-0 gap-2">
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
                      <SelectItem key={option.value} value={option.value}>
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
