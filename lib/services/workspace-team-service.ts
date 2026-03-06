import { Pagination } from "@/types";
import { ResponseObject } from "@/types/file";
import {
  AddWorkspaceTeamMembersRequestBody,
  UpdateWorkspaceTeamMemberRequestBody,
  UpdateWorkspaceTeamPolicyRequestBody,
  UpdateWorkspaceTeamRequestBody,
  WorkspaceTeam,
  WorkspaceTeamMember,
  WorkspaceTeamPolicy,
  CreateWorkspaceTeamRequestBody,
} from "@/types/team";
import axiosInstance from ".";
import { PaginationBody } from "./workspace-service";

const WORKSPACE_TEAM_ENDPOINTS = {
  teamPolicy: (workspaceId: string) => `/workspace/${workspaceId}/team-policy`,
  teams: (workspaceId: string) => `/workspace/${workspaceId}/teams`,
  team: (workspaceId: string, teamId: string) =>
    `/workspace/${workspaceId}/teams/${teamId}`,
  archiveTeam: (workspaceId: string, teamId: string) =>
    `/workspace/${workspaceId}/teams/${teamId}/archive`,
  unarchiveTeam: (workspaceId: string, teamId: string) =>
    `/workspace/${workspaceId}/teams/${teamId}/unarchive`,
  teamMembers: (workspaceId: string, teamId: string) =>
    `/workspace/${workspaceId}/teams/${teamId}/members`,
  teamMember: (workspaceId: string, teamId: string, memberId: string) =>
    `/workspace/${workspaceId}/teams/${teamId}/members/${memberId}`,
};

export interface WorkspaceTeamsPaginationBody extends PaginationBody {
  status?: "active" | "archived";
}

export const getWorkspaceTeamPolicy = async (workspaceId: string) => {
  return await axiosInstance.get<{
    message: string;
    teamPolicy: WorkspaceTeamPolicy;
  }>(WORKSPACE_TEAM_ENDPOINTS.teamPolicy(workspaceId));
};

export const updateWorkspaceTeamPolicy = async (data: {
  workspaceId: string;
  updates: UpdateWorkspaceTeamPolicyRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    teamPolicy: WorkspaceTeamPolicy;
  }>(WORKSPACE_TEAM_ENDPOINTS.teamPolicy(data.workspaceId), data.updates);
};

export const getWorkspaceTeams = async (
  workspaceId: string,
  params: WorkspaceTeamsPaginationBody,
) => {
  const { page = 1, limit = 10, search = "", status = "active" } = params || {};
  return await axiosInstance.get<{
    message: string;
    teams: WorkspaceTeam[];
    pagination: Pagination;
  }>(WORKSPACE_TEAM_ENDPOINTS.teams(workspaceId), {
    params: { page, limit, search, status },
  });
};

export const getWorkspaceTeamDetail = async (
  workspaceId: string,
  teamId: string,
  params: PaginationBody,
) => {
  const { page = 1, limit = 20, search = "" } = params || {};
  return await axiosInstance.get<{
    message: string;
    team: WorkspaceTeam;
    members: WorkspaceTeamMember[];
    pagination: Pagination;
  }>(WORKSPACE_TEAM_ENDPOINTS.team(workspaceId, teamId), {
    params: { page, limit, search },
  });
};

export const createWorkspaceTeam = async (data: {
  workspaceId: string;
  payload: CreateWorkspaceTeamRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    team: WorkspaceTeam;
  }>(WORKSPACE_TEAM_ENDPOINTS.teams(data.workspaceId), data.payload);
};

export const updateWorkspaceTeam = async (data: {
  workspaceId: string;
  teamId: string;
  updates: UpdateWorkspaceTeamRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    team: WorkspaceTeam;
  }>(WORKSPACE_TEAM_ENDPOINTS.team(data.workspaceId, data.teamId), data.updates);
};

export const archiveWorkspaceTeam = async (data: {
  workspaceId: string;
  teamId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    team: WorkspaceTeam;
  }>(WORKSPACE_TEAM_ENDPOINTS.archiveTeam(data.workspaceId, data.teamId));
};

export const unarchiveWorkspaceTeam = async (data: {
  workspaceId: string;
  teamId: string;
}) => {
  return await axiosInstance.post<{
    message: string;
    team: WorkspaceTeam;
  }>(WORKSPACE_TEAM_ENDPOINTS.unarchiveTeam(data.workspaceId, data.teamId));
};

export const dissolveWorkspaceTeam = async (data: {
  workspaceId: string;
  teamId: string;
}) => {
  return await axiosInstance.delete<ResponseObject>(
    WORKSPACE_TEAM_ENDPOINTS.team(data.workspaceId, data.teamId),
  );
};

export const getWorkspaceTeamMembers = async (
  workspaceId: string,
  teamId: string,
  params: PaginationBody,
) => {
  const { page = 1, limit = 20, search = "" } = params || {};
  return await axiosInstance.get<{
    message: string;
    team: WorkspaceTeam;
    members: WorkspaceTeamMember[];
    pagination: Pagination;
  }>(WORKSPACE_TEAM_ENDPOINTS.teamMembers(workspaceId, teamId), {
    params: { page, limit, search },
  });
};

export const addWorkspaceTeamMembers = async (data: {
  workspaceId: string;
  teamId: string;
  payload: AddWorkspaceTeamMembersRequestBody;
}) => {
  return await axiosInstance.post<{
    message: string;
    team: WorkspaceTeam;
    members: WorkspaceTeamMember[];
    pagination: Pagination;
  }>(
    WORKSPACE_TEAM_ENDPOINTS.teamMembers(data.workspaceId, data.teamId),
    data.payload,
  );
};

export const updateWorkspaceTeamMember = async (data: {
  workspaceId: string;
  teamId: string;
  memberId: string;
  payload: UpdateWorkspaceTeamMemberRequestBody;
}) => {
  return await axiosInstance.patch<{
    message: string;
    member: WorkspaceTeamMember;
  }>(
    WORKSPACE_TEAM_ENDPOINTS.teamMember(
      data.workspaceId,
      data.teamId,
      data.memberId,
    ),
    data.payload,
  );
};

export const removeWorkspaceTeamMember = async (data: {
  workspaceId: string;
  teamId: string;
  memberId: string;
}) => {
  return await axiosInstance.delete<ResponseObject>(
    WORKSPACE_TEAM_ENDPOINTS.teamMember(
      data.workspaceId,
      data.teamId,
      data.memberId,
    ),
  );
};
