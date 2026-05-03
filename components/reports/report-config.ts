import type {
  WorkspaceReportDeliveryChannel,
  WorkspaceReportFrequency,
  WorkspaceReportStatus,
  WorkspaceReportType,
} from "@/types/reports";

export const REPORT_TYPE_OPTIONS: Array<{
  value: WorkspaceReportType;
  label: string;
}> = [
  { value: "WORKSPACE_SUMMARY", label: "Workspace Summary" },
  { value: "PROJECT_HEALTH", label: "Project Health" },
  { value: "TEAM_PERFORMANCE", label: "Team Performance" },
  { value: "BLOCKERS_AND_RISKS", label: "Blockers & Risks" },
  { value: "OVERDUE_TASKS", label: "Overdue Tasks" },
  { value: "EXECUTIVE_SUMMARY", label: "Executive Summary" },
];

export const REPORT_FREQUENCY_OPTIONS: Array<{
  value: WorkspaceReportFrequency;
  label: string;
}> = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

export const REPORT_DELIVERY_OPTIONS: Array<{
  value: WorkspaceReportDeliveryChannel;
  label: string;
  description: string;
}> = [
  {
    value: "DASHBOARD",
    label: "Dashboard",
    description: "Save the report inside Squircle so admins can review it anytime.",
  },
  {
    value: "EMAIL",
    label: "Email",
    description: "Deliver a concise briefing by email to selected workspace members.",
  },
];

export const REPORT_STATUS_OPTIONS: Array<{
  value: WorkspaceReportStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Pending" },
  { value: "GENERATING", label: "Generating" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

export const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  GENERATING: "bg-amber-500/12 text-amber-700 border-amber-500/30 dark:text-amber-300",
  COMPLETED: "bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
  SENT: "bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  FAILED_EMAIL: "bg-destructive/15 text-destructive border-destructive/30",
};

export const formatReportTypeLabel = (reportType = "") => {
  const matched = REPORT_TYPE_OPTIONS.find((entry) => entry.value === reportType);
  if (matched) {
    return matched.label;
  }

  return reportType
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
