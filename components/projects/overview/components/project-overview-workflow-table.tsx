import { Fragment, useState } from "react";
import {
  Archive,
  ArrowUpDown,
  ChevronRight,
  FolderSearch,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  PlusSquare,
  Rows3,
  Star,
  StarOff,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores";
import { Pagination } from "@/types";

import {
  ProjectMember,
  ProjectPipelineSummary,
  ProjectTeamSummary,
  ProjectWorkflow,
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
import LoaderComponent from "@/components/shared/loader";

type ProjectOverviewWorkflowTableProps = {
  projectId: string;
  workflows: ProjectWorkflow[];
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  selectedPipeline: ProjectPipelineSummary | null;
  selectedTeamId: string;
  onTeamChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  view: ProjectWorkflowView;
  onViewChange: (value: ProjectWorkflowView) => void;
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  pagination: Pagination | null;
  loading?: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  expandedWorkflowIds: string[];
  onToggleWorkflow: (workflowId: string) => void;
  onCreateWorkflow: () => void;
  onEditWorkflow: (workflowId: string) => void;
  onCreateTask: (workflowId: string) => void;
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateSubtask: (workflowId: string, taskId: string) => void;
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
  canManageWorkflowActions?: boolean;
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

const PRIORITY_DOT: Record<
  ProjectWorkflow["tasks"][number]["priority"],
  string
> = {
  low: "bg-muted-foreground/60",
  medium: "bg-amber-500",
  high: "bg-primary",
};

const WORKFLOW_DOT: Record<ProjectWorkflow["status"], string> = {
  "on-track": "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]",
  "at-risk": "bg-primary shadow-[0_0_0_3px_rgba(249,115,22,0.16)]",
  blocked: "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.16)]",
  complete: "bg-muted-foreground",
};

type SortMode = "updated" | "progress" | "name";
type DensityMode = "compact" | "comfortable";

type QuickFilterMode = "all" | "active" | "at-risk" | "completed";

export function ProjectOverviewWorkflowTable({
  projectId,
  workflows,
  members,
  teams,
  selectedPipeline,
  selectedTeamId,
  onTeamChange,
  startDate,
  onStartDateChange,
  view,
  onViewChange,
  sortMode,
  onSortModeChange,
  pagination,
  loading = false,
  onPreviousPage,
  onNextPage,
  expandedWorkflowIds,
  onToggleWorkflow,
  onCreateWorkflow,
  onEditWorkflow,
  onCreateTask,
  onEditTask,
  onCreateSubtask,
  onWorkflowAction,
  onTaskAction,
  canManageWorkflowActions = true,
}: ProjectOverviewWorkflowTableProps) {
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const [density, setDensity] = useState<DensityMode>("compact");

  const quickFilterMode: QuickFilterMode = view;
  const hasScopedFilters =
    quickFilterMode !== "all" || selectedTeamId !== "all" || Boolean(startDate);

  const displayedWorkflows = workflows;

  const favoriteKeySet = new Set(favorites.map((item) => item.key));

  const toggleWorkflowFavorite = (workflow: ProjectWorkflow) => {
    toggleFavorite({
      key: `workflow:${projectId}:${workflow.id}`,
      type: "workflow",
      label: workflow.name,
      subtitle: "Workflow",
      href: `/projects/${projectId}?tab=workflows&workflow=${encodeURIComponent(workflow.id)}`,
    });
  };

  const toggleTaskFavorite = (workflow: ProjectWorkflow, task: ProjectWorkflow["tasks"][number]) => {
    toggleFavorite({
      key: `task:${projectId}:${workflow.id}:${task.id}`,
      type: "task",
      label: task.title,
      subtitle: workflow.name,
      href: `/projects/${projectId}?tab=dos&workflow=${encodeURIComponent(workflow.id)}&task=${encodeURIComponent(task.id)}`,
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border/35 px-3 py-3 md:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <div className="text-[14px] font-semibold md:text-[15px]">
              Workflow view
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
              aria-label="Filter workflow tasks by due date"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={hasScopedFilters ? "outline" : "ghost"}
                  size="icon-sm"
                  aria-label="Filter rows"
                  className={cn(
                    hasScopedFilters &&
                      "border-primary/20 bg-primary/5 text-primary",
                  )}
                >
                  <ListFilter />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={quickFilterMode === "all"}
                  onCheckedChange={() => onViewChange("all")}
                >
                  All visible
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={quickFilterMode === "active"}
                  onCheckedChange={() => onViewChange("active")}
                >
                  Active only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={quickFilterMode === "at-risk"}
                  onCheckedChange={() => onViewChange("at-risk")}
                >
                  Needs attention
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={quickFilterMode === "completed"}
                  onCheckedChange={() => onViewChange("completed")}
                >
                  Completed only
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={Boolean(startDate)}
                  onCheckedChange={(checked) =>
                    onStartDateChange(
                      checked ? new Date().toISOString().slice(0, 10) : "",
                    )
                  }
                >
                  Starting today
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
                  variant={sortMode === "updated" ? "ghost" : "outline"}
                  size="icon-sm"
                  aria-label="Sort rows"
                  className={cn(
                    sortMode !== "updated" &&
                      "border-primary/20 bg-primary/5 text-primary",
                  )}
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
                  variant={density === "compact" ? "ghost" : "outline"}
                  size="icon-sm"
                  aria-label="Change density"
                  className={cn(
                    density !== "compact" &&
                      "border-primary/20 bg-primary/5 text-primary",
                  )}
                >
                  <Rows3 />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={density === "compact"}
                  onCheckedChange={() => setDensity("compact")}
                >
                  Compact
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={density === "comfortable"}
                  onCheckedChange={() => setDensity("comfortable")}
                >
                  Comfortable
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateWorkflow}
              disabled={!canManageWorkflowActions}
              title={
                !canManageWorkflowActions
                  ? "You do not have permission to create workflows."
                  : undefined
              }
            >
              <Plus />
              Workflow
            </Button>
          </div>
        </div>
      </div>

      {displayedWorkflows.length ? (
        <div className="w-full overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[34%]">Name</TableHead>
              <TableHead>Owner</TableHead>
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
              const isExpanded = expandedWorkflowIds.includes(workflow.id);
              const owner = resolveMemberById(members, workflow.ownerId);
              const team = teams.find((item) => item.id === workflow.teamId);

              return (
                <Fragment key={workflow.id}>
                  <TableRow
                    className={cn(
                      "bg-background/40",
                      density === "compact"
                        ? "h-10 [&>td]:py-2"
                        : "h-12 [&>td]:py-2.5",
                    )}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleWorkflow(workflow.id)}
                          className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors"
                          aria-label={
                            isExpanded ? "Collapse workflow" : "Expand workflow"
                          }
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </button>
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            WORKFLOW_DOT[workflow.status],
                            workflow.status !== "complete" && "animate-pulse",
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
                    <TableCell>{owner?.name ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {team?.name ?? "No team"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          WORKFLOW_STATUS_STYLES[workflow.status],
                        )}
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
                          <Button type="button" variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => toggleWorkflowFavorite(workflow)}
                          >
                            {favoriteKeySet.has(
                              `workflow:${projectId}:${workflow.id}`,
                            ) ? (
                              <StarOff />
                            ) : (
                              <Star />
                            )}
                            {favoriteKeySet.has(
                              `workflow:${projectId}:${workflow.id}`,
                            )
                              ? "Remove favorite"
                              : "Add to favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!canManageWorkflowActions}
                            onClick={() => onCreateTask(workflow.id)}
                          >
                            <PlusSquare />
                            Add task
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            disabled={!canManageWorkflowActions}
                            onClick={() => onEditWorkflow(workflow.id)}
                          >
                            <Pencil />
                            Edit workflow
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!canManageWorkflowActions}
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

                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!canManageWorkflowActions}
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {isExpanded
                    ? workflow.tasks.map((task) => {
                        const assignee = resolveMemberById(
                          members,
                          task.assigneeId,
                        );
                        const taskTeam = teams.find(
                          (item) => item.id === task.teamId,
                        );
                        const taskProgress = getTaskRowProgress(task);

                        return (
                          <TableRow
                            key={task.id}
                            className={cn(
                              "bg-muted/10",
                              density === "compact"
                                ? "h-9 [&>td]:py-1.5"
                                : "h-10 [&>td]:py-2",
                            )}
                          >
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-2 pl-7">
                                <span
                                  className={cn(
                                    "size-1.5 shrink-0 rounded-full",
                                    PRIORITY_DOT[task.priority],
                                  )}
                                />
                                <div className="truncate text-[12px] font-medium leading-5 md:text-[13px]">
                                  {task.title}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="hidden font-medium sm:inline-flex"
                                >
                                  {task.priority}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {assignee?.name ?? "Unassigned"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {taskTeam?.name ?? "No team"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-medium",
                                  TASK_STATUS_STYLES[task.status],
                                )}
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
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleTaskFavorite(workflow, task)
                                    }
                                  >
                                    {favoriteKeySet.has(
                                      `task:${projectId}:${workflow.id}:${task.id}`,
                                    ) ? (
                                      <StarOff />
                                    ) : (
                                      <Star />
                                    )}
                                    {favoriteKeySet.has(
                                      `task:${projectId}:${workflow.id}:${task.id}`,
                                    )
                                      ? "Remove favorite"
                                      : "Add to favorites"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={!canManageWorkflowActions}
                                    onClick={() =>
                                      onCreateSubtask(workflow.id, task.id)
                                    }
                                  >
                                    <PlusSquare />
                                    Add subtask
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={!canManageWorkflowActions}
                                    onClick={() =>
                                      onEditTask(workflow.id, task.id)
                                    }
                                  >
                                    <Pencil />
                                    Edit task
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={!canManageWorkflowActions}
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
                        );
                      })
                    : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        </div>
      ) : (
        <div className="px-4 py-5 text-[12px] text-muted-foreground">
          {loading ? (
            <LoaderComponent />
          ) : (
            <Empty className="border-0 p-0 md:p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderSearch className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyDescription className="text-[12px]">
                  No workflows match the current filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      )}

      {pagination ? (
        <div className="flex items-center justify-between border-t border-border/20 px-3 py-2 text-[11px] text-muted-foreground md:px-4">
          <div>
            {pagination.total
              ? `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )} of ${pagination.total}`
              : "0 workflows"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPreviousPage}
              disabled={!pagination.hasPrevPage || loading}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onNextPage}
              disabled={!pagination.hasNextPage || loading}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
