import axiosInstance from ".";
import {
  ApplyWorkspaceTemplateRequestBody,
  ApplyWorkspaceTemplateResponse,
  CreateWorkspaceTemplateRequestBody,
  UpdateWorkspaceTemplateRequestBody,
  WorkspaceTemplateRecord,
  WorkspaceTemplatesQueryParams,
  WorkspaceTemplatesResponse,
} from "@/types/template";

const WORKSPACE_TEMPLATE_ENDPOINTS = {
  templates: (workspaceId: string) => `/workspace/${workspaceId}/templates`,
  template: (workspaceId: string, templateId: string) =>
    `/workspace/${workspaceId}/templates/${templateId}`,
  apply: (workspaceId: string, templateId: string) =>
    `/workspace/${workspaceId}/templates/${templateId}/apply`,
};

export const getWorkspaceTemplates = async (
  workspaceId: string,
  params: WorkspaceTemplatesQueryParams = {},
) => {
  const {
    page = 1,
    limit = 30,
    search = "",
    kind = "",
    archived = false,
  } = params;

  return await axiosInstance.get<WorkspaceTemplatesResponse>(
    WORKSPACE_TEMPLATE_ENDPOINTS.templates(workspaceId),
    {
      params: {
        page,
        limit,
        search,
        kind,
        archived,
      },
    },
  );
};

export const getWorkspaceTemplateDetail = async (
  workspaceId: string,
  templateId: string,
) => {
  return await axiosInstance.get<{
    message: string;
    template: WorkspaceTemplateRecord;
  }>(WORKSPACE_TEMPLATE_ENDPOINTS.template(workspaceId, templateId));
};

export const createWorkspaceTemplate = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceTemplateRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    template: WorkspaceTemplateRecord;
  }>(WORKSPACE_TEMPLATE_ENDPOINTS.templates(data.workspaceId), data.payload);
};

export const updateWorkspaceTemplate = async (data: {
  workspaceId: string;
  templateId: string;
  updates: UpdateWorkspaceTemplateRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    template: WorkspaceTemplateRecord;
  }>(
    WORKSPACE_TEMPLATE_ENDPOINTS.template(data.workspaceId, data.templateId),
    data.updates,
  );
};

export const deleteWorkspaceTemplate = async (data: {
  workspaceId: string;
  templateId: string;
}) => {
  return await axiosInstance.delete<{
    message: string;
    deleted: boolean;
    templateId: string;
  }>(WORKSPACE_TEMPLATE_ENDPOINTS.template(data.workspaceId, data.templateId));
};

export const applyWorkspaceTemplate = async (data: {
  workspaceId: string;
  templateId: string;
  payload: ApplyWorkspaceTemplateRequestBody;
}) => {
  return await axiosInstance.post<ApplyWorkspaceTemplateResponse>(
    WORKSPACE_TEMPLATE_ENDPOINTS.apply(data.workspaceId, data.templateId),
    data.payload,
  );
};
