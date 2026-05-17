"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CircleDot,
  Clock3,
  FileClock,
  Mail,
  MoreHorizontal,
  Pause,
  PanelsTopLeft,
  Play,
  Plus,
  Rocket,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import useWorkspaceReports from "@/hooks/use-workspace-reports";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { AI_DEFAULT_ESTIMATED_COSTS } from "@/lib/helpers/ai-token-cost";
import useWorkspaceStore from "@/stores/workspace";
import type { WorkspaceReportSchedule } from "@/types/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/utils/constants";
import { formatReportTypeLabel } from "./report-config";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const formatFrequencyValue = (
  frequency: string,
  customIntervalMinutes?: number,
) => {
  const normalized = String(frequency || "")
    .trim()
    .toUpperCase();
  if (normalized === "CUSTOM" && Number(customIntervalMinutes) > 0) {
    const minutes = Number(customIntervalMinutes);
    return `Every ${minutes} min`;
  }

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (value) => value.toUpperCase());
};

const formatChannelsValue = (channels: string[]) => {
  if (!Array.isArray(channels) || channels.length < 1) {
    return "Dashboard";
  }

  return channels
    .map((entry) => {
      const normalized = String(entry || "")
        .trim()
        .toUpperCase();
      if (normalized === "EMAIL") {
        return "Email";
      }
      return "Dashboard";
    })
    .filter(Boolean)
    .join(" + ");
};

const WorkspaceReportSchedulesPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const permissions = useWorkspacePermissions();
  const workspaceReports = useWorkspaceReports();
  const workspaceBilling = useWorkspaceBilling();
  const normalizedWorkspaceId = String(workspaceId || "").trim();

  const schedulesQuery = workspaceReports.useWorkspaceReportSchedules(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 100,
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const toggleMutation = workspaceReports.useSetWorkspaceReportScheduleActive();
  const deleteMutation = workspaceReports.useDeleteWorkspaceReportSchedule();
  const runNowMutation = workspaceReports.useRunWorkspaceReportScheduleNow();
  const billingSummaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    normalizedWorkspaceId,
    undefined,
    {
      enabled: !!normalizedWorkspaceId,
    },
  );
  const tokenBalance = Number(
    billingSummaryQuery.data?.data?.workspace?.tokens?.balance || 0,
  );
  const estimatedReportTokenCost = AI_DEFAULT_ESTIMATED_COSTS.reportGeneration;

  const isBusy =
    toggleMutation.isPending ||
    deleteMutation.isPending ||
    runNowMutation.isPending;

  const schedules = schedulesQuery.data?.data?.schedules || [];

  const ensureReportTokenBudget = () => {
    if (!billingSummaryQuery.isSuccess) {
      return true;
    }

    if (tokenBalance >= estimatedReportTokenCost) {
      return true;
    }

    toast.error("Not enough AI credits", {
      description: `This action needs about ${estimatedReportTokenCost.toLocaleString()} credits, but your workspace has ${tokenBalance.toLocaleString()} left.`,
      action: {
        label: "Open billing",
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.assign(ROUTES.SETTINGS_BILLING);
          }
        },
      },
    });

    return false;
  };

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-report-schedules", normalizedWorkspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-reports", normalizedWorkspaceId],
      }),
    ]);
  };

  const handleRunNowSchedule = async (schedule: WorkspaceReportSchedule) => {
    if (!ensureReportTokenBudget()) {
      return;
    }

    const request = runNowMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      scheduleId: schedule.id,
    });

    try {
      await toast.promise(request, {
        loading: "Generating report now...",
        success: (response) =>
          response?.data?.message || "Report generation queued successfully.",
        error: "We could not run this schedule right now.",
      });
      await invalidateAll();
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  const handleToggleSchedule = async (schedule: WorkspaceReportSchedule) => {
    const request = toggleMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      scheduleId: schedule.id,
      isActive: !schedule.isActive,
    });

    try {
      await toast.promise(request, {
        loading: schedule.isActive
          ? "Pausing schedule..."
          : "Resuming schedule...",
        success: (response) =>
          response?.data?.message || "Schedule updated successfully.",
        error: "We could not update this schedule.",
      });
      await invalidateAll();
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  const handleDeleteSchedule = async (schedule: WorkspaceReportSchedule) => {
    if (!window.confirm("Delete this report schedule?")) {
      return;
    }

    const request = deleteMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      scheduleId: schedule.id,
    });

    try {
      await toast.promise(request, {
        loading: "Deleting schedule...",
        success: "Schedule deleted successfully.",
        error: "We could not delete this schedule.",
      });
      await invalidateAll();
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  if (!permissions.isAdminLike) {
    return (
      <Empty className="border-border/70 bg-card w-full border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlert className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Reports settings restricted</EmptyTitle>
          <EmptyDescription>
            Only workspace owners and admins can manage scheduled reports.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Scheduled Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            Create your first scheduled report and Squircle will automatically
            summarize project progress, blockers, and risks for you.
          </p>
        </div>
        <Button onClick={() => router.push("/settings/reports/new")}>
          <Plus className="mr-1.5 size-4" />
          New schedule
        </Button>
      </div>

      {schedulesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`schedule-skeleton-${index}`}
              className="h-28 w-full"
            />
          ))}
        </div>
      ) : schedules.length < 1 ? (
        <Empty className="border-border/70 bg-card border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileClock className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No report schedules yet</EmptyTitle>
            <EmptyDescription>
              Create your first scheduled report and Squircle will automatically
              summarize project progress, blockers, and risks for you.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push("/settings/reports/new")}>
              <Plus className="mr-1.5 size-4" />
              Create schedule
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="border-border/70 w-full">
              <CardContent className="px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <CircleDot
                        className={`size-4 ${
                          schedule.isActive
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <p className="truncate text-sm font-semibold">
                        {schedule.reportName}
                      </p>
                      <Badge
                        variant={schedule.isActive ? "default" : "secondary"}
                        className="h-5 px-1.5 text-[10px]"
                      >
                        {schedule.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span>{formatReportTypeLabel(schedule.reportType)}</span>
                      <span>
                        {formatFrequencyValue(
                          schedule.frequency,
                          schedule.customIntervalMinutes,
                        )}{" "}
                        at {schedule.timeOfDay} ({schedule.timezone})
                      </span>
                      <span>
                        {schedule.project?.name
                          ? `Project: ${schedule.project.name}`
                          : "Workspace-wide"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <p className="text-muted-foreground">
                        Next run:{" "}
                        <span className="text-foreground">
                          {formatDateTime(schedule.nextRunAt)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Last run:{" "}
                        <span className="text-foreground">
                          {formatDateTime(schedule.lastRunAt)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Recipients:{" "}
                        <span className="text-foreground">
                          {(
                            schedule.recipientUserIds ||
                            schedule.recipients ||
                            []
                          ).length || 0}
                        </span>
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        {Array.isArray(schedule.deliveryChannels) &&
                        schedule.deliveryChannels.includes("EMAIL") ? (
                          <Mail className="size-3.5" />
                        ) : (
                          <PanelsTopLeft className="size-3.5" />
                        )}
                        <span className="text-foreground">
                          {formatChannelsValue(schedule.deliveryChannels)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center xl:justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label="Schedule actions"
                          disabled={isBusy}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          disabled={isBusy}
                          onSelect={() => {
                            void handleRunNowSchedule(schedule);
                          }}
                        >
                          <Rocket className="mr-1.5 size-3.5" />
                          Run now · ~{estimatedReportTokenCost} credits
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isBusy}
                          onSelect={() => {
                            void handleToggleSchedule(schedule);
                          }}
                        >
                          {schedule.isActive ? (
                            <Pause className="mr-1.5 size-3.5" />
                          ) : (
                            <Play className="mr-1.5 size-3.5" />
                          )}
                          {schedule.isActive
                            ? "Pause schedule"
                            : "Resume schedule"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(
                              `/settings/reports/${encodeURIComponent(schedule.id)}`,
                            )
                          }
                        >
                          <Clock3 className="mr-1.5 size-3.5" />
                          Edit schedule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isBusy}
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            void handleDeleteSchedule(schedule);
                          }}
                        >
                          <Trash2 className="mr-1.5 size-3.5" />
                          Delete schedule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceReportSchedulesPage;
