"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import useWorkspace from "@/hooks/use-workspace";
import useWorkspacePortfolio from "@/hooks/use-workspace-portfolio";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import { ApprovalPolicy } from "@/types/portfolio";
import { WorkspaceGovernanceSettings } from "@/types/workspace";

type SecurityGovernanceSettings = Pick<
  WorkspaceGovernanceSettings,
  | "restrictInvitesToAdmins"
  | "requireJoinRequestApproval"
  | "enableMessageExpiry"
  | "messageRetentionDays"
>;

const DEFAULT_SECURITY_GOVERNANCE: SecurityGovernanceSettings = {
  restrictInvitesToAdmins: false,
  requireJoinRequestApproval: true,
  enableMessageExpiry: false,
  messageRetentionDays: 30,
};

const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = {
  riskResolveClose: true,
  secretsMutations: true,
  docsPublishing: true,
  workflowStageChanges: true,
  requiredApproverRoles: ["owner", "admin"],
};

const RETENTION_OPTIONS = [7, 14, 30, 60, 90, 180, 365] as const;

const hasGovernanceChanges = (
  nextValue: SecurityGovernanceSettings,
  savedValue: SecurityGovernanceSettings,
) =>
  nextValue.restrictInvitesToAdmins !== savedValue.restrictInvitesToAdmins ||
  nextValue.requireJoinRequestApproval !== savedValue.requireJoinRequestApproval ||
  nextValue.enableMessageExpiry !== savedValue.enableMessageExpiry ||
  nextValue.messageRetentionDays !== savedValue.messageRetentionDays;

const hasApprovalPolicyChanges = (
  nextValue: ApprovalPolicy,
  savedValue: ApprovalPolicy,
) =>
  nextValue.riskResolveClose !== savedValue.riskResolveClose ||
  nextValue.secretsMutations !== savedValue.secretsMutations ||
  nextValue.docsPublishing !== savedValue.docsPublishing ||
  nextValue.workflowStageChanges !== savedValue.workflowStageChanges ||
  nextValue.requiredApproverRoles.join("|") !==
    savedValue.requiredApproverRoles.join("|");

const SettingsWorkspaceSecurity = () => {
  const { workspaceId } = useWorkspaceStore();
  const { canManageWorkspaceSecurity } = useWorkspacePermissions();
  const queryClient = useQueryClient();
  const readOnlyWorkspaceSecurity = !canManageWorkspaceSecurity;

  const { useWorkspaceById, useUpdateWorkspace } = useWorkspace();
  const workspaceQuery = useWorkspaceById(workspaceId || "");
  const workspace = workspaceQuery.data?.data?.workspace;

  const { useWorkspaceApprovalPolicy, useUpdateWorkspaceApprovalPolicy } =
    useWorkspacePortfolio();
  const approvalPolicyQuery = useWorkspaceApprovalPolicy(workspaceId || "", {
    enabled: !!workspaceId && canManageWorkspaceSecurity,
  });

  const [governance, setGovernance] = useState<SecurityGovernanceSettings>(
    DEFAULT_SECURITY_GOVERNANCE,
  );
  const [savedGovernance, setSavedGovernance] =
    useState<SecurityGovernanceSettings>(DEFAULT_SECURITY_GOVERNANCE);
  const [approvalPolicy, setApprovalPolicy] =
    useState<ApprovalPolicy>(DEFAULT_APPROVAL_POLICY);
  const [savedApprovalPolicy, setSavedApprovalPolicy] =
    useState<ApprovalPolicy>(DEFAULT_APPROVAL_POLICY);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    const nextGovernance: SecurityGovernanceSettings = {
      ...DEFAULT_SECURITY_GOVERNANCE,
      ...(workspace.governance || {}),
    };

    setGovernance(nextGovernance);
    setSavedGovernance(nextGovernance);
  }, [workspace]);

  useEffect(() => {
    if (!approvalPolicyQuery.data?.data?.policy) {
      return;
    }

    const nextPolicy: ApprovalPolicy = {
      ...DEFAULT_APPROVAL_POLICY,
      ...approvalPolicyQuery.data.data.policy,
      requiredApproverRoles:
        Array.isArray(approvalPolicyQuery.data.data.policy.requiredApproverRoles) &&
        approvalPolicyQuery.data.data.policy.requiredApproverRoles.length
          ? approvalPolicyQuery.data.data.policy.requiredApproverRoles
          : DEFAULT_APPROVAL_POLICY.requiredApproverRoles,
    };

    setApprovalPolicy(nextPolicy);
    setSavedApprovalPolicy(nextPolicy);
  }, [approvalPolicyQuery.data]);

  const governanceChanged = useMemo(
    () => hasGovernanceChanges(governance, savedGovernance),
    [governance, savedGovernance],
  );

  const approvalPolicyChanged = useMemo(
    () => hasApprovalPolicyChanges(approvalPolicy, savedApprovalPolicy),
    [approvalPolicy, savedApprovalPolicy],
  );

  const { isPending: isSavingGovernance, mutateAsync: updateWorkspace } =
    useUpdateWorkspace({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail", workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["get-workspace-detail"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
      },
    });

  const {
    isPending: isSavingApprovalPolicy,
    mutateAsync: updateWorkspaceApprovalPolicy,
  } = useUpdateWorkspaceApprovalPolicy({
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["workspace-portfolio-approval-policy", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-portfolio-approval-requests", workspaceId],
      });
    },
  });

  const handleSaveGovernance = () => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspace({
      workspaceId,
      data: {
        governance: {
          restrictInvitesToAdmins: governance.restrictInvitesToAdmins,
          requireJoinRequestApproval: governance.requireJoinRequestApproval,
          enableMessageExpiry: governance.enableMessageExpiry,
          messageRetentionDays: governance.messageRetentionDays,
        },
      },
    });

    toast.promise(request, {
      loading: "Saving workspace security...",
      success: (response) => {
        setSavedGovernance(governance);
        return response?.data?.message || "Workspace security updated";
      },
      error: "Could not save workspace security",
    });
  };

  const handleResetGovernance = () => {
    setGovernance(savedGovernance);
  };

  const handleSaveApprovalPolicy = () => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspaceApprovalPolicy({
      workspaceId,
      updates: approvalPolicy,
    });

    toast.promise(request, {
      loading: "Saving approval gates...",
      success: (response) => {
        setSavedApprovalPolicy(approvalPolicy);
        return response?.data?.message || "Approval policy updated";
      },
      error: "Could not save approval policy",
    });
  };

  const handleResetApprovalPolicy = () => {
    setApprovalPolicy(savedApprovalPolicy);
  };

  const approverScopeValue = approvalPolicy.requiredApproverRoles.includes("admin")
    ? "owner-admin"
    : "owner-only";

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Workspace Security</FieldLegend>
        <FieldDescription>
          Enforce invite, join, and message retention controls across the workspace.
        </FieldDescription>
        {readOnlyWorkspaceSecurity ? (
          <FieldDescription>
            Read-only for members. Ask a workspace owner/admin to update security.
          </FieldDescription>
        ) : null}

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyWorkspaceSecurity && "pointer-events-none opacity-65",
          )}
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Restrict invites to admins</FieldTitle>
              <FieldDescription>
                Only owners/admins can invite new members to the workspace.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={governance.restrictInvitesToAdmins}
              disabled={workspaceQuery.isLoading}
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
                New join requests stay pending until an owner/admin reviews them.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={governance.requireJoinRequestApproval}
              disabled={workspaceQuery.isLoading}
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
              <FieldTitle>Enable message expiry</FieldTitle>
              <FieldDescription>
                Automatically remove old space messages based on the retention window.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={governance.enableMessageExpiry}
              disabled={workspaceQuery.isLoading}
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
                How long messages are retained when expiry is enabled.
              </FieldDescription>
            </FieldContent>
            <Select
              value={String(governance.messageRetentionDays)}
              disabled={!governance.enableMessageExpiry}
              onValueChange={(value) =>
                setGovernance((prev) => ({
                  ...prev,
                  messageRetentionDays: Number(value),
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Retention" />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <Button
              className="max-w-20"
              size="sm"
              loading={isSavingGovernance}
              disabled={
                !governanceChanged || !workspaceId || readOnlyWorkspaceSecurity
              }
              onClick={handleSaveGovernance}
            >
              Save
            </Button>
            <Button
              className="max-w-20"
              size="sm"
              variant="ghost"
              disabled={!governanceChanged || readOnlyWorkspaceSecurity}
              onClick={handleResetGovernance}
            >
              Reset
            </Button>
          </div>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Approval Gates</FieldLegend>
        <FieldDescription>
          Decide which sensitive actions require explicit approval before they are applied.
        </FieldDescription>

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyWorkspaceSecurity && "pointer-events-none opacity-65",
          )}
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Risk resolve/close requires approval</FieldTitle>
              <FieldDescription>
                Block risk closure until an approver signs off.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={approvalPolicy.riskResolveClose}
              disabled={approvalPolicyQuery.isLoading}
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
              <FieldTitle>Secret updates/reveal requires approval</FieldTitle>
              <FieldDescription>
                Gate secret mutation and reveal actions behind approval.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={approvalPolicy.secretsMutations}
              disabled={approvalPolicyQuery.isLoading}
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
              <FieldTitle>Document publishing requires approval</FieldTitle>
              <FieldDescription>
                Require approval before public/external document publishing actions.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={approvalPolicy.docsPublishing}
              disabled={approvalPolicyQuery.isLoading}
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
              <FieldTitle>Workflow stage changes require approval</FieldTitle>
              <FieldDescription>
                Enforce approval when workflows move into protected stages.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={approvalPolicy.workflowStageChanges}
              disabled={approvalPolicyQuery.isLoading}
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
              <FieldTitle>Approver scope</FieldTitle>
              <FieldDescription>
                Choose whether only owners or owners + admins can approve.
              </FieldDescription>
            </FieldContent>
            <Select
              value={approverScopeValue}
              onValueChange={(value) =>
                setApprovalPolicy((prev) => ({
                  ...prev,
                  requiredApproverRoles:
                    value === "owner-only" ? ["owner"] : ["owner", "admin"],
                }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Approver scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner-admin">Owners + admins</SelectItem>
                <SelectItem value="owner-only">Owners only</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <Button
              className="max-w-20"
              size="sm"
              loading={isSavingApprovalPolicy}
              disabled={
                !approvalPolicyChanged || !workspaceId || readOnlyWorkspaceSecurity
              }
              onClick={handleSaveApprovalPolicy}
            >
              Save
            </Button>
            <Button
              className="max-w-20"
              size="sm"
              variant="ghost"
              disabled={!approvalPolicyChanged || readOnlyWorkspaceSecurity}
              onClick={handleResetApprovalPolicy}
            >
              Reset
            </Button>
          </div>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceSecurity;
