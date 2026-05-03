"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import useWorkspaceReports from "@/hooks/use-workspace-reports";
import useWorkspaceSpace from "@/hooks/use-workspace-space";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { AI_DEFAULT_ESTIMATED_COSTS } from "@/lib/helpers/ai-token-cost";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
import MessageMarkdown from "@/components/ask-squircle/components/message-markdown";
import { AppHeaderSlot } from "@/components/layout/app-header-slot";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASS, formatReportTypeLabel } from "./report-config";
import dayjs from "dayjs";

type WorkspaceReportDetailPageProps = {
  reportId: string;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const toTextFromUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const maybeRecord = value as Record<string, unknown>;
    const preferred = [
      maybeRecord.text,
      maybeRecord.recommendation,
      maybeRecord.action,
      maybeRecord.title,
      maybeRecord.summary,
      maybeRecord.description,
      maybeRecord.label,
    ];

    for (const candidate of preferred) {
      const text = typeof candidate === "string" ? candidate.trim() : "";
      if (text) {
        return text;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
};

const listFromUnknown = (value: unknown) =>
  Array.isArray(value)
    ? value.map((entry) => toTextFromUnknown(entry)).filter(Boolean)
    : [];

const toMarkdownList = (items: string[]) =>
  items.length ? items.map((entry) => `- ${entry}`).join("\n") : "";

const WorkspaceReportDetailPage = ({
  reportId,
}: WorkspaceReportDetailPageProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useWorkspacePermissions();
  const { workspaceId } = useWorkspaceStore();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const workspaceReports = useWorkspaceReports();
  const workspaceBilling = useWorkspaceBilling();
  const workspaceSpace = useWorkspaceSpace();

  const reportQuery = workspaceReports.useWorkspaceReportDetail(
    normalizedWorkspaceId,
    reportId,
    {
      enabled: !!normalizedWorkspaceId && !!reportId,
    },
  );
  const billingSummaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    normalizedWorkspaceId,
    undefined,
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const regenerateMutation = workspaceReports.useRegenerateWorkspaceReport();
  const sendEmailMutation = workspaceReports.useResendWorkspaceReportEmail();
  const reviewMutation = workspaceReports.useMarkWorkspaceReportReviewed();
  const renameMutation = workspaceReports.useRenameWorkspaceReport();
  const createRoomMutation = workspaceSpace.useCreateWorkspaceSpaceRoom();
  const [reportTitleDraft, setReportTitleDraft] = useState("");

  const report = reportQuery.data?.data?.report;
  const reviewers = Array.isArray(report?.reviewers) ? report.reviewers : [];
  const visibleReviewers = reviewers.slice(0, 6);
  const hiddenReviewerCount = Math.max(
    0,
    reviewers.length - visibleReviewers.length,
  );

  const canManage = permissions.isAdminLike;
  const estimatedReportTokenCost = AI_DEFAULT_ESTIMATED_COSTS.reportGeneration;
  const workspaceTokenBalance = Number(
    billingSummaryQuery.data?.data?.workspace?.tokens?.balance || 0,
  );

  const ensureReportTokenBudget = () => {
    if (!billingSummaryQuery.isSuccess) {
      return true;
    }

    if (workspaceTokenBalance >= estimatedReportTokenCost) {
      return true;
    }

    toast.error("Not enough AI tokens", {
      description: `This action needs about ${estimatedReportTokenCost.toLocaleString()} tokens, but your workspace has ${workspaceTokenBalance.toLocaleString()} left.`,
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

  useEffect(() => {
    if (!report?.title) {
      return;
    }
    setReportTitleDraft(report.title);
  }, [report?.title]);

  const persistReportTitle = async () => {
    if (!canManage || !report) {
      return;
    }

    const currentTitle = String(report.title || "").trim();
    const nextTitle = String(reportTitleDraft || "").trim();

    if (!nextTitle) {
      setReportTitleDraft(currentTitle || "Untitled report");
      return;
    }

    if (nextTitle === currentTitle) {
      return;
    }

    const request = renameMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      reportId,
      title: nextTitle,
    });

    try {
      await toast.promise(request, {
        loading: "Renaming report...",
        success: (payload) =>
          payload?.data?.message || "Report renamed successfully.",
        error: "We could not rename this report.",
      });
      const response = await request;
      syncReportCaches(response?.data?.report);
      await refreshQueries();
    } catch {
      setReportTitleDraft(currentTitle || "Untitled report");
    }
  };

  const sections = useMemo(() => {
    const aiSummary = report?.aiSummary || {};
    const structuredInsights = report?.structuredInsights || {};

    return {
      executiveSummary:
        String(aiSummary?.executiveSummary || "").trim() ||
        String(structuredInsights?.executiveSummary || "").trim(),
      progressSummary: String(aiSummary?.progressSummary || "").trim(),
      blockersSummary: String(aiSummary?.blockersSummary || "").trim(),
      risksSummary: String(aiSummary?.risksSummary || "").trim(),
      recommendations:
        listFromUnknown(aiSummary?.recommendations).length > 0
          ? listFromUnknown(aiSummary?.recommendations)
          : listFromUnknown(report?.recommendations),
      highlights: listFromUnknown(structuredInsights?.highlights),
      blockers: listFromUnknown(structuredInsights?.blockers),
      risks: listFromUnknown(structuredInsights?.risks),
      fallbackNotice: String(structuredInsights?.fallbackNotice || "").trim(),
      eventTimeline: listFromUnknown(structuredInsights?.eventTimeline),
      eventTypeBreakdown: listFromUnknown(
        structuredInsights?.eventTypeBreakdown,
      ),
      highlightsMarkdown: toMarkdownList(
        listFromUnknown(structuredInsights?.highlights),
      ),
      blockersMarkdown: toMarkdownList(
        listFromUnknown(structuredInsights?.blockers),
      ),
      risksMarkdown: toMarkdownList(listFromUnknown(structuredInsights?.risks)),
      recommendationsMarkdown: toMarkdownList(
        listFromUnknown(aiSummary?.recommendations).length > 0
          ? listFromUnknown(aiSummary?.recommendations)
          : listFromUnknown(report?.recommendations),
      ),
    };
  }, [report?.aiSummary, report?.recommendations, report?.structuredInsights]);

  const metrics =
    report?.rawMetrics && typeof report.rawMetrics === "object"
      ? (report.rawMetrics as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const metricsCards = [
    { label: "Tasks completed", value: Number(metrics?.tasksCompleted || 0) },
    { label: "Tasks created", value: Number(metrics?.tasksCreated || 0) },
    { label: "Blocked tasks", value: Number(metrics?.blockedTasks || 0) },
    { label: "Overdue tasks", value: Number(metrics?.overdueTasks || 0) },
    {
      label: "Progress",
      value: `${Number(metrics?.projectProgressPercentage || 0)}%`,
    },
    { label: "Open risks", value: Number(metrics?.unresolvedRisks || 0) },
  ];

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-report-detail", normalizedWorkspaceId, reportId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-reports", normalizedWorkspaceId],
      }),
    ]);
  };

  const syncReportCaches = (
    nextReport: Record<string, unknown> | undefined,
  ) => {
    if (!nextReport || typeof nextReport !== "object") {
      return;
    }

    const nextReportId = String(nextReport.id || "").trim();
    if (!nextReportId) {
      return;
    }

    queryClient.setQueryData(
      ["workspace-report-detail", normalizedWorkspaceId, reportId],
      (current: unknown) => {
        if (!current || typeof current !== "object") {
          return current;
        }

        return {
          ...(current as Record<string, unknown>),
          data: {
            ...((current as { data?: Record<string, unknown> }).data || {}),
            report: nextReport,
          },
        };
      },
    );

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
        const reports = Array.isArray(response?.data?.reports)
          ? response.data.reports
          : null;

        if (!reports) {
          return current;
        }

        return {
          ...(current as Record<string, unknown>),
          data: {
            ...(response.data || {}),
            reports: reports.map((entry) => {
              const entryId = String(entry?.id || "").trim();
              if (entryId !== nextReportId) {
                return entry;
              }

              return {
                ...entry,
                title: nextReport.title ?? entry.title,
                status: nextReport.status ?? entry.status,
                emailDeliveryStatus:
                  nextReport.emailDeliveryStatus ?? entry.emailDeliveryStatus,
                isReviewed: nextReport.isReviewed ?? entry.isReviewed,
                reviewedCount: nextReport.reviewedCount ?? entry.reviewedCount,
                isReviewedByMe:
                  nextReport.isReviewedByMe ?? entry.isReviewedByMe,
                updatedAt: nextReport.updatedAt ?? entry.updatedAt,
              };
            }),
          },
        };
      },
    );
  };

  const handleMessageReviewer = async (reviewerUserId: string) => {
    const normalizedReviewerUserId = String(reviewerUserId || "").trim();
    if (!normalizedWorkspaceId || !normalizedReviewerUserId) {
      return;
    }

    const request = createRoomMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      payload: {
        kind: "direct",
        memberUserIds: [normalizedReviewerUserId],
      },
    });

    let response = null;
    try {
      await toast.promise(request, {
        loading: "Opening direct chat...",
        success: "Direct chat ready.",
        error: "We could not open a direct chat right now.",
      });
      response = await request;
    } catch {
      return;
    }

    const roomId = String(response?.data?.room?.id || "").trim();
    if (!roomId) {
      return;
    }

    router.push(`${ROUTES.SPACES}?room=${encodeURIComponent(roomId)}`);
  };

  if (reportQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="border-border/70 mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Report not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/reports")} variant="outline">
            Back to reports
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <AppHeaderSlot targetId="app-header-title-slot">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/reports">Reports</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[16rem] sm:max-w-[24rem]">
                {report.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </AppHeaderSlot>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => router.push("/reports")}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {canManage ? (
              <Input
                value={reportTitleDraft}
                onChange={(event) => setReportTitleDraft(event.target.value)}
                onBlur={() => void persistReportTitle()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    setReportTitleDraft(String(report.title || "").trim());
                    event.currentTarget.blur();
                  }
                }}
                maxLength={180}
                disabled={renameMutation.isPending}
                placeholder="Untitled report"
                className="h-auto border-none min-w-150 bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              report.title
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatReportTypeLabel(report.reportType)}
            {report.project?.name
              ? ` · ${report.project.name}`
              : " · Workspace"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "border capitalize",
              STATUS_BADGE_CLASS[report.status] || STATUS_BADGE_CLASS.PENDING,
            )}
          >
            {report.status?.toLowerCase()}
          </Badge>
          <Badge
            variant={(report.reviewedCount || 0) > 0 ? "default" : "secondary"}
          >
            {(report.reviewedCount || 0) > 0
              ? `${report.reviewedCount} reviewed`
              : "Unreviewed"}
          </Badge>
          <Badge variant="outline" className="capitalize">
            Email: {report.emailDeliveryStatus?.toLowerCase()}
          </Badge>
        </div>
      </div>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4">
          <div className="text-muted-foreground grid gap-2 text-sm md:grid-cols-3">
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
              Generated on:{" "}
              <span className="text-foreground">
                {dayjs(report.createdAt).format("Do MMMM, YYYY")}
              </span>
            </p>
          </div>

          {reviewers.length ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Reviewed by</p>
              <div className="flex items-center gap-2">
                <AvatarGroup className="[--space:0.35rem]">
                  {visibleReviewers.map((reviewer) => {
                    const first =
                      String(reviewer?.name || "")
                        .trim()
                        .split(/\s+/)[0] || "U";
                    const second =
                      String(reviewer?.name || "")
                        .trim()
                        .split(/\s+/)[1] || "";
                    const initials =
                      `${first.charAt(0)}${second.charAt(0)}`.toUpperCase() ||
                      "U";
                    const reviewerEmail = String(reviewer?.email || "").trim();
                    const reviewedAtLabel = reviewer?.reviewedAt
                      ? `Reviewed ${formatDate(reviewer.reviewedAt)}`
                      : "Reviewed";

                    return (
                      <Tooltip
                        key={`${reviewer.userId}-${reviewer.reviewedAt || "reviewed"}`}
                        delayDuration={120}
                      >
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full"
                            aria-label={`Reviewer ${reviewer.name}`}
                          >
                            <Avatar className="size-8 ring-2 ring-background">
                              <AvatarImage
                                src={String(reviewer.avatarUrl || "")}
                                alt={reviewer.name}
                              />
                              <AvatarFallback className="text-[10px]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          sideOffset={8}
                          showArrow={false}
                          className="w-72 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-lg"
                        >
                          <div className="space-y-2">
                            <div className="space-y-0.5">
                              <p className="truncate text-[13px] font-semibold">
                                {reviewer.name}
                              </p>
                              {reviewerEmail ? (
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {reviewerEmail}
                                </p>
                              ) : null}
                            </div>
                            <div className="space-y-1.5 pt-1 text-[11px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                  Status
                                </span>
                                <span className="truncate text-right font-medium">
                                  {reviewedAtLabel}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 border-t pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                onClick={() =>
                                  void handleMessageReviewer(reviewer.userId)
                                }
                                disabled={createRoomMutation.isPending}
                              >
                                Message
                              </Button>
                              {reviewerEmail ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => {
                                    if (typeof window !== "undefined") {
                                      window.location.href = `mailto:${reviewerEmail}`;
                                    }
                                  }}
                                >
                                  Email
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {hiddenReviewerCount > 0 ? (
                    <Tooltip delayDuration={120}>
                      <TooltipTrigger asChild>
                        <AvatarGroupCount className="size-8 text-[10px] font-medium ring-2 ring-background">
                          +{hiddenReviewerCount}
                        </AvatarGroupCount>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        showArrow={false}
                        className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-[11px] text-popover-foreground shadow-lg"
                      >
                        {hiddenReviewerCount} more reviewer
                        {hiddenReviewerCount === 1 ? "" : "s"}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </AvatarGroup>
              </div>
            </div>
          ) : null}

          {sections.executiveSummary ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Executive Summary</p>
              <MessageMarkdown
                content={sections.executiveSummary}
                className="text-muted-foreground text-sm leading-6"
              />
            </div>
          ) : null}

          {sections.fallbackNotice ? (
            <div className="border-border/70 bg-muted/40 rounded-md border px-3 py-2 text-sm">
              {sections.fallbackNotice}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {metricsCards.map((metric) => (
              <div
                key={metric.label}
                className="border-border/70 rounded-md border px-3 py-2.5"
              >
                <p className="text-muted-foreground text-xs">{metric.label}</p>
                <p className="text-sm font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>

          <Separator />

          {sections.eventTypeBreakdown.length ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Event Breakdown</p>
              <MessageMarkdown
                content={toMarkdownList(sections.eventTypeBreakdown)}
                className="text-muted-foreground text-sm leading-6"
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Progress</p>
              <MessageMarkdown
                content={
                  sections.progressSummary || "No progress summary available."
                }
                className="text-muted-foreground text-sm leading-6"
              />
              {sections.highlightsMarkdown ? (
                <MessageMarkdown
                  content={sections.highlightsMarkdown}
                  className="text-muted-foreground text-sm leading-6"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Blockers</p>
              <MessageMarkdown
                content={
                  sections.blockersSummary || "No blockers summary available."
                }
                className="text-muted-foreground text-sm leading-6"
              />
              {sections.blockersMarkdown ? (
                <MessageMarkdown
                  content={sections.blockersMarkdown}
                  className="text-muted-foreground text-sm leading-6"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Risks</p>
              <MessageMarkdown
                content={sections.risksSummary || "No risks summary available."}
                className="text-muted-foreground text-sm leading-6"
              />
              {sections.risksMarkdown ? (
                <MessageMarkdown
                  content={sections.risksMarkdown}
                  className="text-muted-foreground text-sm leading-6"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Recommendations</p>
              {sections.recommendationsMarkdown ? (
                <MessageMarkdown
                  content={sections.recommendationsMarkdown}
                  className="text-muted-foreground text-sm leading-6"
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No recommendations available.
                </p>
              )}
            </div>
          </div>

          {sections.eventTimeline.length ? (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Event Timeline</p>
                <MessageMarkdown
                  content={toMarkdownList(sections.eventTimeline)}
                  className="text-muted-foreground text-sm leading-6"
                />
              </div>
            </>
          ) : null}

          <details className="border-border/70 rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Raw metrics
            </summary>
            <pre className="border-border/60 max-h-96 overflow-auto border-t p-3 text-xs leading-6">
              {JSON.stringify(report.rawMetrics, null, 2)}
            </pre>
          </details>

          <div className="flex flex-wrap gap-2 pt-1">
            {canManage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={regenerateMutation.isPending}
                  onClick={async () => {
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
                          response?.data?.message ||
                          "Report regenerated successfully.",
                        error: "We could not regenerate this report.",
                      });
                      const response = await request;
                      syncReportCaches(response?.data?.report);
                      await refreshQueries();
                    } catch {
                      // Error handled by toast + mutation error handler.
                    }
                  }}
                >
                  <RefreshCcw className="mr-1.5 size-3.5" />
                  Regenerate (~{estimatedReportTokenCost})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendEmailMutation.isPending}
                  onClick={async () => {
                    const request = sendEmailMutation.mutateAsync({
                      workspaceId: normalizedWorkspaceId,
                      reportId,
                    });

                    try {
                      await toast.promise(request, {
                        loading: "Sending report email...",
                        success: (response) =>
                          response?.data?.message ||
                          "Report email queued successfully.",
                        error: "We could not send this report email.",
                      });
                      const response = await request;
                      syncReportCaches(response?.data?.report);
                      await refreshQueries();
                    } catch {
                      // Error handled by toast + mutation error handler.
                    }
                  }}
                >
                  <Mail className="mr-1.5 size-3.5" />
                  Send email again
                </Button>
              </>
            ) : null}

            <Button variant="outline" size="sm" disabled>
              <Download className="mr-1.5 size-3.5" />
              Export (Soon)
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={reviewMutation.isPending}
              onClick={async () => {
                const request = reviewMutation.mutateAsync({
                  workspaceId: normalizedWorkspaceId,
                  reportId,
                  reviewed: !report.isReviewedByMe,
                });
                try {
                  await toast.promise(request, {
                    loading: report.isReviewedByMe
                      ? "Removing your review..."
                      : "Marking as reviewed...",
                    success: "Review state updated.",
                    error: "We could not update review state.",
                  });
                  const response = await request;
                  syncReportCaches(response?.data?.report);
                  await refreshQueries();
                } catch {
                  // Error handled by toast + mutation error handler.
                }
              }}
            >
              <ShieldCheck className="mr-1.5 size-3.5" />
              {report.isReviewedByMe ? "Remove my review" : "Mark as reviewed"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceReportDetailPage;
