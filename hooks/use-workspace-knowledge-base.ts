import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

import useError from "./use-error";
import { searchWorkspaceKnowledgeBase } from "@/lib/services/workspace-knowledge-base-service";
import { WorkspaceKnowledgeBaseSearchQueryParams } from "@/types/knowledge-base";

const useWorkspaceKnowledgeBase = () => {
  const { handleError } = useError();

  const useWorkspaceKnowledgeBaseSearch = (
    workspaceId: string,
    params: WorkspaceKnowledgeBaseSearchQueryParams = {},
    options?: { enabled?: boolean },
  ) => {
    return useQuery({
      queryKey: ["workspace-knowledge-base-search", workspaceId, params],
      enabled: (options?.enabled ?? true) && !!workspaceId,
      queryFn: async () => {
        try {
          return await searchWorkspaceKnowledgeBase(workspaceId, params);
        } catch (error) {
          handleError(error as AxiosError);
          throw error;
        }
      },
    });
  };

  return {
    useWorkspaceKnowledgeBaseSearch,
  };
};

export default useWorkspaceKnowledgeBase;
