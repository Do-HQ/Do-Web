"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { P } from "@/components/ui/typography";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { cn } from "@/lib/utils";
import type {
  WorkspaceFlowDefaults,
  WorkspaceGovernanceSettings,
  WorkspaceWorkSchedule,
} from "@/types/workspace";

type WorkspaceGovernance = WorkspaceGovernanceSettings & {
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
  enableMessageExpiry: false,
  messageRetentionDays: 30,
  workspaceVisibility: "private",
};

const DEFAULT_WORK_SCHEDULE: WorkspaceWorkSchedule = {
  enabled: false,
  timezone: "Africa/Lagos",
  startTime: "09:00",
  closeTime: "18:00",
  lastDigest: {
    startSentOn: "",
    closeSentOn: "",
  },
};

const hasChanges = <T extends object>(value: T, saved: T) => {
  const left = value as Record<string, unknown>;
  const right = saved as Record<string, unknown>;

  return Object.keys(left).some((key) => left[key] !== right[key]);
};

const SettingsWorkspaces = () => {
  const { user } = useAuthStore();
  const { workspaceId, setWorkspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const readOnlyWorkspaceSettings = !canManageWorkspaceSettings;

  const { useSwitchWorkspace, useWorkspaceById, useUpdateWorkspace } = useWorkspace();
  const activeWorkspaceQuery = useWorkspaceById(workspaceId!);
  const activeWorkspace = activeWorkspaceQuery.data?.data?.workspace;

  const {
    isPending: isSwitchingWorkspace,
    mutateAsync: switchWorkspace,
    variables,
  } = useSwitchWorkspace({
    onSuccess(data) {
      setWorkspaceId(data?.data?.workspace?._id);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["get-workspace-detail"] });
    },
  });

  const [flowDefaults, setFlowDefaults] = useState<WorkspaceFlowDefaults>(DEFAULT_FLOW_DEFAULTS);
  const [savedFlowDefaults, setSavedFlowDefaults] =
    useState<WorkspaceFlowDefaults>(DEFAULT_FLOW_DEFAULTS);
  const [governance, setGovernance] = useState<WorkspaceGovernance>(DEFAULT_GOVERNANCE);
  const [savedGovernance, setSavedGovernance] = useState<WorkspaceGovernance>(DEFAULT_GOVERNANCE);
  const [workSchedule, setWorkSchedule] = useState<WorkspaceWorkSchedule>(DEFAULT_WORK_SCHEDULE);
  const [savedWorkSchedule, setSavedWorkSchedule] =
    useState<WorkspaceWorkSchedule>(DEFAULT_WORK_SCHEDULE);

  useEffect(() => {
    if (!activeWorkspace) {
      return;
    }

    const nextFlowDefaults: WorkspaceFlowDefaults = {
      ...DEFAULT_FLOW_DEFAULTS,
      ...(activeWorkspace.flowDefaults || {}),
    };

    const nextGovernance: WorkspaceGovernance = {
      ...DEFAULT_GOVERNANCE,
      ...(activeWorkspace.governance || {}),
      workspaceVisibility: activeWorkspace.type === "public" ? "public" : "private",
    };

    setFlowDefaults(nextFlowDefaults);
    setSavedFlowDefaults(nextFlowDefaults);
    setGovernance(nextGovernance);
    setSavedGovernance(nextGovernance);

    const nextWorkSchedule: WorkspaceWorkSchedule = {
      ...DEFAULT_WORK_SCHEDULE,
      ...(activeWorkspace.workSchedule || {}),
      lastDigest: {
        ...DEFAULT_WORK_SCHEDULE.lastDigest,
        ...(activeWorkspace.workSchedule?.lastDigest || {}),
      },
    };

    setWorkSchedule(nextWorkSchedule);
    setSavedWorkSchedule(nextWorkSchedule);
  }, [activeWorkspace]);

  const flowDefaultsChanged = useMemo(
    () => hasChanges(flowDefaults, savedFlowDefaults),
    [flowDefaults, savedFlowDefaults],
  );
  const governanceChanged = useMemo(
    () => hasChanges(governance, savedGovernance),
    [governance, savedGovernance],
  );
  const workScheduleChanged = useMemo(
    () => hasChanges(workSchedule, savedWorkSchedule),
    [workSchedule, savedWorkSchedule],
  );

  const { isPending: isUpdatingWorkspace, mutateAsync: updateWorkspace } = useUpdateWorkspace({
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["get-workspace-detail", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["get-user-workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const handleSwitchWorkspace = (id: string) => {
    const request = switchWorkspace({ workspaceId: id });

    toast.promise(request, {
      loading: "Switching workspace...",
      success: "Workspace switched",
      error: "Could not switch workspace",
    });
  };

  const handleSaveFlowDefaults = () => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspace(
      {
        workspaceId,
        data: {
          flowDefaults,
        },
      },
    );

    toast.promise(request, {
      loading: "Saving flow defaults...",
      success: (data) => {
        setSavedFlowDefaults(flowDefaults);
        return data?.data?.message || "Workspace flow defaults updated";
      },
      error: "Could not save workspace flow defaults",
    });
  };

  const handleResetFlowDefaults = () => {
    setFlowDefaults(savedFlowDefaults);
  };

  const handleSaveGovernance = () => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspace(
      {
        workspaceId,
        data: {
          type: governance.workspaceVisibility,
          governance: {
            allowMembersCreateProjects: governance.allowMembersCreateProjects,
            allowMembersCreateWorkflows: governance.allowMembersCreateWorkflows,
            restrictInvitesToAdmins: governance.restrictInvitesToAdmins,
            requireJoinRequestApproval: governance.requireJoinRequestApproval,
            enableMessageExpiry: governance.enableMessageExpiry,
            messageRetentionDays: governance.messageRetentionDays,
          },
        },
      },
    );

    toast.promise(request, {
      loading: "Saving workspace governance...",
      success: (data) => {
        setSavedGovernance(governance);
        return data?.data?.message || "Workspace governance updated";
      },
      error: "Could not save workspace governance",
    });
  };

  const handleResetGovernance = () => {
    setGovernance(savedGovernance);
  };

  const handleSaveWorkSchedule = () => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspace({
      workspaceId,
      data: {
        workSchedule: {
          enabled: workSchedule.enabled,
          timezone: workSchedule.timezone.trim(),
          startTime: workSchedule.startTime,
          closeTime: workSchedule.closeTime,
        },
      },
    });

    toast.promise(request, {
      loading: "Saving work schedule...",
      success: (data) => {
        setSavedWorkSchedule(workSchedule);
        return data?.data?.message || "Workspace work schedule updated";
      },
      error: "Could not save workspace work schedule",
    });
  };

  const handleResetWorkSchedule = () => {
    setWorkSchedule(savedWorkSchedule);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Workspace Directory</FieldLegend>
        <FieldDescription>Your organizations and active workspace context.</FieldDescription>

        <div className="flex max-w-130 flex-col gap-2">
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
                    <FieldDescription className="truncate">{item?.slug}.squircle.live</FieldDescription>
                  </FieldContent>

                  <Badge variant="outline" className="capitalize">
                    {item?.type || "private"}
                  </Badge>

                  <Badge variant="secondary" className="capitalize">
                    {entry?.role}
                  </Badge>

                  <P className="text-muted-foreground text-xs">{membersCount} members</P>

                  {isCurrent ? (
                    <Badge className="ml-auto">Current</Badge>
                  ) : (
                    <Button
                      className="ml-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwitchWorkspace(item._id)}
                      loading={variables?.workspaceId === item._id && isSwitchingWorkspace}
                    >
                      Switch
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-md border px-3 py-3">
              <P className="text-muted-foreground text-sm">You are not part of any workspace yet.</P>
            </div>
          )}
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Flow Defaults</FieldLegend>
        <FieldDescription>Organization defaults across projects, workflows, and tasks.</FieldDescription>
        {readOnlyWorkspaceSettings ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update these defaults.
          </FieldDescription>
        ) : null}

        <div className={cn(readOnlyWorkspaceSettings && "pointer-events-none opacity-65")}>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Default project view</FieldTitle>
            <FieldDescription>Set the starting view for newly created projects.</FieldDescription>
          </FieldContent>
          <Select
            value={flowDefaults.projectDefaultView}
            onValueChange={(value) =>
              setFlowDefaults((prev) => ({
                ...prev,
                projectDefaultView: value as WorkspaceFlowDefaults["projectDefaultView"],
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
            <FieldDescription>Choose the default phase structure for new projects.</FieldDescription>
          </FieldContent>
          <Select
            value={flowDefaults.workflowTemplate}
            onValueChange={(value) =>
              setFlowDefaults((prev) => ({
                ...prev,
                workflowTemplate: value as WorkspaceFlowDefaults["workflowTemplate"],
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
            <FieldDescription>Ensure tasks are created only under defined phases.</FieldDescription>
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
            <FieldDescription>Prefix task IDs with workspace/project identifiers.</FieldDescription>
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
            <FieldDescription>Control which teams are visible when planning projects.</FieldDescription>
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
            loading={isUpdatingWorkspace || activeWorkspaceQuery.isLoading}
            disabled={!flowDefaultsChanged || !workspaceId || readOnlyWorkspaceSettings}
            onClick={handleSaveFlowDefaults}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!flowDefaultsChanged || readOnlyWorkspaceSettings}
            onClick={handleResetFlowDefaults}
          >
            Reset
          </Button>
        </div>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Governance</FieldLegend>
        <FieldDescription>Manage organization permissions and access policies.</FieldDescription>
        {readOnlyWorkspaceSettings ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update governance.
          </FieldDescription>
        ) : null}

        <div className={cn(readOnlyWorkspaceSettings && "pointer-events-none opacity-65")}>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow members to create projects</FieldTitle>
            <FieldDescription>Let members create projects without admin intervention.</FieldDescription>
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
            <FieldDescription>Let members define new phases inside projects.</FieldDescription>
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
            <FieldDescription>Prevent non-admin members from inviting new users.</FieldDescription>
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
            <FieldDescription>Route workspace join requests through approval flow.</FieldDescription>
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
            <FieldDescription>Control public discoverability of this organization.</FieldDescription>
          </FieldContent>
          <Select
            value={governance.workspaceVisibility}
            onValueChange={(value) =>
              setGovernance((prev) => ({
                ...prev,
                workspaceVisibility: value as WorkspaceGovernance["workspaceVisibility"],
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

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Expire chat messages automatically</FieldTitle>
            <FieldDescription>
              Delete old chat messages automatically to reduce database growth.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={governance.enableMessageExpiry}
            onCheckedChange={(checked) =>
              setGovernance((prev) => ({
                ...prev,
                enableMessageExpiry: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Message retention window</FieldTitle>
            <FieldDescription>
              How long messages stay before expiry runs.
            </FieldDescription>
          </FieldContent>
          <Select
            value={String(governance.messageRetentionDays)}
            onValueChange={(value) =>
              setGovernance((prev) => ({
                ...prev,
                messageRetentionDays: Number(value),
              }))
            }
            disabled={!governance.enableMessageExpiry}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select retention" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">365 days</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            loading={isUpdatingWorkspace || activeWorkspaceQuery.isLoading}
            disabled={!governanceChanged || !workspaceId || readOnlyWorkspaceSettings}
            onClick={handleSaveGovernance}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!governanceChanged || readOnlyWorkspaceSettings}
            onClick={handleResetGovernance}
          >
            Reset
          </Button>
        </div>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Work Hours</FieldLegend>
        <FieldDescription>
          Configure business start and close time for automated pending-task email reports.
        </FieldDescription>
        {readOnlyWorkspaceSettings ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update work hours.
          </FieldDescription>
        ) : null}

        <div className={cn(readOnlyWorkspaceSettings && "pointer-events-none opacity-65")}>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enable scheduled digest emails</FieldTitle>
            <FieldDescription>
              Sends pending-task reports to assignees at start and close of day.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={workSchedule.enabled}
            onCheckedChange={(checked) =>
              setWorkSchedule((prev) => ({
                ...prev,
                enabled: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Timezone</FieldTitle>
            <FieldDescription>
              Use an IANA timezone, for example: Africa/Lagos, Europe/London, America/New_York.
            </FieldDescription>
          </FieldContent>
          <Input
            className="w-64"
            value={workSchedule.timezone}
            onChange={(event) =>
              setWorkSchedule((prev) => ({
                ...prev,
                timezone: event.target.value,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Business start time</FieldTitle>
            <FieldDescription>
              Daily start slot for pending-task summary emails.
            </FieldDescription>
          </FieldContent>
          <Input
            className="w-40"
            type="time"
            step={60}
            value={workSchedule.startTime}
            onChange={(event) =>
              setWorkSchedule((prev) => ({
                ...prev,
                startTime: event.target.value,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Business close time</FieldTitle>
            <FieldDescription>
              Daily close slot for pending-task summary emails.
            </FieldDescription>
          </FieldContent>
          <Input
            className="w-40"
            type="time"
            step={60}
            value={workSchedule.closeTime}
            onChange={(event) =>
              setWorkSchedule((prev) => ({
                ...prev,
                closeTime: event.target.value,
              }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            loading={isUpdatingWorkspace || activeWorkspaceQuery.isLoading}
            disabled={!workScheduleChanged || !workspaceId || readOnlyWorkspaceSettings}
            onClick={handleSaveWorkSchedule}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!workScheduleChanged || readOnlyWorkspaceSettings}
            onClick={handleResetWorkSchedule}
          >
            Reset
          </Button>
        </div>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaces;
