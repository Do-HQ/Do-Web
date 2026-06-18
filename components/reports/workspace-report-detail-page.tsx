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

const formatTimelineEntry = (raw: string): string => {
  const SEP = " — ";
  const parts = raw.split(SEP);
  if (!parts.length) return raw;

  const maybeIso = parts[0].trim();
  const parsed = new Date(maybeIso);
  if (Number.isNaN(parsed.getTime())) return raw;

  const formatted = dayjs(parsed).format("D MMM YYYY [·] h:mm A");
  return [formatted, ...parts.slice(1)].join(SEP);
};

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

    toast.error("Not enough AI credits", {
      description: `This action needs about ${estimatedReportTokenCost.toLocaleString()} credits, but your workspace has ${workspaceTokenBalance.toLocaleString()} left.`,
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
      eventTimeline: listFromUnknown(structuredInsights?.eventTimeline).map(formatTimelineEntry),
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

  const handleExportPdf = () => {
    if (typeof window === "undefined" || !report) return;

    const title = String(report.title || "Report").trim();
    const generatedDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const section = (heading: string, body: string) =>
      body.trim()
        ? `<div class="section"><h2>${esc(heading)}</h2>${body}</div>`
        : "";

    const bulletList = (items: string[]) =>
      items.length
        ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
        : "";

    const reviewerNames = reviewers
      .map((r) => esc(r.name || ""))
      .filter(Boolean)
      .join(", ");

    const metricRows = metricsCards
      .map(
        (m) =>
          `<div class="metric-card"><div class="metric-label">${esc(m.label)}</div><div class="metric-value">${esc(m.value)}</div></div>`,
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Could not open print window. Check your pop-up settings.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)} – Squircle</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #111827; background: #fff; padding: 36px 44px; max-width: 860px; margin: 0 auto; }
    .pdf-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 24px; }
    .pdf-logo { font-weight: 800; font-size: 20px; letter-spacing: -0.5px; color: #111827; }
    .pdf-meta { font-size: 11px; color: #6b7280; text-align: right; line-height: 1.6; }
    .report-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #111827; }
    .report-sub { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
    .badges { margin-bottom: 16px; }
    .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 100px; border: 1px solid #d1d5db; text-transform: capitalize; margin-right: 6px; color: #374151; }
    .dates { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #6b7280; margin-bottom: 8px; }
    .dates span { font-weight: 600; color: #111827; }
    .reviewers { font-size: 12px; color: #374151; margin: 8px 0 4px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
    .metric-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .metric-label { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
    .metric-value { font-size: 15px; font-weight: 700; color: #111827; }
    .section { margin-top: 20px; }
    h2 { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
    p { line-height: 1.65; margin-bottom: 6px; color: #374151; font-size: 13px; }
    ul { padding-left: 18px; margin-bottom: 6px; }
    li { line-height: 1.65; color: #374151; margin-bottom: 2px; font-size: 13px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 4px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    @media print { body { padding: 0; } @page { margin: 18mm 14mm; size: A4; } }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-logo">Squircle</div>
    <div class="pdf-meta">
      <div>Exported ${esc(generatedDate)}</div>
      <div>squircle.live</div>
    </div>
  </div>

  <div class="report-title">${esc(title)}</div>
  <div class="report-sub">${esc(formatReportTypeLabel(report.reportType))}${report.project?.name ? ` · ${esc(report.project.name)}` : " · Workspace"}</div>

  <div class="badges">
    <span class="badge">${esc(report.status?.toLowerCase() ?? "pending")}</span>
    <span class="badge">${(report.reviewedCount || 0) > 0 ? `${report.reviewedCount} reviewed` : "Unreviewed"}</span>
    <span class="badge">Email: ${esc(report.emailDeliveryStatus?.toLowerCase() ?? "-")}</span>
  </div>

  <div class="dates">
    <div>Period start<br/><span>${esc(dayjs(report.periodStart).format("Do MMMM, YYYY"))}</span></div>
    <div>Period end<br/><span>${esc(dayjs(report.periodEnd).format("Do MMMM, YYYY"))}</span></div>
    <div>Generated<br/><span>${esc(dayjs(report.createdAt).format("Do MMMM, YYYY"))}</span></div>
  </div>

  ${reviewerNames ? `<div class="reviewers"><strong>Reviewed by:</strong> ${reviewerNames}</div>` : ""}

  ${section("Executive Summary", sections.executiveSummary ? `<p>${esc(sections.executiveSummary)}</p>` : "")}

  ${sections.fallbackNotice ? `<p style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;font-size:12px;margin-top:12px;">${esc(sections.fallbackNotice)}</p>` : ""}

  <div class="section">
    <h2>Metrics</h2>
    <div class="metrics">${metricRows}</div>
  </div>

  ${sections.eventTypeBreakdown.length ? section("Event Breakdown", bulletList(sections.eventTypeBreakdown)) : ""}

  <hr/>

  <div class="two-col">
    <div>
      ${section("Progress", [sections.progressSummary ? `<p>${esc(sections.progressSummary)}</p>` : "", bulletList(sections.highlights)].join(""))}
    </div>
    <div>
      ${section("Blockers", [sections.blockersSummary ? `<p>${esc(sections.blockersSummary)}</p>` : "", bulletList(sections.blockers)].join(""))}
    </div>
    <div>
      ${section("Risks", [sections.risksSummary ? `<p>${esc(sections.risksSummary)}</p>` : "", bulletList(sections.risks)].join(""))}
    </div>
    <div>
      ${section("Recommendations", bulletList(sections.recommendations))}
    </div>
  </div>

  ${sections.eventTimeline.length ? `<hr/>${section("Event Timeline", bulletList(sections.eventTimeline))}` : ""}

  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body>
</html>`);
    printWindow.document.close();
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
        <div className="space-y-1 w-full">
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
                className="h-auto border-none min-w-full bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  Regenerate (~{estimatedReportTokenCost} credits)
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

            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="mr-1.5 size-3.5" />
              Export PDF
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
              {report.isReviewedByMe ? "Reviewed by me" : "Mark as reviewed"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceReportDetailPage;
