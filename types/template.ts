import { Pagination } from "@/types";
import {
  ProjectPipelineTemplateKey,
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/components/projects/overview/types";

export type WorkspaceTemplateKind = "project" | "task";

export interface WorkspaceTemplateActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhoto?: string;
}

export interface ProjectTemplatePayload {
  nameTemplate: string;
  summaryTemplate?: string;
  status?: ProjectStatus;
  initialPipelineTemplate?: ProjectPipelineTemplateKey;
  startOffsetDays?: number;
  durationDays?: number;
}

export interface TaskTemplateSubtaskPayload {
  titleTemplate: string;
  status?: ProjectTaskStatus;
}

export interface TaskTemplatePayload {
  titleTemplate: string;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  startInDays?: number;
  dueInDays?: number;
  sectionId?: string;
  subtasks?: TaskTemplateSubtaskPayload[];
}

export type WorkspaceTemplatePayload = ProjectTemplatePayload | TaskTemplatePayload;

export interface WorkspaceTemplateRecord {
  id: string;
  workspaceId: string;
  kind: WorkspaceTemplateKind;
  name: string;
  description: string;
  template: WorkspaceTemplatePayload;
  placeholders: string[];
  archived: boolean;
  usageCount: number;
  createdBy: WorkspaceTemplateActor | null;
  updatedBy: WorkspaceTemplateActor | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTemplatesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  kind?: WorkspaceTemplateKind | "";
  archived?: boolean;
}

export interface WorkspaceTemplatesResponse {
  message: string;
  templates: WorkspaceTemplateRecord[];
  pagination: Pagination;
}

export interface CreateWorkspaceTemplateRequestBody {
  kind: WorkspaceTemplateKind;
  name: string;
  description?: string;
  template: WorkspaceTemplatePayload;
}

export interface UpdateWorkspaceTemplateRequestBody {
  name?: string;
  description?: string;
  template?: WorkspaceTemplatePayload;
  archived?: boolean;
}

export interface ApplyWorkspaceTemplateRequestBody {
  variables?: Record<string, string | number>;
}

export interface ApplyWorkspaceTemplateResponse {
  message: string;
  template: Pick<
    WorkspaceTemplateRecord,
    | "id"
    | "workspaceId"
    | "kind"
    | "name"
    | "description"
    | "placeholders"
    | "usageCount"
    | "createdAt"
    | "updatedAt"
  >;
  resolvedTemplate: WorkspaceTemplatePayload;
}
