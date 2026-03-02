"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { P } from "@/components/ui/typography";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";

type WorkspaceFlowDefaults = {
  projectDefaultView: "list" | "board" | "timeline";
  workflowTemplate: "lightweight" | "delivery" | "marketing" | "custom";
  requireWorkflowBeforeTasks: boolean;
  useTaskIdPrefix: boolean;
  teamVisibilityInProjects: "all" | "assigned-only";
};

type WorkspaceGovernance = {
  allowMembersCreateProjects: boolean;
  allowMembersCreateWorkflows: boolean;
  restrictInvitesToAdmins: boolean;
  requireJoinRequestApproval: boolean;
  workspaceVisibility: "private" | "public";
};

const DEFAULT_FLOW_DEFAULTS: WorkspaceFlowDefaults = {
  projectDefaultView: "board",
  workflowTemplate: "delivery",
  requireWorkflowBeforeTasks: true,
  useTaskIdPrefix: true,
  teamVisibilityInProjects: "assigned-only",
};

const DEFAULT_GOVERNANCE: WorkspaceGovernance = {
  allowMembersCreateProjects: true,
  allowMembersCreateWorkflows: true,
  restrictInvitesToAdmins: false,
  requireJoinRequestApproval: true,
  workspaceVisibility: "private",
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaces = () => {
  // Store
  const { user } = useAuthStore();
  const { workspaceId, setWorkspaceId } = useWorkspaceStore();

  // Query
  const queryClient = useQueryClient();

  // Hooks
  const { useSwitchWorkspace } = useWorkspace();
  const {
    isPending: isSwitchingWorkspace,
    mutate: switchWorkspace,
    variables,
  } = useSwitchWorkspace({
    onSuccess(data) {
      setWorkspaceId(data?.data?.workspace?._id);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Workspace switched", {
        description: "Current workspace context has been updated.",
      });
    },
  });

  // State
  const [flowDefaults, setFlowDefaults] = useState<WorkspaceFlowDefaults>(
    DEFAULT_FLOW_DEFAULTS,
  );
  const [savedFlowDefaults, setSavedFlowDefaults] =
    useState<WorkspaceFlowDefaults>(DEFAULT_FLOW_DEFAULTS);

  const [governance, setGovernance] =
    useState<WorkspaceGovernance>(DEFAULT_GOVERNANCE);
  const [savedGovernance, setSavedGovernance] =
    useState<WorkspaceGovernance>(DEFAULT_GOVERNANCE);

  // Derived
  const flowDefaultsChanged = useMemo(
    () => hasChanges(flowDefaults, savedFlowDefaults),
    [flowDefaults, savedFlowDefaults],
  );
  const governanceChanged = useMemo(
    () => hasChanges(governance, savedGovernance),
    [governance, savedGovernance],
  );

  // Handlers
  const handleSwitchWorkspace = (id: string) => {
    switchWorkspace({ workspaceId: id });
  };

  const handleSaveFlowDefaults = () => {
    setSavedFlowDefaults(flowDefaults);
    toast.success("Workspace flow defaults updated", {
      description: "These defaults are saved locally for now.",
    });
  };

  const handleResetFlowDefaults = () => {
    setFlowDefaults(savedFlowDefaults);
  };

  const handleSaveGovernance = () => {
    setSavedGovernance(governance);
    toast.success("Workspace governance updated", {
      description: "Governance settings are saved locally for now.",
    });
  };

  const handleResetGovernance = () => {
    setGovernance(savedGovernance);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Workspace Directory</FieldLegend>
        <FieldDescription>
          Your organizations and active workspace context.
        </FieldDescription>

        <div className="flex flex-col gap-2 max-w-130">
          {user?.workspaces?.length ? (
            user.workspaces.map((entry) => {
              const item = entry.workspaceId;
              if (!item?._id) {
                return null;
              }
              const isCurrent = item?._id === workspaceId;
              const membersCount = item?.members?.length ?? 0;

              return (
                <div
                  key={entry._id}
                  className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-3"
                >
                  <FieldContent className="min-w-0">
                    <FieldTitle className="truncate">{item?.name}</FieldTitle>
                    <FieldDescription className="truncate">
                      {item?.slug}.squircle.live
                    </FieldDescription>
                  </FieldContent>

                  <Badge variant="outline" className="capitalize">
                    {item?.type || "private"}
                  </Badge>

                  <Badge variant="secondary" className="capitalize">
                    {entry?.role}
                  </Badge>

                  <P className="text-muted-foreground text-xs">
                    {membersCount} members
                  </P>

                  {isCurrent ? (
                    <Badge className="ml-auto">Current</Badge>
                  ) : (
                    <Button
                      className="ml-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwitchWorkspace(item._id)}
                      loading={
                        variables?.workspaceId === item._id &&
                        isSwitchingWorkspace
                      }
                    >
                      Switch
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-md border px-3 py-3">
              <P className="text-muted-foreground text-sm">
                You are not part of any workspace yet.
              </P>
            </div>
          )}
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Flow Defaults</FieldLegend>
        <FieldDescription>
          Organization defaults across projects, workflows, and tasks.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Default project view</FieldTitle>
            <FieldDescription>
              Set the starting view for newly created projects.
            </FieldDescription>
          </FieldContent>
          <Select
            value={flowDefaults.projectDefaultView}
            onValueChange={(value) =>
              setFlowDefaults((prev) => ({
                ...prev,
                projectDefaultView:
                  value as WorkspaceFlowDefaults["projectDefaultView"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Workflow template</FieldTitle>
            <FieldDescription>
              Choose the default phase structure for new projects.
            </FieldDescription>
          </FieldContent>
          <Select
            value={flowDefaults.workflowTemplate}
            onValueChange={(value) =>
              setFlowDefaults((prev) => ({
                ...prev,
                workflowTemplate:
                  value as WorkspaceFlowDefaults["workflowTemplate"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lightweight">Lightweight</SelectItem>
              <SelectItem value="delivery">Product Delivery</SelectItem>
              <SelectItem value="marketing">Marketing Ops</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require workflow before tasks</FieldTitle>
            <FieldDescription>
              Ensure tasks are created only under defined phases.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={flowDefaults.requireWorkflowBeforeTasks}
            onCheckedChange={(checked) =>
              setFlowDefaults((prev) => ({
                ...prev,
                requireWorkflowBeforeTasks: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Use task ID prefix</FieldTitle>
            <FieldDescription>
              Prefix task IDs with workspace/project identifiers.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={flowDefaults.useTaskIdPrefix}
            onCheckedChange={(checked) =>
              setFlowDefaults((prev) => ({
                ...prev,
                useTaskIdPrefix: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Team visibility in projects</FieldTitle>
            <FieldDescription>
              Control which teams are visible when planning projects.
            </FieldDescription>
          </FieldContent>
          <Select
            value={flowDefaults.teamVisibilityInProjects}
            onValueChange={(value) =>
              setFlowDefaults((prev) => ({
                ...prev,
                teamVisibilityInProjects:
                  value as WorkspaceFlowDefaults["teamVisibilityInProjects"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="assigned-only">Assigned only</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!flowDefaultsChanged}
            onClick={handleSaveFlowDefaults}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!flowDefaultsChanged}
            onClick={handleResetFlowDefaults}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Governance</FieldLegend>
        <FieldDescription>
          Manage organization permissions and access policies.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow members to create projects</FieldTitle>
            <FieldDescription>
              Let members create projects without admin intervention.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={governance.allowMembersCreateProjects}
            onCheckedChange={(checked) =>
              setGovernance((prev) => ({
                ...prev,
                allowMembersCreateProjects: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow members to create workflows</FieldTitle>
            <FieldDescription>
              Let members define new phases inside projects.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={governance.allowMembersCreateWorkflows}
            onCheckedChange={(checked) =>
              setGovernance((prev) => ({
                ...prev,
                allowMembersCreateWorkflows: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Restrict invites to admins/owners</FieldTitle>
            <FieldDescription>
              Prevent non-admin members from inviting new users.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={governance.restrictInvitesToAdmins}
            onCheckedChange={(checked) =>
              setGovernance((prev) => ({
                ...prev,
                restrictInvitesToAdmins: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require join request approval</FieldTitle>
            <FieldDescription>
              Route workspace join requests through approval flow.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={governance.requireJoinRequestApproval}
            onCheckedChange={(checked) =>
              setGovernance((prev) => ({
                ...prev,
                requireJoinRequestApproval: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Workspace visibility</FieldTitle>
            <FieldDescription>
              Control public discoverability of this organization.
            </FieldDescription>
          </FieldContent>
          <Select
            value={governance.workspaceVisibility}
            onValueChange={(value) =>
              setGovernance((prev) => ({
                ...prev,
                workspaceVisibility:
                  value as WorkspaceGovernance["workspaceVisibility"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!governanceChanged}
            onClick={handleSaveGovernance}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!governanceChanged}
            onClick={handleResetGovernance}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaces;
