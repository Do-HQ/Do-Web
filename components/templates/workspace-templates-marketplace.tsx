"use client";

import { useMemo, useState } from "react";
import {
  CopyPlus,
  Edit3,
  Layers,
  ListTodo,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CreateProjectSheet } from "@/components/projects/create-project-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import useWorkspaceTemplate from "@/hooks/use-workspace-template";
import useWorkspaceStore from "@/stores/workspace";
import LoaderComponent from "@/components/shared/loader";
import {
  CreateWorkspaceTemplateRequestBody,
  TaskTemplateSubtaskPayload,
  WorkspaceTemplateKind,
  WorkspaceTemplateRecord,
} from "@/types/template";
import { useDebounce } from "@/hooks/use-debounce";

type TemplateFormState = {
  kind: WorkspaceTemplateKind;
  name: string;
  description: string;
  project: {
    nameTemplate: string;
    summaryTemplate: string;
    status: "on-track" | "at-risk" | "paused";
    initialPipelineTemplate: "product" | "marketing" | "operations";
    startOffsetDays: number;
    durationDays: number;
  };
  task: {
    titleTemplate: string;
    status: "todo" | "in-progress" | "review" | "done" | "blocked";
    priority: "low" | "medium" | "high";
    startInDays: number;
    dueInDays: number;
    sectionId: string;
    subtasks: TaskTemplateSubtaskPayload[];
  };
};

const makeDefaultFormState = (
  kind: WorkspaceTemplateKind,
): TemplateFormState => ({
  kind,
  name: "",
  description: "",
  project: {
    nameTemplate: "{{project_name}}",
    summaryTemplate: "",
    status: "on-track",
    initialPipelineTemplate: "product",
    startOffsetDays: 0,
    durationDays: 21,
  },
  task: {
    titleTemplate: "{{task_name}}",
    status: "todo",
    priority: "medium",
    startInDays: 0,
    dueInDays: 7,
    sectionId: "",
    subtasks: [],
  },
});

function templateToForm(template: WorkspaceTemplateRecord): TemplateFormState {
  const base = makeDefaultFormState(template.kind);

  if (template.kind === "project") {
    const payload = (template.template || {}) as TemplateFormState["project"];

    return {
      ...base,
      name: template.name,
      description: template.description || "",
      project: {
        ...base.project,
        ...payload,
      },
    };
  }

  const payload = (template.template || {}) as TemplateFormState["task"];

  return {
    ...base,
    name: template.name,
    description: template.description || "",
    task: {
      ...base.task,
      ...payload,
      subtasks: Array.isArray(payload?.subtasks) ? payload.subtasks : [],
    },
  };
}

function buildPayload(
  form: TemplateFormState,
): CreateWorkspaceTemplateRequestBody {
  if (form.kind === "project") {
    return {
      kind: "project",
      name: form.name.trim(),
      description: form.description.trim(),
      template: {
        nameTemplate: form.project.nameTemplate.trim(),
        summaryTemplate: form.project.summaryTemplate.trim(),
        status: form.project.status,
        initialPipelineTemplate: form.project.initialPipelineTemplate,
        startOffsetDays: form.project.startOffsetDays,
        durationDays: form.project.durationDays,
      },
    };
  }

  return {
    kind: "task",
    name: form.name.trim(),
    description: form.description.trim(),
    template: {
      titleTemplate: form.task.titleTemplate.trim(),
      status: form.task.status,
      priority: form.task.priority,
      startInDays: form.task.startInDays,
      dueInDays: form.task.dueInDays,
      sectionId: form.task.sectionId.trim(),
      subtasks: form.task.subtasks
        .map((subtask) => ({
          titleTemplate: String(subtask.titleTemplate || "").trim(),
          status: subtask.status || "todo",
        }))
        .filter((subtask) => subtask.titleTemplate),
    },
  };
}

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspaceTemplatesMarketplace() {
  const { workspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const {
    useWorkspaceTemplates,
    useCreateWorkspaceTemplate,
    useUpdateWorkspaceTemplate,
    useDeleteWorkspaceTemplate,
  } = useWorkspaceTemplate();

  const [kind, setKind] = useState<WorkspaceTemplateKind>("project");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<WorkspaceTemplateRecord | null>(null);
  const [form, setForm] = useState<TemplateFormState>(
    makeDefaultFormState("project"),
  );
  const [deleteDialog, setDeleteDialog] =
    useState<WorkspaceTemplateRecord | null>(null);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [projectCreateTemplateId, setProjectCreateTemplateId] =
    useState<string>("");

  // Debounce
  const debouncedSearch = useDebounce(search, 500);

  const templatesQuery = useWorkspaceTemplates(
    workspaceId ?? "",
    {
      page: 1,
      limit: 100,
      kind,
      search: debouncedSearch,
      archived: false,
    },
    {
      enabled: Boolean(workspaceId),
    },
  );

  const createTemplateMutation = useCreateWorkspaceTemplate({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-templates", workspaceId],
      });
      toast.success("Template created");
      setEditorOpen(false);
      setEditingTemplate(null);
    },
  });

  const updateTemplateMutation = useUpdateWorkspaceTemplate({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-templates", workspaceId],
      });
      toast.success("Template updated");
      setEditorOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteTemplateMutation = useDeleteWorkspaceTemplate({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-templates", workspaceId],
      });
      toast.success("Template deleted");
      setDeleteDialog(null);
    },
  });

  const templates = templatesQuery.data?.data?.templates ?? [];

  const openCreateEditor = () => {
    setEditingTemplate(null);
    setForm(makeDefaultFormState(kind));
    setEditorOpen(true);
  };

  const openEditEditor = (template: WorkspaceTemplateRecord) => {
    setEditingTemplate(template);
    setForm(templateToForm(template));
    setEditorOpen(true);
  };

  const handleSubmit = () => {
    if (!workspaceId) {
      return;
    }

    const payload = buildPayload(form);

    if (!payload.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (
      payload.kind === "project" &&
      (!("nameTemplate" in payload.template) ||
        !String(
          (payload.template as { nameTemplate?: string }).nameTemplate || "",
        ).trim())
    ) {
      toast.error("Project name template is required");
      return;
    }

    if (
      payload.kind === "task" &&
      (!("titleTemplate" in payload.template) ||
        !String(
          (payload.template as { titleTemplate?: string }).titleTemplate || "",
        ).trim())
    ) {
      toast.error("Task title template is required");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({
        workspaceId,
        templateId: editingTemplate.id,
        updates: {
          name: payload.name,
          description: payload.description,
          template: payload.template,
        },
      });
      return;
    }

    createTemplateMutation.mutate({
      workspaceId,
      payload,
    });
  };

  const placeholderTips = useMemo(() => {
    if (form.kind === "project") {
      return ["{{project_name}}", "{{team}}", "{{objective}}"];
    }

    return ["{{task_name}}", "{{feature}}", "{{owner}}"];
  }, [form.kind]);

  return (
    <div
      data-tour="templates-shell"
      className="mx-auto flex w-full max-w-6xl flex-col gap-3"
    >
      <div
        data-tour="templates-header"
        className="rounded-lg border border-border/35 bg-muted/15 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-base font-semibold">Templates marketplace</h1>
            <p className="text-muted-foreground text-[12px]">
              Build reusable project and task templates with placeholders like{" "}
              <span className="font-medium">{"{{feature}}"}</span>.
            </p>
          </div>
          <Button
            data-tour="templates-create"
            type="button"
            size="sm"
            onClick={openCreateEditor}
          >
            <Plus className="size-4" />
            New template
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={kind}
            onValueChange={(value) => setKind(value as WorkspaceTemplateKind)}
            className="gap-0 md:w-auto"
          >
            <TabsList
              data-tour="templates-tabs"
              className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0"
            >
              <TabsTrigger
                value="project"
                className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Layers className="size-3.5" />
                Project templates
              </TabsTrigger>
              <TabsTrigger
                value="task"
                className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <ListTodo className="size-3.5" />
                Task templates
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search templates"
            className="w-full md:max-w-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div data-tour="templates-grid" className="rounded-xl bg-background/70">
        {templatesQuery.isLoading ? (
          <div className="p-6">
            <LoaderComponent />
          </div>
        ) : templates.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="group flex h-full flex-col gap-3 rounded-lg border border-border/30 bg-muted/10 p-3 transition-colors hover:bg-muted/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {template.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 text-[10px] uppercase"
                      >
                        {template.kind === "project" ? (
                          <Layers className="size-3" />
                        ) : (
                          <ListTodo className="size-3" />
                        )}
                        {template.kind}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        Used {template.usageCount}
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        Updated {formatDate(template.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="opacity-90 transition-opacity group-hover:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Template options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44 text-[12px]"
                    >
                      <DropdownMenuItem
                        className="gap-2 py-1.5"
                        onClick={() => {
                          if (template.kind === "project") {
                            setProjectCreateTemplateId(template.id);
                            setProjectCreateOpen(true);
                            return;
                          }

                          toast.message(
                            "Task templates are available in the task create/edit sheet.",
                          );
                        }}
                      >
                        <CopyPlus className="size-3.5" />
                        Use template
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 py-1.5"
                        onClick={() => openEditEditor(template)}
                      >
                        <Edit3 className="size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialog(template)}
                        className="gap-2 py-1.5 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {template.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-[12px] leading-5">
                    {template.description}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(template.placeholders || [])
                    .slice(0, 4)
                    .map((placeholder) => (
                      <Badge
                        key={placeholder}
                        variant="outline"
                        className="text-[10px] text-sky-600 dark:text-sky-400"
                      >
                        {`{{${placeholder}}}`}
                      </Badge>
                    ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <Empty className="bg-muted/10 min-h-[13rem] border-border/40">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {kind === "project" ? (
                    <Layers className="size-5" />
                  ) : (
                    <ListTodo className="size-5" />
                  )}
                </EmptyMedia>
                <EmptyTitle className="text-[15px]">
                  {search.trim() ? "No matching templates" : "No templates yet"}
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  {search.trim()
                    ? "Try another search term or clear your filters."
                    : "Create your first template to standardize project and task setup."}
                </EmptyDescription>
              </EmptyHeader>
              <Button type="button" size="sm" onClick={openCreateEditor}>
                <Plus className="size-4" />
                New template
              </Button>
            </Empty>
          </div>
        )}
      </div>

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full gap-0 border-l border-border/50 sm:max-w-[32rem]">
          <SheetHeader className="gap-2 border-b border-border/35 pb-4 pr-10">
            <SheetTitle className="text-[16px]">
              {editingTemplate ? "Edit template" : "Create template"}
            </SheetTitle>
            <SheetDescription className="text-[12.5px] leading-5">
              Create reusable project and task templates with placeholders, then
              apply them in create flows.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Template type</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        kind: value as WorkspaceTemplateKind,
                      }))
                    }
                    disabled={Boolean(editingTemplate)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project template</SelectItem>
                      <SelectItem value="task">Task template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder={
                      form.kind === "project" ? "Q2 Launch" : "QA Checklist"
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-20"
                  />
                </div>

                <div className="rounded-lg border border-border/30 bg-muted/15 p-3">
                  <div className="text-[12px] font-medium">Placeholders</div>
                  <div className="text-muted-foreground mt-1 text-[11px] leading-5">
                    Use placeholders in template text. They are substituted when
                    users apply the template.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {placeholderTips.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {form.kind === "project" ? (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Project name template</Label>
                      <Input
                        value={form.project.nameTemplate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            project: {
                              ...current.project,
                              nameTemplate: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Project summary template</Label>
                      <Textarea
                        className="min-h-20"
                        value={form.project.summaryTemplate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            project: {
                              ...current.project,
                              summaryTemplate: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select
                          value={form.project.status}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              project: {
                                ...current.project,
                                status:
                                  value as TemplateFormState["project"]["status"],
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on-track">On track</SelectItem>
                            <SelectItem value="at-risk">At risk</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Pipeline template</Label>
                        <Select
                          value={form.project.initialPipelineTemplate}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              project: {
                                ...current.project,
                                initialPipelineTemplate:
                                  value as TemplateFormState["project"]["initialPipelineTemplate"],
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="operations">
                              Operations
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Start offset (days)</Label>
                        <Input
                          type="number"
                          value={form.project.startOffsetDays}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              project: {
                                ...current.project,
                                startOffsetDays: Number(
                                  event.target.value || 0,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Duration (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.project.durationDays}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              project: {
                                ...current.project,
                                durationDays: Number(event.target.value || 1),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Task title template</Label>
                      <Input
                        value={form.task.titleTemplate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            task: {
                              ...current.task,
                              titleTemplate: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select
                          value={form.task.status}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              task: {
                                ...current.task,
                                status:
                                  value as TemplateFormState["task"]["status"],
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To do</SelectItem>
                            <SelectItem value="in-progress">
                              In progress
                            </SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Priority</Label>
                        <Select
                          value={form.task.priority}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              task: {
                                ...current.task,
                                priority:
                                  value as TemplateFormState["task"]["priority"],
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Start in (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.task.startInDays}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              task: {
                                ...current.task,
                                startInDays: Number(event.target.value || 0),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Due in (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.task.dueInDays}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              task: {
                                ...current.task,
                                dueInDays: Number(event.target.value || 0),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Section ID (optional)</Label>
                      <Input
                        value={form.task.sectionId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            task: {
                              ...current.task,
                              sectionId: event.target.value,
                            },
                          }))
                        }
                        placeholder="backlog"
                      />
                    </div>

                    <div className="rounded-lg border border-border/25 bg-muted/10 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-[12px] font-medium">
                          Subtask templates
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              task: {
                                ...current.task,
                                subtasks: [
                                  ...current.task.subtasks,
                                  { titleTemplate: "", status: "todo" },
                                ],
                              },
                            }))
                          }
                        >
                          <Plus className="size-3.5" />
                          Add subtask
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {form.task.subtasks.length ? (
                          form.task.subtasks.map((subtask, index) => (
                            <div
                              key={index}
                              className="grid items-center gap-2 sm:grid-cols-[1fr_8rem_auto]"
                            >
                              <Input
                                value={subtask.titleTemplate}
                                onChange={(event) =>
                                  setForm((current) => {
                                    const next = [...current.task.subtasks];
                                    next[index] = {
                                      ...next[index],
                                      titleTemplate: event.target.value,
                                    };

                                    return {
                                      ...current,
                                      task: {
                                        ...current.task,
                                        subtasks: next,
                                      },
                                    };
                                  })
                                }
                                placeholder="{{subtask_name}}"
                              />
                              <Select
                                value={subtask.status || "todo"}
                                onValueChange={(value) =>
                                  setForm((current) => {
                                    const next = [...current.task.subtasks];
                                    next[index] = {
                                      ...next[index],
                                      status:
                                        value as TaskTemplateSubtaskPayload["status"],
                                    };

                                    return {
                                      ...current,
                                      task: {
                                        ...current.task,
                                        subtasks: next,
                                      },
                                    };
                                  })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todo">To do</SelectItem>
                                  <SelectItem value="in-progress">
                                    In progress
                                  </SelectItem>
                                  <SelectItem value="review">Review</SelectItem>
                                  <SelectItem value="done">Done</SelectItem>
                                  <SelectItem value="blocked">
                                    Blocked
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    task: {
                                      ...current.task,
                                      subtasks: current.task.subtasks.filter(
                                        (_, subtaskIndex) =>
                                          subtaskIndex !== index,
                                      ),
                                    },
                                  }))
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-[11px]">
                            No subtask templates yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/25 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                loading={
                  createTemplateMutation.isPending ||
                  updateTemplateMutation.isPending
                }
              >
                {editingTemplate ? "Save template" : "Create template"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="font-medium text-foreground">
                {deleteDialog?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteTemplateMutation.isPending}
              onClick={() => {
                if (!workspaceId || !deleteDialog) {
                  return;
                }

                deleteTemplateMutation.mutate({
                  workspaceId,
                  templateId: deleteDialog.id,
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateProjectSheet
        open={projectCreateOpen}
        onOpenChange={(open) => {
          setProjectCreateOpen(open);
          if (!open) {
            setProjectCreateTemplateId("");
          }
        }}
        initialTemplateId={projectCreateTemplateId || undefined}
      />
    </div>
  );
}
