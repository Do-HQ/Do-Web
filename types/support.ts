import { Pagination } from "@/types";

export type WorkspaceSupportTicketCategory =
  | "general"
  | "bug"
  | "billing"
  | "access"
  | "feature";

export type WorkspaceSupportTicketPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type WorkspaceSupportTicketStatus =
  | "open"
  | "in-progress"
  | "resolved"
  | "closed";

export interface WorkspaceSupportTicketActor {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl: string;
}

export interface WorkspaceSupportTicketRecord {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  createdBy: WorkspaceSupportTicketActor;
  subject: string;
  description: string;
  category: WorkspaceSupportTicketCategory;
  priority: WorkspaceSupportTicketPriority;
  status: WorkspaceSupportTicketStatus;
  assignedToUserId: string | null;
  assignedTo: WorkspaceSupportTicketActor | null;
  assignedAt: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  messageCount: number;
  slaDueAt: string | null;
  slaBreached: boolean;
  slaRemainingHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSupportTicketMessageRecord {
  id: string;
  workspaceId: string;
  ticketId: string;
  authorUserId: string;
  author: WorkspaceSupportTicketActor;
  body: string;
  source: "user" | "system";
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSupportTicketInternalNoteRecord {
  id: string;
  workspaceId: string;
  ticketId: string;
  authorUserId: string;
  author: WorkspaceSupportTicketActor;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSupportStatusComponent {
  key: string;
  label: string;
  status: "operational" | "degraded" | "down";
  uptime: string;
}

export interface WorkspaceSupportStatusRecord {
  overall: "operational" | "degraded" | "down";
  updatedAt: string;
  components: WorkspaceSupportStatusComponent[];
}

export interface WorkspaceSupportKnowledgeBaseArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  route: string;
  source?: "doc" | "project" | "curated";
  category?: string;
  publishState?: "draft" | "review" | "published";
  confidenceScore?: number;
  featured?: boolean;
  pinned?: boolean;
  updatedAt?: string;
}

export interface WorkspaceSupportTicketsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkspaceSupportTicketStatus | "all";
  priority?: WorkspaceSupportTicketPriority | "all";
}

export interface WorkspaceSupportQueueQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkspaceSupportTicketStatus | "all";
  priority?: WorkspaceSupportTicketPriority | "all";
  assigneeUserId?: string;
  sla?: "all" | "breached" | "due-soon";
}

export interface WorkspaceSupportTicketMessagesQueryParams {
  page?: number;
  limit?: number;
}

export interface WorkspaceSupportKnowledgeBaseQueryParams {
  query?: string;
  limit?: number;
}

export interface CreateWorkspaceSupportTicketRequestBody {
  subject: string;
  description: string;
  category: WorkspaceSupportTicketCategory;
  priority: WorkspaceSupportTicketPriority;
}

export interface UpdateWorkspaceSupportTicketRequestBody {
  subject?: string;
  description?: string;
  category?: WorkspaceSupportTicketCategory;
  priority?: WorkspaceSupportTicketPriority;
  status?: WorkspaceSupportTicketStatus;
}

export interface AssignWorkspaceSupportTicketRequestBody {
  assigneeUserId: string;
}

export interface CreateWorkspaceSupportTicketMessageRequestBody {
  body: string;
}

export interface CreateWorkspaceSupportTicketInternalNoteRequestBody {
  body: string;
}

export interface WorkspaceSupportTicketsResponse {
  message: string;
  tickets: WorkspaceSupportTicketRecord[];
  pagination: Pagination;
}

export interface WorkspaceSupportTicketDetailResponse {
  message: string;
  ticket: WorkspaceSupportTicketRecord;
}

export interface WorkspaceSupportTicketMessagesResponse {
  message: string;
  messages: WorkspaceSupportTicketMessageRecord[];
  pagination: Pagination;
}

export interface WorkspaceSupportQueueResponse {
  message: string;
  tickets: WorkspaceSupportTicketRecord[];
  pagination: Pagination;
}

export interface WorkspaceSupportTicketInternalNotesResponse {
  message: string;
  notes: WorkspaceSupportTicketInternalNoteRecord[];
  pagination: Pagination;
}

export interface WorkspaceSupportKnowledgeBaseResponse {
  message: string;
  articles: WorkspaceSupportKnowledgeBaseArticle[];
  pagination?: Pagination;
  facets?: {
    sources: Array<{ value: string; count: number }>;
    categories: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
  };
}

export interface WorkspaceSupportStatusResponse {
  message: string;
  overall: "operational" | "degraded" | "down";
  updatedAt: string;
  components: WorkspaceSupportStatusComponent[];
}

export interface WorkspaceSupportSlaBoardResponse {
  message: string;
  stats: {
    totalOpen: number;
    breached: number;
    dueSoon: number;
    unassigned: number;
    highPriority: number;
  };
}
