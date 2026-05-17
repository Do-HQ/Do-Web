export type StandupSessionStatus = "SCHEDULED" | "OPEN" | "CLOSED" | "SUMMARIZED";
export type StandupParticipantStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "MISSED";
export type StandupAnswerMode = "TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "STATUS_SELECT" | "BOOLEAN" | "ACKNOWLEDGEMENT";

export type StandupSettings = {
  id: string;
  workspaceId: string;
  enabled: boolean;
  timeOfDay: string;
  timezone: string;
  allowedWindowMinutes: number;
  reminderAtHalfWindow: boolean;
  pointsPenaltyForMissing: number;
  includeTasks: boolean;
  includeRisks: boolean;
  includeIssues: boolean;
  includeMentions: boolean;
  includeDocsMentions: boolean;
  includeSpacesMentions: boolean;
  includeJamsMentions: boolean;
  includeCatchupThreads: boolean;
  maxQuestions: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StandupSession = {
  id: string;
  workspaceId: string;
  scheduledKey: string;
  scheduledFor: string | null;
  opensAt: string | null;
  closesAt: string | null;
  status: StandupSessionStatus;
  settingsSnapshot?: Record<string, unknown>;
  metrics?: StandupMetrics;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StandupMetrics = {
  totalParticipants: number;
  submitted: number;
  pending: number;
  inProgress: number;
  missed: number;
  completionRate: number;
};

export type StandupParticipant = {
  id: string;
  workspaceId: string;
  sessionId: string;
  userId: string;
  status: StandupParticipantStatus;
  questionsGeneratedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  missedAt: string | null;
  reminderSentAt: string | null;
  pointsPenaltyAppliedAt: string | null;
  adminNote: string;
  answersCount?: number;
  user?: { id: string; name: string; email?: string; avatarUrl?: string } | null;
  questions?: StandupQuestion[];
  answers?: Array<StandupAnswer & { question?: StandupQuestion | null }>;
  summary?: StandupSummary | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StandupQuestionOption = {
  label: string;
  value: string;
  taskStatus?: string;
};

export type StandupQuestion = {
  id: string;
  questionType: string;
  prompt: string;
  description: string;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedEntityTitle: string;
  projectId: string;
  workflowId: string;
  answerMode: StandupAnswerMode;
  options: StandupQuestionOption[];
  required: boolean;
  order: number;
  aiGenerated: boolean;
};

export type StandupAnswer = {
  id: string;
  questionId: string;
  questionType: string;
  answerMode: StandupAnswerMode;
  answerValue: string | string[] | boolean | number | Record<string, unknown> | null;
  relatedEntityType: string;
  relatedEntityId: string;
  sideEffectStatus: "NONE" | "PENDING" | "APPLIED" | "FAILED";
  sideEffectError: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StandupAttentionItem = {
  id: string;
  type: string;
  title: string;
  summary: string;
  route: string;
  targetKind: string;
  targetLabel: string;
  createdAt: string | null;
};

export type StandupAttentionSummary = {
  count: number;
  title: string;
  overview: string;
  items: StandupAttentionItem[];
};

export type StandupSummary = {
  id: string;
  workspaceId: string;
  sessionId: string;
  participantId: string;
  generatedBy: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  rawMetrics: Record<string, unknown>;
  structuredInsights: Record<string, unknown>;
  aiSummary: {
    title?: string;
    overview?: string;
    teamReadiness?: string;
    progress?: string;
    blockers?: string;
    risks?: string;
    peopleNeedingSupport?: string[];
    recommendedActions?: string[];
    closingNote?: string;
  };
  generatedWithFallback: boolean;
  fallbackReason: string;
  errorMessage: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StandupCurrentResponse = {
  message: string;
  session: StandupSession | null;
  participant: StandupParticipant | null;
  questions: StandupQuestion[];
  answers: StandupAnswer[];
  attentionSummary?: StandupAttentionSummary | null;
};

export type StandupSettingsResponse = {
  message: string;
  settings: StandupSettings;
  nextStandup: { scheduledFor: string; opensAt: string; closesAt: string; scheduledKey: string };
};

export type StandupOverviewResponse = {
  message: string;
  workspace: { id: string; name: string };
  settings: Pick<StandupSettings, "enabled" | "timeOfDay" | "timezone" | "allowedWindowMinutes">;
  nextStandup: { scheduledFor: string; opensAt: string; closesAt: string; scheduledKey: string };
  currentSession: StandupSession | null;
  recentSessions: StandupSession[];
};

export type StandupSessionsResponse = {
  message: string;
  sessions: StandupSession[];
  pagination: { total: number; page: number; limit: number; hasMore: boolean };
};

export type StandupSessionDetailResponse = {
  message: string;
  session: StandupSession;
  metrics: StandupMetrics;
  participants: StandupParticipant[];
  summary: StandupSummary | null;
};
