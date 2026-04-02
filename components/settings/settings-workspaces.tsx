"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
import LoaderComponent from "@/components/shared/loader";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspacePortfolio from "@/hooks/use-workspace-portfolio";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/utils/constants";
import type { ApprovalPolicy } from "@/types/portfolio";
import type {
  WorkspaceGovernanceSettings,
  WorkspaceWorkSchedule,
} from "@/types/workspace";

type WorkspaceGovernance = WorkspaceGovernanceSettings & {
  workspaceVisibility: "private" | "public";
};

type WorkspaceDirectoryRow = {
  id: string;
  name: string;
  slug: string;
  type: "public" | "private";
  role: "owner" | "admin" | "member";
  membersCount: number;
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

const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = {
  riskResolveClose: true,
  secretsMutations: true,
  docsPublishing: true,
  workflowStageChanges: true,
  requiredApproverRoles: ["owner", "admin"],
};

const hasChanges = <T extends object>(value: T, saved: T) => {
  const left = value as Record<string, unknown>;
  const right = saved as Record<string, unknown>;

  return Object.keys(left).some((key) => left[key] !== right[key]);
};

const resolvePrimaryRole = (
  roles: Array<{ name?: string } | string> = [],
): WorkspaceDirectoryRow["role"] => {
  const normalizedRoles = roles
    .map((role) =>
      typeof role === "string"
        ? role.trim().toLowerCase()
        : String(role?.name || "")
            .trim()
            .toLowerCase(),
    )
    .filter(Boolean);

  if (normalizedRoles.includes("owner")) {
    return "owner";
  }
  if (normalizedRoles.includes("admin")) {
    return "admin";
  }
  return "member";
};

const SettingsWorkspaces = () => {
  const { user } = useAuthStore();
  const { workspaceId, setWorkspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const readOnlyWorkspaceSettings = !canManageWorkspaceSettings;

  const {
    useSwitchWorkspace,
    useWorkspaceById,
    useUpdateWorkspace,
    useUsersWorkSpace,
  } = useWorkspace();
  const { useWorkspaceApprovalPolicy, useUpdateWorkspaceApprovalPolicy } =
    useWorkspacePortfolio();
  const activeWorkspaceQuery = useWorkspaceById(workspaceId!);
  const activeWorkspace = activeWorkspaceQuery.data?.data?.workspace;
  const workspaceDirectoryQuery = useUsersWorkSpace({
    page: 1,
    limit: 100,
    search: "",
  });
  const approvalPolicyQuery = useWorkspaceApprovalPolicy(workspaceId || "", {
    enabled: !!workspaceId && canManageWorkspaceSettings,
  });

  const workspaceDirectoryRows = useMemo<WorkspaceDirectoryRow[]>(() => {
    const fromStore =
      user?.workspaces?.map((entry) => {
        const item = entry?.workspaceId;
        const id = String(item?._id || "").trim();
        if (!id) {
          return null;
        }

        return {
          id,
          name: String(item?.name || "Workspace").trim() || "Workspace",
          slug: String(item?.slug || "").trim(),
          type: item?.type === "public" ? "public" : "private",
          role: entry?.role || "member",
          membersCount: Array.isArray(item?.members) ? item.members.length : 0,
        } as WorkspaceDirectoryRow;
      }) || [];

    const normalizedFromStore = fromStore.filter(
      Boolean,
    ) as WorkspaceDirectoryRow[];
    if (normalizedFromStore.length) {
      return normalizedFromStore;
    }

    const fromQuery = workspaceDirectoryQuery.data?.data?.workspaces || [];
    return fromQuery
      .map((workspace) => {
        const id = String(workspace?._id || "").trim();
        if (!id) {
          return null;
        }

        const rawRoles = Array.isArray((workspace as { roles?: unknown }).roles)
          ? ((workspace as { roles?: Array<{ name?: string } | string> })
              .roles as Array<{ name?: string } | string>)
          : [];

        return {
          id,
          name: String(workspace?.name || "Workspace").trim() || "Workspace",
          slug: String(workspace?.slug || "").trim(),
          type: workspace?.type === "public" ? "public" : "private",
          role: resolvePrimaryRole(rawRoles),
          membersCount: Array.isArray(workspace?.members)
            ? workspace.members.length
            : 0,
        } as WorkspaceDirectoryRow;
      })
      .filter(Boolean) as WorkspaceDirectoryRow[];
  }, [user?.workspaces, workspaceDirectoryQuery.data?.data?.workspaces]);

  const workspaceDirectoryLoading =
    workspaceDirectoryRows.length === 0 && workspaceDirectoryQuery.isLoading;

  const {
    isPending: isSwitchingWorkspace,
    mutateAsync: switchWorkspace,
    variables,
  } = useSwitchWorkspace({
    onSuccess(data) {
      router.replace(ROUTES.DASHBOARD);
      setWorkspaceId(data?.data?.workspace?._id);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["get-workspace-detail"] });
    },
  });

  const [governance, setGovernance] =
    useState<WorkspaceGovernance>(DEFAULT_GOVERNANCE);
  const [savedGovernance, setSavedGovernance] =
    useState<WorkspaceGovernance>(DEFAULT_GOVERNANCE);
  const [workSchedule, setWorkSchedule] = useState<WorkspaceWorkSchedule>(
    DEFAULT_WORK_SCHEDULE,
  );
  const [savedWorkSchedule, setSavedWorkSchedule] =
    useState<WorkspaceWorkSchedule>(DEFAULT_WORK_SCHEDULE);
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>(
    DEFAULT_APPROVAL_POLICY,
  );
  const [savedApprovalPolicy, setSavedApprovalPolicy] =
    useState<ApprovalPolicy>(DEFAULT_APPROVAL_POLICY);

  useEffect(() => {
    if (!activeWorkspace) {
      return;
    }

    const nextGovernance: WorkspaceGovernance = {
      ...DEFAULT_GOVERNANCE,
      ...(activeWorkspace.governance || {}),
      workspaceVisibility:
        activeWorkspace.type === "public" ? "public" : "private",
    };

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

  useEffect(() => {
    const policy = approvalPolicyQuery.data?.data?.policy;
    if (!policy) {
      return;
    }

    const normalizedPolicy: ApprovalPolicy = {
      ...DEFAULT_APPROVAL_POLICY,
      ...policy,
      requiredApproverRoles:
        Array.isArray(policy.requiredApproverRoles) &&
        policy.requiredApproverRoles.length
          ? policy.requiredApproverRoles
          : DEFAULT_APPROVAL_POLICY.requiredApproverRoles,
    };
    setApprovalPolicy(normalizedPolicy);
    setSavedApprovalPolicy(normalizedPolicy);
  }, [approvalPolicyQuery.data]);

  const governanceChanged = useMemo(
    () => hasChanges(governance, savedGovernance),
    [governance, savedGovernance],
  );
  const workScheduleChanged = useMemo(
    () => hasChanges(workSchedule, savedWorkSchedule),
    [workSchedule, savedWorkSchedule],
  );
  const approvalPolicyChanged = useMemo(
    () => hasChanges(approvalPolicy, savedApprovalPolicy),
    [approvalPolicy, savedApprovalPolicy],
  );

  const { isPending: isUpdatingWorkspace, mutateAsync: updateWorkspace } =
    useUpdateWorkspace({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail", workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["get-user-workspaces"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
      },
    });
  const {
    isPending: isUpdatingApprovalPolicy,
    mutateAsync: updateApprovalPolicy,
  } = useUpdateWorkspaceApprovalPolicy({
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["workspace-portfolio-approval-policy", workspaceId],
      });
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

  const handleSaveGovernance = () => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspace({
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
    });

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

  const handleSaveApprovalPolicy = () => {
    if (!workspaceId || readOnlyWorkspaceSettings) {
      return;
    }

    const request = updateApprovalPolicy({
      workspaceId,
      updates: approvalPolicy,
    });

    toast.promise(request, {
      loading: "Saving approval workflow...",
      success: (data) => {
        const nextPolicy = data?.data?.policy || approvalPolicy;
        setApprovalPolicy(nextPolicy);
        setSavedApprovalPolicy(nextPolicy);
        return data?.data?.message || "Approval workflow updated";
      },
      error: "Could not save approval workflow",
    });
  };

  const handleResetApprovalPolicy = () => {
    setApprovalPolicy(savedApprovalPolicy);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Workspace Directory</FieldLegend>
        <FieldDescription>
          Your organizations and active workspace context.
        </FieldDescription>

        <div className="flex max-w-130 flex-col gap-2">
          {workspaceDirectoryLoading ? (
            <div className="rounded-md px-3 py-3">
              <LoaderComponent />
            </div>
          ) : workspaceDirectoryRows.length ? (
            workspaceDirectoryRows.map((entry) => {
              const isCurrent = entry.id === workspaceId;

              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-3"
                >
                  <FieldContent className="min-w-0">
                    <FieldTitle className="truncate">{entry.name}</FieldTitle>
                    <FieldDescription className="truncate">
                      {entry.slug}.squircle.live
                    </FieldDescription>
                  </FieldContent>

                  <Badge variant="outline" className="capitalize">
                    {entry.type}
                  </Badge>

                  <Badge variant="secondary" className="capitalize">
                    {entry.role}
                  </Badge>

                  {entry.membersCount > 0 ? (
                    <P className="text-muted-foreground text-xs">
                      {entry.membersCount} members
                    </P>
                  ) : null}

                  {isCurrent ? (
                    <Badge className="ml-auto">Current</Badge>
                  ) : (
                    <Button
                      className="ml-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwitchWorkspace(entry.id)}
                      loading={
                        variables?.workspaceId === entry.id &&
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
        <FieldLegend>Governance</FieldLegend>
        <FieldDescription>
          Manage organization permissions and access policies.
        </FieldDescription>
        {readOnlyWorkspaceSettings ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update
            governance.
          </FieldDescription>
        ) : null}

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyWorkspaceSettings && "pointer-events-none opacity-65",
          )}
        >
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

          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Expire chat messages automatically</FieldTitle>
              <FieldDescription>
                Delete old chat messages automatically to reduce database
                growth.
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

          <div className="flex items-center gap-2 pt-1">
            <Button
              className="max-w-20"
              size="sm"
              loading={isUpdatingWorkspace || activeWorkspaceQuery.isLoading}
              disabled={
                !governanceChanged || !workspaceId || readOnlyWorkspaceSettings
              }
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
        <FieldLegend>Approval Workflow</FieldLegend>
        <FieldDescription>
          Decide which sensitive actions require owner/admin approval before
          execution.
        </FieldDescription>
        {readOnlyWorkspaceSettings ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update
            approvals.
          </FieldDescription>
        ) : null}

        {canManageWorkspaceSettings && approvalPolicyQuery.isLoading ? (
          <div className="mt-3">
            <LoaderComponent />
          </div>
        ) : (
          <div
            className={cn(
              "mt-3 flex flex-col gap-4",
              readOnlyWorkspaceSettings && "pointer-events-none opacity-65",
            )}
          >
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Risks (resolve/close)</FieldTitle>
                <FieldDescription>
                  Require approval before users resolve or close risks/issues.
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={approvalPolicy.riskResolveClose}
                onCheckedChange={(checked) =>
                  setApprovalPolicy((prev) => ({
                    ...prev,
                    riskResolveClose: checked,
                  }))
                }
              />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Secrets changes</FieldTitle>
                <FieldDescription>
                  Require approval for secret create/update/delete/reveal
                  operations.
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={approvalPolicy.secretsMutations}
                onCheckedChange={(checked) =>
                  setApprovalPolicy((prev) => ({
                    ...prev,
                    secretsMutations: checked,
                  }))
                }
              />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Docs sharing changes</FieldTitle>
                <FieldDescription>
                  Require approval before doc sharing and publish visibility
                  changes.
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={approvalPolicy.docsPublishing}
                onCheckedChange={(checked) =>
                  setApprovalPolicy((prev) => ({
                    ...prev,
                    docsPublishing: checked,
                  }))
                }
              />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Workflow stage transitions</FieldTitle>
                <FieldDescription>
                  Require approval before moving workflows into protected end
                  stages.
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={approvalPolicy.workflowStageChanges}
                onCheckedChange={(checked) =>
                  setApprovalPolicy((prev) => ({
                    ...prev,
                    workflowStageChanges: checked,
                  }))
                }
              />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Who can approve</FieldTitle>
                <FieldDescription>
                  Choose who can action pending approval requests.
                </FieldDescription>
              </FieldContent>
              <Select
                value={
                  approvalPolicy.requiredApproverRoles.length === 1 &&
                  approvalPolicy.requiredApproverRoles[0] === "owner"
                    ? "owner-only"
                    : "owner-admin"
                }
                onValueChange={(value) =>
                  setApprovalPolicy((prev) => ({
                    ...prev,
                    requiredApproverRoles:
                      value === "owner-only" ? ["owner"] : ["owner", "admin"],
                  }))
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select approver roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner-admin">Owners & admins</SelectItem>
                  <SelectItem value="owner-only">Owners only</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center gap-2 pt-1">
              <Button
                className="max-w-20"
                size="sm"
                loading={isUpdatingApprovalPolicy}
                disabled={
                  !approvalPolicyChanged ||
                  !workspaceId ||
                  readOnlyWorkspaceSettings ||
                  approvalPolicyQuery.isLoading
                }
                onClick={handleSaveApprovalPolicy}
              >
                Save
              </Button>
              <Button
                className="max-w-20"
                size="sm"
                variant="ghost"
                disabled={
                  !approvalPolicyChanged ||
                  readOnlyWorkspaceSettings ||
                  approvalPolicyQuery.isLoading
                }
                onClick={handleResetApprovalPolicy}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Work Hours</FieldLegend>
        <FieldDescription>
          Configure business start and close time for automated pending-task
          email reports.
        </FieldDescription>
        {readOnlyWorkspaceSettings ? (
          <FieldDescription>
            Read-only for workspace members. Ask an owner/admin to update work
            hours.
          </FieldDescription>
        ) : null}

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyWorkspaceSettings && "pointer-events-none opacity-65",
          )}
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Enable scheduled digest emails</FieldTitle>
              <FieldDescription>
                Sends pending-task reports to assignees at start and close of
                day.
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
                Use an IANA timezone, for example: Africa/Lagos, Europe/London,
                America/New_York.
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

          <div className="flex items-center gap-2 pt-1">
            <Button
              className="max-w-20"
              size="sm"
              loading={isUpdatingWorkspace || activeWorkspaceQuery.isLoading}
              disabled={
                !workScheduleChanged ||
                !workspaceId ||
                readOnlyWorkspaceSettings
              }
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
