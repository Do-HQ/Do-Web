import { Pagination } from "@/types";

export type WorkspaceKnowledgeBaseSource = "doc" | "project" | "curated";
export type WorkspaceKnowledgeBasePublishState =
  | "draft"
  | "review"
  | "published";

export interface WorkspaceKnowledgeBaseArticleRecord {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  route: string;
  source: WorkspaceKnowledgeBaseSource;
  category: string;
  publishState: WorkspaceKnowledgeBasePublishState;
  confidenceScore: number;
  featured: boolean;
  pinned: boolean;
  updatedAt: string;
}

export interface WorkspaceKnowledgeBaseFacetItem {
  value: string;
  count: number;
}

export interface WorkspaceKnowledgeBaseFacets {
  sources: WorkspaceKnowledgeBaseFacetItem[];
  categories: WorkspaceKnowledgeBaseFacetItem[];
  tags: WorkspaceKnowledgeBaseFacetItem[];
}

export interface WorkspaceKnowledgeBaseSearchQueryParams {
  query?: string;
  page?: number;
  limit?: number;
  source?: WorkspaceKnowledgeBaseSource | "all";
  category?: string;
  publishState?: WorkspaceKnowledgeBasePublishState | "all";
  tags?: string;
  featured?: "all" | "true" | "false";
  pinned?: "all" | "true" | "false";
  minConfidence?: number | string;
  includeCompletedProjects?: boolean;
}

export interface WorkspaceKnowledgeBaseSearchResponse {
  message: string;
  articles: WorkspaceKnowledgeBaseArticleRecord[];
  pagination: Pagination;
  facets: WorkspaceKnowledgeBaseFacets;
}
