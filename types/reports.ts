export type WorkspaceReportType =
  | "WORKSPACE_SUMMARY"
  | "PROJECT_HEALTH"
  | "TEAM_PERFORMANCE"
  | "BLOCKERS_AND_RISKS"
  | "OVERDUE_TASKS"
  | "EXECUTIVE_SUMMARY";

export type WorkspaceReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

export type WorkspaceReportDeliveryChannel = "DASHBOARD" | "EMAIL";

export type WorkspaceReportStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";

export type WorkspaceReportEmailStatus =
  | "NOT_REQUESTED"
  | "PENDING"
  | "SENT"
  | "FAILED";

export type WorkspaceReportGeneratedBy = "SYSTEM" | "USER";

export type WorkspaceReportReviewer = {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  reviewedAt: string | null;
};

export type WorkspaceReportSchedule = {
  id: string;
  workspaceId: string;
  projectId?: string;
  reportName: string;
  reportType: WorkspaceReportType;
  frequency: WorkspaceReportFrequency;
  timeOfDay: string;
  timezone: string;
  recipients: string[];
  recipientUserIds?: string[];
  deliveryChannels: WorkspaceReportDeliveryChannel[];
  customIntervalMinutes?: number;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
};

export type WorkspaceReportListItem = {
  id: string;
  title: string;
  reportType: WorkspaceReportType;
  status: WorkspaceReportStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  generatedBy: WorkspaceReportGeneratedBy;
  project?: {
    id: string;
    name: string;
  } | null;
  emailDeliveryStatus: WorkspaceReportEmailStatus;
  isReviewed: boolean;
  reviewedCount?: number;
  isReviewedByMe?: boolean;
};

export type WorkspaceReportDetail = {
  id: string;
  title: string;
  status: WorkspaceReportStatus;
  reportType: WorkspaceReportType;
  generatedBy: WorkspaceReportGeneratedBy;
  periodStart: string;
  periodEnd: string;
  rawMetrics: Record<string, unknown>;
  structuredInsights: Record<string, unknown>;
  aiSummary: {
    title?: string;
    executiveSummary?: string;
    progressSummary?: string;
    blockersSummary?: string;
    risksSummary?: string;
    recommendations?: string[];
    closingNote?: string;
  };
  recommendations: string[];
  emailDeliveryStatus: WorkspaceReportEmailStatus;
  recipients: string[];
  recipientUserIds?: string[];
  errorMessage?: string;
  generatedWithFallback?: boolean;
  fallbackReason?: string;
  isReviewed: boolean;
  reviewedCount?: number;
  isReviewedByMe?: boolean;
  reviewedAt: string | null;
  reviewers?: WorkspaceReportReviewer[];
  project?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceReportScheduleRequestBody = {
  reportName: string;
  reportType: WorkspaceReportType;
  frequency: WorkspaceReportFrequency;
  timeOfDay: string;
  timezone: string;
  projectId?: string;
  recipients?: string[];
  recipientUserIds?: string[];
  deliveryChannels?: WorkspaceReportDeliveryChannel[];
  customIntervalMinutes?: number;
  isActive?: boolean;
};

export type UpdateWorkspaceReportScheduleRequestBody =
  Partial<CreateWorkspaceReportScheduleRequestBody>;

export type WorkspaceReportSchedulesResponse = {
  message: string;
  schedules: WorkspaceReportSchedule[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type WorkspaceReportScheduleResponse = {
  message: string;
  schedule: WorkspaceReportSchedule;
};

export type WorkspaceRunScheduleResponse = {
  message: string;
  reused: boolean;
  report: WorkspaceReportDetail;
};

export type RunWorkspaceProjectReportNowRequestBody = {
  reportType?: WorkspaceReportType;
  deliveryChannels?: WorkspaceReportDeliveryChannel[];
  recipients?: string[];
  recipientUserIds?: string[];
  periodStart?: string;
  periodEnd?: string;
};

export type WorkspaceRunProjectReportNowResponse = WorkspaceRunScheduleResponse;

export type WorkspaceReportsResponse = {
  message: string;
  reports: WorkspaceReportListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type WorkspaceReportResponse = {
  message: string;
  report: WorkspaceReportDetail;
};
