"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { WorkspaceTeamsTable } from "./settings-worpspace-teams-table";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { WorkspaceTeamPolicy } from "@/types/team";
import { cn } from "@/lib/utils";

const DEFAULT_TEAM_POLICY_SETTINGS: WorkspaceTeamPolicy = {
  restrictTeamCreation: true,
  requireLeadBeforeActivation: true,
  allowMultiTeamMembership: true,
  autoAssignInvitedMembers: false,
  defaultVisibility: "open",
  defaultWorkloadMode: "balanced",
};

const hasChanges = (
  value: WorkspaceTeamPolicy,
  saved: WorkspaceTeamPolicy,
) => {
  return (Object.keys(value) as Array<keyof WorkspaceTeamPolicy>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaceTeams = () => {
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspaceTeamPolicy, useUpdateWorkspaceTeamPolicy } =
    useWorkspaceTeam();
  const { isAdminLike, canManageTeamPolicy } = useWorkspacePermissions();
  const queryClient = useQueryClient();

  const policyQuery = useWorkspaceTeamPolicy(workspaceId!);
  const savedTeamPolicy = useMemo<WorkspaceTeamPolicy>(() => {
    return policyQuery.data?.data?.teamPolicy || DEFAULT_TEAM_POLICY_SETTINGS;
  }, [policyQuery.data]);

  const [teamPolicy, setTeamPolicy] = useState<WorkspaceTeamPolicy>(
    DEFAULT_TEAM_POLICY_SETTINGS,
  );
  const canCreateTeam = isAdminLike || teamPolicy.restrictTeamCreation === false;

  useEffect(() => {
    setTeamPolicy(savedTeamPolicy);
  }, [savedTeamPolicy]);

  const teamPolicyChanged = useMemo(
    () => hasChanges(teamPolicy, savedTeamPolicy),
    [teamPolicy, savedTeamPolicy],
  );

  const { isPending: isSavingPolicy, mutateAsync: savePolicy } =
    useUpdateWorkspaceTeamPolicy({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["workspace-team-policy", workspaceId],
        });
      },
    });

  const handleSaveTeamPolicy = () => {
    if (!workspaceId) {
      return;
    }

    const request = savePolicy({
      workspaceId,
      updates: teamPolicy,
    });

    toast.promise(request, {
      loading: "Saving team policy...",
      success: (data) => data?.data?.message || "Team policy updated",
      error: "Could not save team policy",
    });
  };

  const handleResetTeamPolicy = () => {
    setTeamPolicy(savedTeamPolicy);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Team Governance</FieldLegend>
        <FieldDescription>
          Define how teams are created and managed across the workspace.
        </FieldDescription>
        {!canManageTeamPolicy ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update team policy.
          </FieldDescription>
        ) : null}

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            !canManageTeamPolicy && "pointer-events-none opacity-65",
          )}
        >

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Restrict team creation</FieldTitle>
            <FieldDescription>
              Limit team creation to workspace owners and admins.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={teamPolicy.restrictTeamCreation}
            disabled={policyQuery.isLoading}
            onCheckedChange={(checked) =>
              setTeamPolicy((prev) => ({
                ...prev,
                restrictTeamCreation: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require team lead before activation</FieldTitle>
            <FieldDescription>
              Ensure every team has accountable ownership from day one.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={teamPolicy.requireLeadBeforeActivation}
            disabled={policyQuery.isLoading}
            onCheckedChange={(checked) =>
              setTeamPolicy((prev) => ({
                ...prev,
                requireLeadBeforeActivation: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow multi-team membership</FieldTitle>
            <FieldDescription>
              Let members participate in more than one team at a time.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={teamPolicy.allowMultiTeamMembership}
            disabled={policyQuery.isLoading}
            onCheckedChange={(checked) =>
              setTeamPolicy((prev) => ({
                ...prev,
                allowMultiTeamMembership: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-assign invited members</FieldTitle>
            <FieldDescription>
              Automatically assign invited people to a starter team.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={teamPolicy.autoAssignInvitedMembers}
            disabled={policyQuery.isLoading}
            onCheckedChange={(checked) =>
              setTeamPolicy((prev) => ({
                ...prev,
                autoAssignInvitedMembers: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Default team visibility</FieldTitle>
            <FieldDescription>
              Set whether newly created teams are open or private by default.
            </FieldDescription>
          </FieldContent>
          <Select
            value={teamPolicy.defaultVisibility}
            onValueChange={(value) =>
              setTeamPolicy((prev) => ({
                ...prev,
                defaultVisibility: value as WorkspaceTeamPolicy["defaultVisibility"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Default workload mode</FieldTitle>
            <FieldDescription>
              Choose how tasks are typically balanced inside a team.
            </FieldDescription>
          </FieldContent>
          <Select
            value={teamPolicy.defaultWorkloadMode}
            onValueChange={(value) =>
              setTeamPolicy((prev) => ({
                ...prev,
                defaultWorkloadMode:
                  value as WorkspaceTeamPolicy["defaultWorkloadMode"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="lead-driven">Lead-driven</SelectItem>
              <SelectItem value="self-managed">Self-managed</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2 pt-1">
          <Button
            className="max-w-20"
            size="sm"
            loading={isSavingPolicy}
            disabled={!teamPolicyChanged || !workspaceId || !canManageTeamPolicy}
            onClick={handleSaveTeamPolicy}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!teamPolicyChanged || !canManageTeamPolicy}
            onClick={handleResetTeamPolicy}
          >
            Reset
          </Button>
        </div>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Workspace Teams</FieldLegend>
        <FieldDescription>
          Teams currently operating across projects and workflow phases.
        </FieldDescription>
        <WorkspaceTeamsTable
          canCreateTeam={canCreateTeam}
          canManageTeamPolicy={canManageTeamPolicy}
          canManageTeamLifecycle={isAdminLike}
        />
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceTeams;
