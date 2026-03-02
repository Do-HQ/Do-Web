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

type AutomationRulesSettings = {
  autoCreateWorkflowTasks: boolean;
  autoAssignTasks: boolean;
  autoSetDueDates: boolean;
  triggerOnPhaseChange: boolean;
  planningCadence: "hourly" | "daily" | "weekly";
  assignmentStrategy: "least-loaded" | "round-robin" | "lead-review";
};

type AgentExecutionSettings = {
  agentCanReprioritize: boolean;
  agentCanDraftUpdates: boolean;
  agentCanPlanSprints: boolean;
  requireApprovalForBulkActions: boolean;
  requireApprovalForDeadlineChanges: boolean;
  escalationThreshold: "low" | "medium" | "high";
};

type SafetyAuditSettings = {
  actionLogsEnabled: boolean;
  sendFailureAlerts: boolean;
  pauseAllAutomations: boolean;
  logRetentionDays: "30" | "90" | "180";
  rollbackWindow: "15m" | "1h" | "24h";
};

const DEFAULT_AUTOMATION_RULES: AutomationRulesSettings = {
  autoCreateWorkflowTasks: true,
  autoAssignTasks: true,
  autoSetDueDates: false,
  triggerOnPhaseChange: true,
  planningCadence: "daily",
  assignmentStrategy: "least-loaded",
};

const DEFAULT_AGENT_EXECUTION: AgentExecutionSettings = {
  agentCanReprioritize: true,
  agentCanDraftUpdates: true,
  agentCanPlanSprints: false,
  requireApprovalForBulkActions: true,
  requireApprovalForDeadlineChanges: true,
  escalationThreshold: "medium",
};

const DEFAULT_SAFETY_AUDIT: SafetyAuditSettings = {
  actionLogsEnabled: true,
  sendFailureAlerts: true,
  pauseAllAutomations: false,
  logRetentionDays: "90",
  rollbackWindow: "1h",
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaceAutomation = () => {
  const [rules, setRules] = useState<AutomationRulesSettings>(
    DEFAULT_AUTOMATION_RULES,
  );
  const [savedRules, setSavedRules] = useState<AutomationRulesSettings>(
    DEFAULT_AUTOMATION_RULES,
  );

  const [agentExecution, setAgentExecution] = useState<AgentExecutionSettings>(
    DEFAULT_AGENT_EXECUTION,
  );
  const [savedAgentExecution, setSavedAgentExecution] =
    useState<AgentExecutionSettings>(DEFAULT_AGENT_EXECUTION);

  const [safetyAudit, setSafetyAudit] = useState<SafetyAuditSettings>(
    DEFAULT_SAFETY_AUDIT,
  );
  const [savedSafetyAudit, setSavedSafetyAudit] = useState<SafetyAuditSettings>(
    DEFAULT_SAFETY_AUDIT,
  );

  const rulesChanged = useMemo(
    () => hasChanges(rules, savedRules),
    [rules, savedRules],
  );
  const agentExecutionChanged = useMemo(
    () => hasChanges(agentExecution, savedAgentExecution),
    [agentExecution, savedAgentExecution],
  );
  const safetyAuditChanged = useMemo(
    () => hasChanges(safetyAudit, savedSafetyAudit),
    [safetyAudit, savedSafetyAudit],
  );

  const handleSaveRules = () => {
    setSavedRules(rules);
    toast.success("Automation rules updated", {
      description: "Automation rule defaults are saved locally for now.",
    });
  };

  const handleResetRules = () => {
    setRules(savedRules);
  };

  const handleSaveAgentExecution = () => {
    setSavedAgentExecution(agentExecution);
    toast.success("Agent execution updated", {
      description: "Agent permissions are saved locally for now.",
    });
  };

  const handleResetAgentExecution = () => {
    setAgentExecution(savedAgentExecution);
  };

  const handleSaveSafetyAudit = () => {
    setSavedSafetyAudit(safetyAudit);
    toast.success("Safety and audit updated", {
      description: "Safety controls are saved locally for now.",
    });
  };

  const handleResetSafetyAudit = () => {
    setSafetyAudit(savedSafetyAudit);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Automation Rules</FieldLegend>
        <FieldDescription>
          Define how work is automatically created, assigned, and scheduled.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-create tasks from workflow phases</FieldTitle>
            <FieldDescription>
              Generate task stubs whenever a new phase is created in a project.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={rules.autoCreateWorkflowTasks}
            onCheckedChange={(checked) =>
              setRules((prev) => ({ ...prev, autoCreateWorkflowTasks: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-assign new tasks</FieldTitle>
            <FieldDescription>
              Assign tasks automatically based on selected assignment strategy.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={rules.autoAssignTasks}
            onCheckedChange={(checked) =>
              setRules((prev) => ({ ...prev, autoAssignTasks: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-set due dates</FieldTitle>
            <FieldDescription>
              Calculate due dates using workflow SLAs and workload context.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={rules.autoSetDueDates}
            onCheckedChange={(checked) =>
              setRules((prev) => ({ ...prev, autoSetDueDates: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Trigger planning on phase changes</FieldTitle>
            <FieldDescription>
              Re-plan queued tasks when a workflow phase is added or updated.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={rules.triggerOnPhaseChange}
            onCheckedChange={(checked) =>
              setRules((prev) => ({ ...prev, triggerOnPhaseChange: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Planning cadence</FieldTitle>
            <FieldDescription>
              Define how often the automation engine scans for updates.
            </FieldDescription>
          </FieldContent>
          <Select
            value={rules.planningCadence}
            onValueChange={(value) =>
              setRules((prev) => ({
                ...prev,
                planningCadence: value as AutomationRulesSettings["planningCadence"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select cadence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Assignment strategy</FieldTitle>
            <FieldDescription>
              Decide how task ownership is selected by default.
            </FieldDescription>
          </FieldContent>
          <Select
            value={rules.assignmentStrategy}
            onValueChange={(value) =>
              setRules((prev) => ({
                ...prev,
                assignmentStrategy:
                  value as AutomationRulesSettings["assignmentStrategy"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="least-loaded">Least loaded</SelectItem>
              <SelectItem value="round-robin">Round robin</SelectItem>
              <SelectItem value="lead-review">Lead review</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!rulesChanged}
            onClick={handleSaveRules}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!rulesChanged}
            onClick={handleResetRules}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Agent Execution</FieldLegend>
        <FieldDescription>
          Control what the project-management agent can act on directly.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow reprioritization</FieldTitle>
            <FieldDescription>
              Let the agent reorder backlog priority based on risk and due dates.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentExecution.agentCanReprioritize}
            onCheckedChange={(checked) =>
              setAgentExecution((prev) => ({
                ...prev,
                agentCanReprioritize: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow draft status updates</FieldTitle>
            <FieldDescription>
              Let the agent draft progress updates from project activity.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentExecution.agentCanDraftUpdates}
            onCheckedChange={(checked) =>
              setAgentExecution((prev) => ({
                ...prev,
                agentCanDraftUpdates: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow sprint planning suggestions</FieldTitle>
            <FieldDescription>
              Enable sprint or milestone planning suggestions from the agent.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentExecution.agentCanPlanSprints}
            onCheckedChange={(checked) =>
              setAgentExecution((prev) => ({
                ...prev,
                agentCanPlanSprints: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require approval for bulk actions</FieldTitle>
            <FieldDescription>
              Require human review before mass task updates are applied.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentExecution.requireApprovalForBulkActions}
            onCheckedChange={(checked) =>
              setAgentExecution((prev) => ({
                ...prev,
                requireApprovalForBulkActions: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require approval for deadline changes</FieldTitle>
            <FieldDescription>
              Require review before the agent changes due dates.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentExecution.requireApprovalForDeadlineChanges}
            onCheckedChange={(checked) =>
              setAgentExecution((prev) => ({
                ...prev,
                requireApprovalForDeadlineChanges: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Escalation threshold</FieldTitle>
            <FieldDescription>
              Define when the agent escalates blocked or risky work.
            </FieldDescription>
          </FieldContent>
          <Select
            value={agentExecution.escalationThreshold}
            onValueChange={(value) =>
              setAgentExecution((prev) => ({
                ...prev,
                escalationThreshold:
                  value as AgentExecutionSettings["escalationThreshold"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select threshold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!agentExecutionChanged}
            onClick={handleSaveAgentExecution}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!agentExecutionChanged}
            onClick={handleResetAgentExecution}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Safety &amp; Audit</FieldLegend>
        <FieldDescription>
          Add guardrails around automation execution and change history.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enable automation action logs</FieldTitle>
            <FieldDescription>
              Store a trail of actions the automation system performs.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={safetyAudit.actionLogsEnabled}
            onCheckedChange={(checked) =>
              setSafetyAudit((prev) => ({ ...prev, actionLogsEnabled: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Send failure alerts</FieldTitle>
            <FieldDescription>
              Notify admins when rule runs fail or are partially applied.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={safetyAudit.sendFailureAlerts}
            onCheckedChange={(checked) =>
              setSafetyAudit((prev) => ({ ...prev, sendFailureAlerts: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Pause all automations</FieldTitle>
            <FieldDescription>
              Temporarily stop all automation runs across the workspace.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={safetyAudit.pauseAllAutomations}
            onCheckedChange={(checked) =>
              setSafetyAudit((prev) => ({
                ...prev,
                pauseAllAutomations: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Log retention</FieldTitle>
            <FieldDescription>
              Choose how long automation logs should remain available.
            </FieldDescription>
          </FieldContent>
          <Select
            value={safetyAudit.logRetentionDays}
            onValueChange={(value) =>
              setSafetyAudit((prev) => ({
                ...prev,
                logRetentionDays: value as SafetyAuditSettings["logRetentionDays"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select retention" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Rollback window</FieldTitle>
            <FieldDescription>
              Set the time window available for easy rollback actions.
            </FieldDescription>
          </FieldContent>
          <Select
            value={safetyAudit.rollbackWindow}
            onValueChange={(value) =>
              setSafetyAudit((prev) => ({
                ...prev,
                rollbackWindow: value as SafetyAuditSettings["rollbackWindow"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!safetyAuditChanged}
            onClick={handleSaveSafetyAudit}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!safetyAuditChanged}
            onClick={handleResetSafetyAudit}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceAutomation;
