"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Clock3,
  FileClock,
  Pause,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

    toast.error("Not enough AI tokens", {
      description: `This action needs about ${estimatedReportTokenCost.toLocaleString()} tokens, but your workspace has ${tokenBalance.toLocaleString()} left.`,
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
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`schedule-skeleton-${index}`}
              className="h-44 w-full"
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
        <div className="grid gap-3 md:grid-cols-2">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-6">
                      {schedule.reportName}
                    </CardTitle>
                    <CardDescription>
                      {formatReportTypeLabel(schedule.reportType)}
                    </CardDescription>
                  </div>
                  <Badge variant={schedule.isActive ? "default" : "secondary"}>
                    {schedule.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                  <p>
                    Frequency:{" "}
                    <span className="text-foreground">
                      {schedule.frequency}
                    </span>
                  </p>
                  <p>
                    Time:{" "}
                    <span className="text-foreground">
                      {schedule.timeOfDay}
                    </span>
                  </p>
                  <p>
                    Last run:{" "}
                    <span className="text-foreground">
                      {formatDateTime(schedule.lastRunAt)}
                    </span>
                  </p>
                  <p>
                    Next run:{" "}
                    <span className="text-foreground">
                      {formatDateTime(schedule.nextRunAt)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={async () => {
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
                            response?.data?.message ||
                            "Report generation queued successfully.",
                          error: "We could not run this schedule right now.",
                        });
                        await invalidateAll();
                      } catch {
                        // Error handled by toast + mutation error handler.
                      }
                    }}
                  >
                    <Rocket className="mr-1.5 size-3.5" />
                    Run now · ~{estimatedReportTokenCost}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={async () => {
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
                            response?.data?.message ||
                            "Schedule updated successfully.",
                          error: "We could not update this schedule.",
                        });
                        await invalidateAll();
                      } catch {
                        // Error handled by toast + mutation error handler.
                      }
                    }}
                  >
                    {schedule.isActive ? (
                      <Pause className="mr-1.5 size-3.5" />
                    ) : (
                      <Play className="mr-1.5 size-3.5" />
                    )}
                    {schedule.isActive ? "Pause" : "Resume"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/settings/reports/${encodeURIComponent(schedule.id)}`,
                      )
                    }
                  >
                    <Clock3 className="mr-1.5 size-3.5" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={isBusy}
                    onClick={async () => {
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
                    }}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
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
