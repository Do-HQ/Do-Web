"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
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

type TeamPolicySettings = {
  restrictTeamCreation: boolean;
  requireLeadBeforeActivation: boolean;
  allowMultiTeamMembership: boolean;
  autoAssignInvitedMembers: boolean;
  defaultVisibility: "open" | "private";
  defaultWorkloadMode: "balanced" | "lead-driven" | "self-managed";
};

const DEFAULT_TEAM_POLICY_SETTINGS: TeamPolicySettings = {
  restrictTeamCreation: true,
  requireLeadBeforeActivation: true,
  allowMultiTeamMembership: true,
  autoAssignInvitedMembers: false,
  defaultVisibility: "open",
  defaultWorkloadMode: "balanced",
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaceTeams = () => {
  const [teamPolicy, setTeamPolicy] = useState<TeamPolicySettings>(
    DEFAULT_TEAM_POLICY_SETTINGS,
  );
  const [savedTeamPolicy, setSavedTeamPolicy] = useState<TeamPolicySettings>(
    DEFAULT_TEAM_POLICY_SETTINGS,
  );

  const teamPolicyChanged = useMemo(
    () => hasChanges(teamPolicy, savedTeamPolicy),
    [teamPolicy, savedTeamPolicy],
  );

  const handleSaveTeamPolicy = () => {
    setSavedTeamPolicy(teamPolicy);
    toast.success("Team policy updated", {
      description: "Team policy settings are saved locally for now.",
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

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Restrict team creation</FieldTitle>
            <FieldDescription>
              Limit team creation to workspace owners and admins.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={teamPolicy.restrictTeamCreation}
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
                defaultVisibility: value as TeamPolicySettings["defaultVisibility"],
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
                  value as TeamPolicySettings["defaultWorkloadMode"],
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

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!teamPolicyChanged}
            onClick={handleSaveTeamPolicy}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!teamPolicyChanged}
            onClick={handleResetTeamPolicy}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Workspace Teams</FieldLegend>
        <FieldDescription>
          Teams currently operating across projects and workflow phases.
        </FieldDescription>
        <WorkspaceTeamsTable />
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceTeams;
