import { Fragment, MouseEvent, useState } from "react";
import {
  Archive,
  ArrowUpDown,
  ChevronRight,
  FolderOpen,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  PlusSquare,
  Rows3,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Pagination } from "@/types";

import {
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTeamSummary,
  ProjectWorkflow,
  ProjectWorkflowSubtask,
  ProjectWorkflowView,
} from "../types";
import {
  formatShortDate,
  getTaskRowProgress,
  getTaskStatusLabel,
  getViewChipClass,
  getWorkflowStatusLabel,
  resolveMemberById,
} from "../utils";

type ProjectWorkflowsTableProps = {
  workflows: ProjectWorkflow[];
  loading?: boolean;
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  pagination?: Pagination | null;
  onPreviousPage: () => void;
  onNextPage: () => void;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  selectedPipeline: ProjectPipelineSummary | null;
  selectedTeamId: string;
  onTeamChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  view: ProjectWorkflowView;
  onViewChange: (value: ProjectWorkflowView) => void;
  selectedWorkflowId: string | null;
  onSelectWorkflow: (workflowId: string) => void;
  onOpenWorkflowDetails: (workflowId: string) => void;
  expandedWorkflowIds: string[];
  onToggleWorkflow: (workflowId: string) => void;
  expandedTaskIds: string[];
  onToggleTask: (taskId: string) => void;
  onCreateWorkflow: () => void;
  onEditWorkflow: (workflowId: string) => void;
  onCreateTask: (workflowId: string) => void;
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateSubtask: (workflowId: string, taskId: string) => void;
  onEditSubtask: (
    workflowId: string,
    taskId: string,
    subtaskId: string,
  ) => void;
  onWorkflowAction: (
    label: string,
    workflowId: string,
    workflowName: string,
  ) => void;
  onTaskAction: (
    label: string,
    workflowId: string,
    taskId: string,
    taskName: string,
  ) => void;
  onSubtaskAction: (
    label: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
    subtaskName: string,
  ) => void;
};

const VIEW_OPTIONS: { value: ProjectWorkflowView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "at-risk", label: "At risk" },
  { value: "completed", label: "Completed" },
];

const WORKFLOW_STATUS_STYLES: Record<ProjectWorkflow["status"], string> = {
  "on-track":
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "at-risk": "border-primary/20 bg-primary/10 text-primary",
  blocked: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
  complete: "border-border bg-muted/40 text-muted-foreground",
};

const TASK_STATUS_STYLES: Record<
  ProjectWorkflow["tasks"][number]["status"],
  string
> = {
  todo: "border-border bg-muted/40 text-muted-foreground",
  "in-progress": "border-primary/20 bg-primary/10 text-primary",
  review:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  done: "border-border bg-muted/30 text-muted-foreground",
  blocked: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
};

const WORKFLOW_DOT: Record<ProjectWorkflow["status"], string> = {
  "on-track": "bg-emerald-500",
  "at-risk": "bg-primary",
  blocked: "bg-amber-500",
  complete: "bg-muted-foreground",
};

const TASK_PRIORITY_DOT: Record<
  ProjectWorkflow["tasks"][number]["priority"],
  string
> = {
  low: "bg-muted-foreground/60",
  medium: "bg-amber-500",
  high: "bg-primary",
};

type SortMode = "updated" | "progress" | "name";
type DensityMode = "compact" | "comfortable";

function handleRowToggle(
  event: MouseEvent<HTMLButtonElement>,
  callback: () => void,
) {
  event.stopPropagation();
  callback();
}

function renderSubtaskRow(
  workflow: ProjectWorkflow,
  taskId: string,
  subtask: ProjectWorkflowSubtask,
  parentTeam: ProjectTeamSummary | undefined,
  members: ProjectMember[],
  density: DensityMode,
  onEditSubtask: (
    workflowId: string,
    taskId: string,
    subtaskId: string,
  ) => void,
  onSubtaskAction: (
    label: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
    subtaskName: string,
  ) => void,
) {
  const assignee = resolveMemberById(members, subtask.assigneeId);
  const progress = getTaskRowProgress({ status: subtask.status });

  return (
    <TableRow
      key={subtask.id}
      className={cn(
        "bg-muted/5 [&>td]:py-1",
        density === "compact" ? "h-8" : "h-9",
      )}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-2 pl-12">
          <span className="size-1.5 shrink-0 rounded-full bg-border" />
          <span className="truncate text-[12px] text-muted-foreground md:text-[12.5px]">
            {subtask.title}
          </span>
        </div>
      </TableCell>
      <TableCell>{assignee?.name ?? "Unassigned"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="font-medium">
          {parentTeam?.name ?? "Inherited"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={TASK_STATUS_STYLES[subtask.status]}>
          {getTaskStatusLabel(subtask.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-muted-foreground text-[11px]">{progress}%</div>
        </div>
      </TableCell>
      <TableCell>{formatShortDate(subtask.dueDate)}</TableCell>
      <TableCell className="text-muted-foreground">
        {subtask.updatedAt}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEditSubtask(workflow.id, taskId, subtask.id)}
            >
              Edit in task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                onSubtaskAction(
                  "Delete subtask",
                  workflow.id,
                  taskId,
                  subtask.id,
                  subtask.title,
                )
              }
            >
              Delete subtask
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function ProjectWorkflowsTable({
  workflows,
  loading = false,
  sortMode,
  onSortModeChange,
  pagination,
  onPreviousPage,
  onNextPage,
  members,
  teams,
  selectedPipeline,
  selectedTeamId,
  onTeamChange,
  startDate,
  onStartDateChange,
  view,
  onViewChange,
  selectedWorkflowId,
  onSelectWorkflow,
  onOpenWorkflowDetails,
  expandedWorkflowIds,
  onToggleWorkflow,
  expandedTaskIds,
  onToggleTask,
  onCreateWorkflow,
  onEditWorkflow,
  onCreateTask,
  onEditTask,
  onCreateSubtask,
  onEditSubtask,
  onWorkflowAction,
  onTaskAction,
  onSubtaskAction,
}: ProjectWorkflowsTableProps) {
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const [density, setDensity] = useState<DensityMode>("compact");
  const displayedWorkflows = workflows;

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border/35 px-3 py-3 md:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <div className="text-[14px] font-semibold md:text-[15px]">
              Workflow hierarchy
            </div>
            <div className="text-muted-foreground text-[12px] leading-5">
              {displayedWorkflows.length} visible workflow
              {displayedWorkflows.length === 1 ? "" : "s"}
              {selectedPipeline
                ? ` • ${selectedPipeline.name}`
                : " • All pipelines"}
              {selectedTeam ? ` • ${selectedTeam.name}` : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-muted/80 inline-flex rounded-md p-0.5">
              {VIEW_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewChange(option.value)}
                  className={getViewChipClass(view === option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <Select value={selectedTeamId} onValueChange={onTeamChange}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="h-8 w-40"
              aria-label="Filter workflow rows by due date"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Filter rows"
                >
                  <ListFilter />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={view === "all"}
                  onCheckedChange={() => onViewChange("all")}
                >
                  All visible
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={view === "at-risk"}
                  onCheckedChange={() => onViewChange("at-risk")}
                >
                  Needs attention
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={view === "completed"}
                  onCheckedChange={() => onViewChange("completed")}
                >
                  Completed only
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    onViewChange("all");
                    onTeamChange("all");
                    onStartDateChange("");
                  }}
                >
                  Reset scope
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sort rows"
                >
                  <ArrowUpDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={sortMode === "updated"}
                  onCheckedChange={() => onSortModeChange("updated")}
                >
                  Latest order
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortMode === "progress"}
                  onCheckedChange={() => onSortModeChange("progress")}
                >
                  Highest progress
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortMode === "name"}
                  onCheckedChange={() => onSortModeChange("name")}
                >
                  Alphabetical
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Change density"
                >
                  <Rows3 />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={density === "compact"}
                  onCheckedChange={() => setDensity("compact")}
                >
                  Compact density
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={density === "comfortable"}
                  onCheckedChange={() => setDensity("comfortable")}
                >
                  Comfortable density
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateWorkflow}
            >
              <Plus />
              Workflow
            </Button>
          </div>
        </div>
      </div>

      {displayedWorkflows.length ? (
        <>
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[34%]">Name</TableHead>
              <TableHead>Owner / Assignee</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[18%]">Progress</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-10 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedWorkflows.map((workflow) => {
              const workflowOwner = resolveMemberById(
                members,
                workflow.ownerId,
              );
              const workflowTeam = teams.find(
                (team) => team.id === workflow.teamId,
              );
              const workflowExpanded = expandedWorkflowIds.includes(
                workflow.id,
              );
              const workflowSelected = selectedWorkflowId === workflow.id;

              return (
                <Fragment key={workflow.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer bg-background/50 [&>td]:py-2",
                      density === "compact" ? "h-10" : "h-12",
                      workflowSelected && "bg-muted/35",
                    )}
                    onClick={() => {
                      onSelectWorkflow(workflow.id);
                      onOpenWorkflowDetails(workflow.id);
                    }}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) =>
                            handleRowToggle(event, () =>
                              onToggleWorkflow(workflow.id),
                            )
                          }
                          className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors"
                          aria-label={
                            workflowExpanded
                              ? "Collapse workflow"
                              : "Expand workflow"
                          }
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform",
                              workflowExpanded && "rotate-90",
                            )}
                          />
                        </button>
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            WORKFLOW_DOT[workflow.status],
                          )}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium leading-5 md:text-[14px]">
                            {workflow.name}
                          </div>
                          {workflow.description ? (
                            <div className="text-muted-foreground line-clamp-1 text-[12px] leading-4">
                              {workflow.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{workflowOwner?.name ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {workflowTeam?.name ?? "No team"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={WORKFLOW_STATUS_STYLES[workflow.status]}
                      >
                        {getWorkflowStatusLabel(workflow.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${workflow.progress}%` }}
                          />
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {workflow.progress}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{workflow.dueWindow}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {workflow.updatedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onOpenWorkflowDetails(workflow.id)}
                          >
                            <FolderOpen />
                            Open details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              onWorkflowAction(
                                "Delete workflow",
                                workflow.id,
                                workflow.name,
                              )
                            }
                          >
                            <Trash2 />
                            Delete workflow
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onCreateTask(workflow.id)}
                          >
                            <PlusSquare />
                            Add task
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditWorkflow(workflow.id)}
                          >
                            <Pencil />
                            Edit workflow
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              onWorkflowAction(
                                "Archive workflow",
                                workflow.id,
                                workflow.name,
                              )
                            }
                          >
                            <Archive />
                            Archive workflow
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {workflowExpanded
                    ? workflow.tasks.map((task) => {
                        const assignee = resolveMemberById(
                          members,
                          task.assigneeId,
                        );
                        const taskTeam = teams.find(
                          (team) => team.id === task.teamId,
                        );
                        const taskExpanded = expandedTaskIds.includes(task.id);
                        const taskProgress = getTaskRowProgress(task);

                        return (
                          <Fragment key={task.id}>
                            <TableRow
                              className={cn(
                                "bg-muted/10 cursor-pointer [&>td]:py-1.5",
                                density === "compact" ? "h-9" : "h-10",
                              )}
                              onClick={() => onEditTask(workflow.id, task.id)}
                            >
                              <TableCell>
                                <div className="flex min-w-0 items-center gap-2 pl-7">
                                  {task.subtasks?.length ? (
                                    <button
                                      type="button"
                                      onClick={(event) =>
                                        handleRowToggle(event, () =>
                                          onToggleTask(task.id),
                                        )
                                      }
                                      className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors"
                                      aria-label={
                                        taskExpanded
                                          ? "Collapse subtasks"
                                          : "Expand subtasks"
                                      }
                                    >
                                      <ChevronRight
                                        className={cn(
                                          "size-3.5 transition-transform",
                                          taskExpanded && "rotate-90",
                                        )}
                                      />
                                    </button>
                                  ) : (
                                    <span className="size-5 shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      "size-1.5 shrink-0 rounded-full",
                                      TASK_PRIORITY_DOT[task.priority],
                                    )}
                                  />
                                  <span className="truncate text-[12px] font-medium md:text-[12.5px]">
                                    {task.title}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {assignee?.name ?? "Unassigned"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="font-medium"
                                >
                                  {taskTeam?.name ?? "No team"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={TASK_STATUS_STYLES[task.status]}
                                >
                                  {getTaskStatusLabel(task.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                    <div
                                      className="bg-primary h-full rounded-full"
                                      style={{ width: `${taskProgress}%` }}
                                    />
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
                                    {taskProgress}%
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatShortDate(task.dueDate)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {task.updatedAt}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <MoreHorizontal />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onEditTask(workflow.id, task.id)
                                      }
                                    >
                                      <Pencil />
                                      Edit task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onCreateSubtask(workflow.id, task.id)
                                      }
                                    >
                                      <PlusSquare />
                                      Add subtask
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        onTaskAction(
                                          "Delete task",
                                          workflow.id,
                                          task.id,
                                          task.title,
                                        )
                                      }
                                    >
                                      <Trash2 />
                                      Delete task
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>

                            {taskExpanded
                              ? (task.subtasks ?? []).map((subtask) =>
                                  renderSubtaskRow(
                                    workflow,
                                    task.id,
                                    subtask,
                                    taskTeam,
                                    members,
                                    density,
                                    onEditSubtask,
                                    onSubtaskAction,
                                  ),
                                )
                              : null}
                          </Fragment>
                        );
                      })
                    : null}
                </Fragment>
              );
            })}
          </TableBody>
          </Table>

          {pagination ? (
            <div className="flex flex-col gap-2 border-t border-border/25 px-3 py-2 sm:flex-row sm:items-center sm:justify-between md:px-4">
              <div className="text-muted-foreground text-[11px]">
                {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPreviousPage}
                  disabled={loading || !pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onNextPage}
                  disabled={loading || !pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="text-muted-foreground px-4 py-4 text-[12px] leading-5">
          {loading ? "Loading workflows..." : "No workflows match the current filters."}
        </div>
      )}
    </section>
  );
}
