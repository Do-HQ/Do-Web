export type WorkspaceAiChatRole = "system" | "user" | "assistant";

export type WorkspaceAiPromptMode = "brainstorm" | "plan" | "execute";
export type WorkspaceAiPromptScope = "workspace" | "project" | "workflow";

export type WorkspaceAiChatMessage = {
  role: WorkspaceAiChatRole;
  content: string;
};

export type WorkspaceAiDraftEntity =
  | "workspace"
  | "project"
  | "workflow"
  | "task"
  | "subtask";

export type WorkspaceAiDraftOption = {
  id: string;
  label: string;
};

export type WorkspaceAiDraftContext = {
  workspaceName?: string;
  projectName?: string;
  workflowName?: string;
  taskName?: string;
  startDate?: string;
  dueDate?: string;
  teams?: WorkspaceAiDraftOption[];
  members?: WorkspaceAiDraftOption[];
  pipelines?: WorkspaceAiDraftOption[];
  existingWorkflows?: WorkspaceAiDraftOption[];
};

export type WorkspaceAiGenerateDraftRequestBody = {
  entityType: WorkspaceAiDraftEntity;
  description: string;
  projectId?: string;
  workflowId?: string;
  context?: WorkspaceAiDraftContext;
};

export type WorkspaceAiGenerateDraftResponse = {
  message: string;
  draft: {
    entityType: WorkspaceAiDraftEntity;
    source: "ai" | "fallback";
    provider: string;
    model: string;
    generatedAt: string;
    projectId?: string;
    workflowId?: string;
    fields: Record<string, unknown>;
    warnings?: string[];
  };
  code?: string;
  description?: string;
};

export type WorkspaceAiUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalDurationNs?: number;
  loadDurationNs?: number;
};

export type WorkspaceAiChatRequestBody = {
  mode?: WorkspaceAiPromptMode;
  scope?: WorkspaceAiPromptScope;
  projectId?: string;
  workflowId?: string;
  attachments?: string[];
  reportReferenceIds?: string[];
  messages: WorkspaceAiChatMessage[];
};

export type WorkspaceAiChatResponse = {
  message: string;
  provider: string;
  model: string;
  workspaceName: string;
  projectName?: string;
  workflowId?: string;
  assistantMessage: {
    role: "assistant";
    content: string;
  };
  usage?: WorkspaceAiUsage;
  code?: string;
  description?: string;
};

export type WorkspaceAiModelRecord = {
  name: string;
  model: string;
  size: number;
  modifiedAt: string;
  family: string;
  parameterSize: string;
  quantizationLevel: string;
};

export type WorkspaceAiModelsResponse = {
  message: string;
  provider: string;
  baseUrl: string;
  version: string;
  defaultModel: string;
  models: WorkspaceAiModelRecord[];
  available?: boolean;
  enabled?: boolean;
  disabledReason?: string;
  code?: string;
  description?: string;
};

export type WorkspaceAiStatusResponse = {
  message: string;
  workspaceName?: string;
  available: boolean;
  enabled: boolean;
  reason?: string;
  disabledReason?: string;
  code?: string;
  provider: string;
  model: string;
  baseUrl: string;
  environment: string;
  checkedAt: string;
  estimatedTokenCosts?: {
    scribeMessage: number;
    aiDraft: number;
    reportGeneration: number;
  };
  workspaceTokens?: {
    plan: string;
    balance: number;
    monthlyAllocation: number;
    lastRefillDate: string | null;
  } | null;
  description?: string;
};

export type WorkspaceAiThreadRecord = {
  chatId: string;
  title: string;
  mode: WorkspaceAiPromptMode;
  scope: WorkspaceAiPromptScope;
  projectId?: string;
  workflowId?: string;
  messageCount: number;
  lastMessagePreview: string;
  model: string;
  lastMessageAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type WorkspaceAiStoredMessageRecord = {
  messageId: string;
  role: WorkspaceAiChatRole;
  content: string;
  attachments: string[];
  replyToMessageId: string;
  quotedMessageId: string;
  provider: string;
  model: string;
  usage?: WorkspaceAiUsage;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WorkspaceAiChatsResponse = {
  message: string;
  chats: WorkspaceAiThreadRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  code?: string;
  description?: string;
};

export type WorkspaceAiChatDetailResponse = {
  message: string;
  chat: WorkspaceAiThreadRecord;
  messages: WorkspaceAiStoredMessageRecord[];
  pagination: {
    limit: number;
    total: number;
    hasMore: boolean;
  };
  code?: string;
  description?: string;
};

export type WorkspaceAiCreateChatRequestBody = {
  title?: string;
  mode?: WorkspaceAiPromptMode;
  scope?: WorkspaceAiPromptScope;
  projectId?: string;
  workflowId?: string;
};

export type WorkspaceAiCreateChatResponse = {
  message: string;
  chat: WorkspaceAiThreadRecord;
  code?: string;
  description?: string;
};

export type WorkspaceAiSendMessageRequestBody = {
  content: string;
  mode?: WorkspaceAiPromptMode;
  scope?: WorkspaceAiPromptScope;
  projectId?: string;
  workflowId?: string;
  attachments?: string[];
  reportReferenceIds?: string[];
  replyToMessageId?: string;
  quotedMessageId?: string;
};

export type WorkspaceAiSendMessageResponse = {
  message: string;
  provider: string;
  model: string;
  workspaceName: string;
  projectName?: string;
  workflowId?: string;
  chat: WorkspaceAiThreadRecord;
  userMessage: WorkspaceAiStoredMessageRecord;
  assistantMessage: WorkspaceAiStoredMessageRecord;
  code?: string;
  description?: string;
};

export type WorkspaceAiDeleteChatResponse = {
  message: string;
  deleted: boolean;
  chatId: string;
  code?: string;
  description?: string;
};

export type WorkspaceAiSendMessageStreamEvent =
  | {
      type: "ack";
      payload: {
        provider: string;
        model: string;
        workspaceName: string;
        projectName?: string;
        workflowId?: string;
        intelligenceIntent?: string;
        chat: WorkspaceAiThreadRecord;
        userMessage: WorkspaceAiStoredMessageRecord;
      };
    }
  | {
      type: "delta";
      delta: string;
    }
  | {
      type: "done";
      payload: {
        provider: string;
        model: string;
        usage?: WorkspaceAiUsage;
        assistantMessage: WorkspaceAiStoredMessageRecord;
      };
    }
  | {
      type: "error";
      error: {
        message: string;
        code?: string;
        details?: Record<string, unknown>;
      };
    };
