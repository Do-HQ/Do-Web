"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Mail,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceReports from "@/hooks/use-workspace-reports";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { AI_DEFAULT_ESTIMATED_COSTS } from "@/lib/helpers/ai-token-cost";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  REPORT_STATUS_OPTIONS,
  REPORT_TYPE_OPTIONS,
  STATUS_BADGE_CLASS,
  formatReportTypeLabel,
} from "./report-config";
import dayjs from "dayjs";

const WorkspaceReportsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useWorkspacePermissions();
  const { workspaceId } = useWorkspaceStore();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const workspaceReportsHook = useWorkspaceReports();
  const workspaceProjectHook = useWorkspaceProject();
  const workspaceBilling = useWorkspaceBilling();

  const [reportType, setReportType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [reviewed, setReviewed] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const projectsQuery = workspaceProjectHook.useWorkspaceProjects(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 100,
      search: "",
      archived: false,
    },
  );

  const reportsQuery = workspaceReportsHook.useWorkspaceReportsList(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 40,
      reportType: reportType === "all" ? "" : reportType,
      status: status === "all" ? "" : status,
      projectId: projectId === "all" ? "" : projectId,
      reviewed:
        reviewed === "all" ? undefined : reviewed === "reviewed" ? true : false,
      dateFrom,
      dateTo,
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const regenerateMutation =
    workspaceReportsHook.useRegenerateWorkspaceReport();
  const sendEmailMutation =
    workspaceReportsHook.useResendWorkspaceReportEmail();
  const reviewMutation = workspaceReportsHook.useMarkWorkspaceReportReviewed();
  const billingSummaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    normalizedWorkspaceId,
    undefined,
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const reports = reportsQuery.data?.data?.reports || [];
  const projectRecords = projectsQuery.data?.data?.projects || [];
  const tokenBalance = Number(
    billingSummaryQuery.data?.data?.workspace?.tokens?.balance || 0,
  );
  const estimatedReportTokenCost = AI_DEFAULT_ESTIMATED_COSTS.reportGeneration;

  const canManage = permissions.isAdminLike;

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

  const syncSingleReportInListCache = (nextReport: Record<string, unknown> | undefined) => {
    if (!nextReport || typeof nextReport !== "object") {
      return;
    }

    const nextReportId = String(nextReport.id || "").trim();
    if (!nextReportId) {
      return;
    }

    queryClient.setQueriesData(
      {
        queryKey: ["workspace-reports", normalizedWorkspaceId],
      },
      (current: unknown) => {
        if (!current || typeof current !== "object") {
          return current;
        }

        const response = current as {
          data?: { reports?: Array<Record<string, unknown>> };
        };
        const reportsInCache = Array.isArray(response?.data?.reports)
          ? response.data.reports
          : null;
        if (!reportsInCache) {
          return current;
        }

        return {
          ...(current as Record<string, unknown>),
          data: {
            ...(response.data || {}),
            reports: reportsInCache.map((entry) => {
              const entryId = String(entry?.id || "").trim();
              if (entryId !== nextReportId) {
                return entry;
              }

              return {
                ...entry,
                title: nextReport.title ?? entry.title,
                status: nextReport.status ?? entry.status,
                isReviewed: nextReport.isReviewed ?? entry.isReviewed,
                isReviewedByMe:
                  nextReport.isReviewedByMe ?? entry.isReviewedByMe,
                reviewedCount: nextReport.reviewedCount ?? entry.reviewedCount,
                emailDeliveryStatus:
                  nextReport.emailDeliveryStatus ?? entry.emailDeliveryStatus,
                updatedAt: nextReport.updatedAt ?? entry.updatedAt,
              };
            }),
          },
        };
      },
    );
  };

  const handleRegenerate = async (reportId: string) => {
    if (!ensureReportTokenBudget()) {
      return;
    }

    const request = regenerateMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      reportId,
    });

    try {
      await toast.promise(request, {
        loading: "Regenerating report...",
        success: (response) =>
          response?.data?.message || "Report regenerated successfully.",
        error: "We could not regenerate this report.",
      });
      const response = await request;

      syncSingleReportInListCache(response?.data?.report);
      await refreshReports();
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  const handleSendEmail = async (reportId: string) => {
    const request = sendEmailMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      reportId,
    });

    try {
      await toast.promise(request, {
        loading: "Sending report email...",
        success: (response) =>
          response?.data?.message || "Report email queued successfully.",
        error: "We could not send this report email.",
      });
      const response = await request;

      syncSingleReportInListCache(response?.data?.report);
      await refreshReports();
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  const handleToggleReviewed = async ({
    reportId,
    reviewed,
  }: {
    reportId: string;
    reviewed: boolean;
  }) => {
    const request = reviewMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      reportId,
      reviewed,
    });

    try {
      await toast.promise(request, {
        loading: reviewed
          ? "Marking as reviewed..."
          : "Marking as unreviewed...",
        success: "Review state updated.",
        error: "We could not update review state.",
      });
      const response = await request;

      syncSingleReportInListCache(response?.data?.report);
      await refreshReports();
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  const refreshReports = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["workspace-reports", normalizedWorkspaceId],
    });
    await queryClient.refetchQueries({
      queryKey: ["workspace-reports", normalizedWorkspaceId],
      type: "active",
    });
  };

  const handleRefreshReports = async () => {
    const request = refreshReports();
    try {
      await toast.promise(request, {
        loading: "Refreshing reports...",
        success: "Reports refreshed.",
        error: "We could not refresh reports right now.",
      });
    } catch {
      // Error handled by toast + mutation error handler.
    }
  };

  const filterBar = (
    <Card className="border-none shadow-none">
      <CardContent className="flex flex-wrap justify-end gap-2.5">
        <div className="w-full space-y-1.5 sm:w-[11rem]">
          <Label className="text-xs">Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {REPORT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-1.5 sm:w-[11rem]">
          <Label className="text-xs">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectRecords.map((project) => (
                <SelectItem
                  key={String(project.projectId || "")}
                  value={String(project.projectId || "")}
                >
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-1.5 sm:w-[10rem]">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {REPORT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-1.5 sm:w-[10rem]">
          <Label className="text-xs">Review state</Label>
          <Select value={reviewed} onValueChange={setReviewed}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="unreviewed">Unreviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-1.5 sm:w-[10rem]">
          <Label className="text-xs">Date from</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-full space-y-1.5 sm:w-[10rem]">
          <Label className="text-xs">Date to</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );

  if (!permissions.workspaceId) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Reports will appear here once your scheduled briefings begin. Create
            a report schedule to start receiving project intelligence
            automatically.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/settings/reports")}
          >
            <Settings2 className="mr-1.5 size-4" />
            Manage schedules
          </Button>
          <Button variant="outline" onClick={() => void handleRefreshReports()}>
            <RefreshCcw className="mr-1.5 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {filterBar}

      {reportsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={`report-skeleton-${index}`}
              className="h-32 w-full"
            />
          ))}
        </div>
      ) : reports.length < 1 ? (
        <Empty className="border-border/70 bg-card border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No reports found</EmptyTitle>
            <EmptyDescription>
              Reports will appear here once your scheduled briefings begin.
              Create a report schedule to start receiving project intelligence
              automatically.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push("/settings/reports/new")}>
              Create report schedule
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="border-border/70 shadow-none p-0">
              <CardContent className="flex flex-col gap-3 py-2 px-4">
                <div className="flex flex-wrap items-center gap-2 ">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-6">
                      {report.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatReportTypeLabel(report.reportType)}
                      {report.project?.name
                        ? ` · ${report.project.name}`
                        : " · Workspace"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border capitalize",
                        STATUS_BADGE_CLASS[report.status] ||
                          STATUS_BADGE_CLASS.PENDING,
                      )}
                    >
                      {report.status?.toLowerCase()}
                    </Badge>
                    <Badge
                      variant={
                        (report.reviewedCount || 0) > 0
                          ? "default"
                          : "secondary"
                      }
                    >
                      {(report.reviewedCount || 0) > 0
                        ? `${report.reviewedCount} reviewed`
                        : "Unreviewed"}
                    </Badge>
                  </div>

                  <div className="flex">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="p-0">
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/reports/${encodeURIComponent(report.id)}`,
                            )
                          }
                        >
                          <ArrowRight className="size-4" />
                          View report
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            void handleToggleReviewed({
                              reportId: report.id,
                              reviewed: !report.isReviewedByMe,
                            })
                          }
                        >
                          <ShieldCheck className="size-4" />
                          {report.isReviewedByMe
                            ? "Remove my review"
                            : "Mark as reviewed"}
                        </DropdownMenuItem>
                        {canManage ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={regenerateMutation.isPending}
                              onClick={() => void handleRegenerate(report.id)}
                            >
                              <RefreshCcw className="size-4" />
                              Regenerate (~{estimatedReportTokenCost})
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={sendEmailMutation.isPending}
                              onClick={() => void handleSendEmail(report.id)}
                            >
                              <Mail className="size-4" />
                              Send email
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="text-muted-foreground grid gap-1 text-xs md:grid-cols-4">
                  <p>
                    Generated:{" "}
                    <span className="text-foreground">
                      {dayjs(report.createdAt).format("Do MMMM, YYYY")}
                    </span>
                  </p>
                  <p>
                    Period start:{" "}
                    <span className="text-foreground">
                      {dayjs(report.periodStart).format("Do MMMM, YYYY")}
                    </span>
                  </p>
                  <p>
                    Period end:{" "}
                    <span className="text-foreground">
                      {dayjs(report.periodEnd).format("Do MMMM, YYYY")}
                    </span>
                  </p>
                  <p>
                    Email:{" "}
                    <span className="text-foreground capitalize">
                      {report.emailDeliveryStatus
                        ?.replaceAll("_", " ")
                        ?.toLowerCase()}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceReportsPage;
