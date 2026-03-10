import useWorkspace from "@/hooks/use-workspace";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceGovernanceSettings } from "@/types/workspace";
import { WorkspaceRole } from "@/types/auth";

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
  const resolvedWorkspaceId =
    String(workspaceId || user?.currentWorkspaceId?._id || "").trim();
  const activeWorkspaceMembership = user?.workspaces?.find(
    (membership) =>
      String(membership?.workspaceId?._id || "").trim() === resolvedWorkspaceId,
  );
  const workspaceDetailQuery = workspaceHook.useWorkspaceById(resolvedWorkspaceId);
  const workspaceFromQuery = workspaceDetailQuery.data?.data?.workspace;
  const workspaceFromAuth = activeWorkspaceMembership?.workspaceId || user?.currentWorkspaceId;
  const workspace = workspaceFromQuery || workspaceFromAuth;

  const ownerId =
    String(
      workspace?.ownerId &&
        typeof workspace.ownerId === "object" &&
        "_id" in workspace.ownerId
        ? workspace.ownerId._id
        : workspace?.ownerId || "",
    ).trim();
  const userId = String(user?._id || "").trim();
  const inferredRole: WorkspaceRole | null = ownerId && ownerId === userId ? "owner" : null;
  const currentRole: WorkspaceRole = activeWorkspaceMembership?.role || inferredRole || "member";
  const isOwner = currentRole === "owner";
  const isAdmin = currentRole === "admin";
  const isAdminLike = isOwner || isAdmin;
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
    workspaceId: resolvedWorkspaceId || null,
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
