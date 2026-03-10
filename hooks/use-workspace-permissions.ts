import useWorkspace from "@/hooks/use-workspace";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceGovernanceSettings } from "@/types/workspace";

const DEFAULT_GOVERNANCE: WorkspaceGovernanceSettings = {
  allowMembersCreateProjects: true,
  allowMembersCreateWorkflows: true,
  restrictInvitesToAdmins: false,
  requireJoinRequestApproval: true,
  enableMessageExpiry: false,
  messageRetentionDays: 30,
};

export const useWorkspacePermissions = () => {
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const workspaceHook = useWorkspace();
  const activeWorkspaceMembership = workspaceHook.useActiveWorkspace();
  const workspaceDetailQuery = workspaceHook.useWorkspaceById(workspaceId || "");

  const currentRole = activeWorkspaceMembership?.role || "member";
  const isOwner = currentRole === "owner";
  const isAdmin = currentRole === "admin";
  const isAdminLike = isOwner || isAdmin;
  const workspace =
    workspaceDetailQuery.data?.data?.workspace || activeWorkspaceMembership?.workspaceId;
  const governance: WorkspaceGovernanceSettings = {
    ...DEFAULT_GOVERNANCE,
    ...(workspace?.governance || {}),
  };

  const canInviteWorkspaceMembers =
    governance.restrictInvitesToAdmins === false || isAdminLike;
  const canCreateProjects =
    governance.allowMembersCreateProjects !== false || isAdminLike;
  const canCreateWorkflows =
    governance.allowMembersCreateWorkflows !== false || isAdminLike;

  return {
    user,
    workspaceId,
    workspace,
    governance,
    role: currentRole,
    isOwner,
    isAdmin,
    isAdminLike,
    canManageWorkspaceSettings: isAdminLike,
    canManageWorkspaceSecurity: isAdminLike,
    canManageTeamPolicy: isAdminLike,
    canModerateJoinRequests: isAdminLike,
    canInviteWorkspaceMembers,
    canCreateProjects,
    canCreateWorkflows,
    canManageProjectInvites: canInviteWorkspaceMembers,
    canArchiveProjects: isAdminLike,
  };
};

export type WorkspacePermissions = ReturnType<typeof useWorkspacePermissions>;
