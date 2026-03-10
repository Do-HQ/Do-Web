"use client";

import { Fragment, useState } from "react";
import { ChevronRight, ListTodo, MoreHorizontal, Star, StarOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import {
  FlattenedProjectTask,
  ProjectMember,
  ProjectTeamSummary,
} from "../types";
import {
  formatShortDate,
  getSubtaskProgressLabel,
  getTaskRowProgress,
  getTaskStatusLabel,
  resolveMemberById,
} from "../utils";

type ProjectDosTableProps = {
  projectId: string;
  tasks: FlattenedProjectTask[];
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
  onEditTask: (workflowId: string, taskId: string) => void;
  onCreateSubtask?: (workflowId: string, taskId: string) => void;
  onEditSubtask?: (workflowId: string, taskId: string, subtaskId: string) => void;
  onTaskAction: (label: string, workflowId: string, taskId: string, taskName: string) => void;
  onSubtaskAction?: (
    label: string,
    workflowId: string,
    taskId: string,
    subtaskId: string,
    subtaskName: string,
  ) => void;
};

const STATUS_STYLES = {
  todo: "border-border bg-muted/40 text-muted-foreground",
  "in-progress": "border-primary/20 bg-primary/10 text-primary",
  review: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  done: "border-border bg-muted/30 text-muted-foreground",
  blocked: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
} as const;

const PRIORITY_STYLES = {
  low: "border-border bg-muted/30 text-muted-foreground",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  high: "border-primary/20 bg-primary/10 text-primary",
} as const;

export function ProjectDosTable({
  projectId,
  tasks,
  members,
  teams,
  onEditTask,
  onCreateSubtask,
  onEditSubtask,
  onTaskAction,
  onSubtaskAction,
}: ProjectDosTableProps) {
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const favoriteKeySet = new Set(favorites.map((item) => item.key));

  const toggleTask = (taskId: string) => {
    setExpandedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((item) => item !== taskId)
        : [...current, taskId],
    );
  };

  const toggleTaskFavorite = (task: FlattenedProjectTask) => {
    toggleFavorite({
      key: `task:${projectId}:${task.workflowId}:${task.id}`,
      type: "task",
      label: task.title,
      subtitle: task.workflowName,
      href: `/projects/${projectId}?tab=dos&workflow=${encodeURIComponent(task.workflowId)}&task=${encodeURIComponent(task.id)}`,
    });
  };

  const toggleSubtaskFavorite = (
    task: FlattenedProjectTask,
    subtaskId: string,
    subtaskTitle: string,
  ) => {
    toggleFavorite({
      key: `subtask:${projectId}:${task.workflowId}:${task.id}:${subtaskId}`,
      type: "subtask",
      label: subtaskTitle,
      subtitle: task.title,
      href: `/projects/${projectId}?tab=dos&workflow=${encodeURIComponent(task.workflowId)}&task=${encodeURIComponent(task.id)}&subtask=${encodeURIComponent(subtaskId)}`,
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      {tasks.length ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[28%]">Name</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-[16%]">Progress</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-10 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const assignee = resolveMemberById(members, task.assigneeId);
              const team = teams.find((item) => item.id === task.teamId);
              const hasSubtasks = task.subtasks.length > 0;
              const isExpanded = expandedTaskIds.includes(task.id);

              return (
                <Fragment key={task.id}>
                  <TableRow
                    className="h-10 cursor-pointer bg-background/40 [&>td]:py-2"
                    onClick={() => onEditTask(task.workflowId, task.id)}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        {hasSubtasks ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleTask(task.id);
                            }}
                            className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors"
                            aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 transition-transform",
                                isExpanded && "rotate-90",
                              )}
                            />
                          </button>
                        ) : (
                          <span className="size-5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-medium leading-5">
                            {task.title}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {task.workflowName}
                      </Badge>
                    </TableCell>
                    <TableCell>{assignee?.name ?? "Unassigned"}</TableCell>
                    <TableCell>{team?.name ?? "No team"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[task.status]}>
                        {getTaskStatusLabel(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRIORITY_STYLES[task.priority]}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {getSubtaskProgressLabel(task)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatShortDate(task.dueDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{task.updatedAt}</TableCell>
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
                            onClick={() => toggleTaskFavorite(task)}
                          >
                            {favoriteKeySet.has(
                              `task:${projectId}:${task.workflowId}:${task.id}`,
                            ) ? (
                              <StarOff />
                            ) : (
                              <Star />
                            )}
                            {favoriteKeySet.has(
                              `task:${projectId}:${task.workflowId}:${task.id}`,
                            )
                              ? "Remove favorite"
                              : "Add to favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEditTask(task.workflowId, task.id)}>
                            Edit task
                          </DropdownMenuItem>
                          {onCreateSubtask ? (
                            <DropdownMenuItem onClick={() => onCreateSubtask(task.workflowId, task.id)}>
                              Add subtask
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onTaskAction("Delete task", task.workflowId, task.id, task.title)}
                          >
                            Delete task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {isExpanded
                    ? task.subtasks.map((subtask) => {
                        const subtaskAssignee = resolveMemberById(members, subtask.assigneeId);
                        const subtaskProgress = getTaskRowProgress({ status: subtask.status });

                        return (
                          <TableRow key={subtask.id} className="bg-muted/8 h-8 [&>td]:py-1.5">
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-2 pl-8">
                                <span className="size-1.5 shrink-0 rounded-full bg-border" />
                                <span className="truncate text-[12px] text-muted-foreground md:text-[12.5px]">
                                  {subtask.title}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground text-[11px]">Subtask</span>
                            </TableCell>
                            <TableCell>{subtaskAssignee?.name ?? "Unassigned"}</TableCell>
                            <TableCell>{team?.name ?? "Inherited"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_STYLES[subtask.status]}>
                                {getTaskStatusLabel(subtask.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                                n/a
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                  <div
                                    className="bg-primary h-full rounded-full"
                                    style={{ width: `${subtaskProgress}%` }}
                                  />
                                </div>
                                <div className="text-muted-foreground text-[11px]">
                                  {subtaskProgress}%
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatShortDate(subtask.dueDate)}</TableCell>
                            <TableCell className="text-muted-foreground">{subtask.updatedAt}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon-sm">
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleSubtaskFavorite(
                                        task,
                                        subtask.id,
                                        subtask.title,
                                      )
                                    }
                                  >
                                    {favoriteKeySet.has(
                                      `subtask:${projectId}:${task.workflowId}:${task.id}:${subtask.id}`,
                                    ) ? (
                                      <StarOff />
                                    ) : (
                                      <Star />
                                    )}
                                    {favoriteKeySet.has(
                                      `subtask:${projectId}:${task.workflowId}:${task.id}:${subtask.id}`,
                                    )
                                      ? "Remove favorite"
                                      : "Add to favorites"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {onEditSubtask ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onEditSubtask(task.workflowId, task.id, subtask.id)
                                      }
                                    >
                                      Edit subtask
                                    </DropdownMenuItem>
                                  ) : null}
                                  {onSubtaskAction ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() =>
                                          onSubtaskAction(
                                            "Delete subtask",
                                            task.workflowId,
                                            task.id,
                                            subtask.id,
                                            subtask.title,
                                          )
                                        }
                                      >
                                        Delete subtask
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
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
      ) : (
        <div className="px-4 py-4">
          <Empty className="border-0 p-0 md:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTodo className="size-4 text-primary/85" />
              </EmptyMedia>
              <EmptyDescription className="text-[12px]">
                No tasks match this view yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </section>
  );
}
