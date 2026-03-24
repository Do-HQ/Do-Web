import axiosInstance from ".";
import {
  WorkspaceKnowledgeBaseSearchQueryParams,
  WorkspaceKnowledgeBaseSearchResponse,
} from "@/types/knowledge-base";

const WORKSPACE_KNOWLEDGE_BASE_ENDPOINTS = {
  search: (workspaceId: string) => `/workspace/${workspaceId}/knowledge-base/search`,
};

export const searchWorkspaceKnowledgeBase = async (
  workspaceId: string,
  params: WorkspaceKnowledgeBaseSearchQueryParams = {},
) => {
  const {
    query = "",
    page = 1,
    limit = 20,
    source = "all",
    category = "all",
    publishState = "all",
    tags = "",
    featured = "all",
    pinned = "all",
    minConfidence = "",
    includeCompletedProjects,
  } = params;

  return await axiosInstance.get<WorkspaceKnowledgeBaseSearchResponse>(
    WORKSPACE_KNOWLEDGE_BASE_ENDPOINTS.search(workspaceId),
    {
      params: {
        query,
        page,
        limit,
        source,
        category,
        publishState,
        tags,
        featured,
        pinned,
        minConfidence,
        includeCompletedProjects,
      },
    },
  );
};
