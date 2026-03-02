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

type SourceIndexingSettings = {
  indexWorkspaceDocs: boolean;
  indexProjectSpecs: boolean;
  indexTaskComments: boolean;
  includeCompletedProjects: boolean;
  indexingCadence: "daily" | "weekly" | "manual";
};

type AgentKnowledgeSettings = {
  requireSourceCitation: boolean;
  allowSemanticSearchAcrossProjects: boolean;
  allowDraftAnswersFromPartialSources: boolean;
  autoSuggestRelatedDocs: boolean;
  responseDepth: "concise" | "balanced" | "detailed";
};

type ContentGovernanceSettings = {
  allowMembersCreatePages: boolean;
  requireApprovalForPublishedPages: boolean;
  lockPagesAfterApproval: boolean;
  archiveStalePages: boolean;
  stalePageWindow: "30" | "60" | "90";
};

const DEFAULT_SOURCE_INDEXING: SourceIndexingSettings = {
  indexWorkspaceDocs: true,
  indexProjectSpecs: true,
  indexTaskComments: false,
  includeCompletedProjects: false,
  indexingCadence: "daily",
};

const DEFAULT_AGENT_KNOWLEDGE: AgentKnowledgeSettings = {
  requireSourceCitation: true,
  allowSemanticSearchAcrossProjects: true,
  allowDraftAnswersFromPartialSources: false,
  autoSuggestRelatedDocs: true,
  responseDepth: "balanced",
};

const DEFAULT_CONTENT_GOVERNANCE: ContentGovernanceSettings = {
  allowMembersCreatePages: true,
  requireApprovalForPublishedPages: false,
  lockPagesAfterApproval: false,
  archiveStalePages: true,
  stalePageWindow: "60",
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaceKnowledgeBase = () => {
  const [sourceIndexing, setSourceIndexing] = useState<SourceIndexingSettings>(
    DEFAULT_SOURCE_INDEXING,
  );
  const [savedSourceIndexing, setSavedSourceIndexing] =
    useState<SourceIndexingSettings>(DEFAULT_SOURCE_INDEXING);

  const [agentKnowledge, setAgentKnowledge] = useState<AgentKnowledgeSettings>(
    DEFAULT_AGENT_KNOWLEDGE,
  );
  const [savedAgentKnowledge, setSavedAgentKnowledge] =
    useState<AgentKnowledgeSettings>(DEFAULT_AGENT_KNOWLEDGE);

  const [contentGovernance, setContentGovernance] =
    useState<ContentGovernanceSettings>(DEFAULT_CONTENT_GOVERNANCE);
  const [savedContentGovernance, setSavedContentGovernance] =
    useState<ContentGovernanceSettings>(DEFAULT_CONTENT_GOVERNANCE);

  const sourceChanged = useMemo(
    () => hasChanges(sourceIndexing, savedSourceIndexing),
    [sourceIndexing, savedSourceIndexing],
  );
  const agentChanged = useMemo(
    () => hasChanges(agentKnowledge, savedAgentKnowledge),
    [agentKnowledge, savedAgentKnowledge],
  );
  const governanceChanged = useMemo(
    () => hasChanges(contentGovernance, savedContentGovernance),
    [contentGovernance, savedContentGovernance],
  );

  const handleSaveSourceIndexing = () => {
    setSavedSourceIndexing(sourceIndexing);
    toast.success("Knowledge indexing updated", {
      description: "Source indexing preferences are saved locally for now.",
    });
  };

  const handleSaveAgentKnowledge = () => {
    setSavedAgentKnowledge(agentKnowledge);
    toast.success("Agent knowledge behavior updated", {
      description: "Agent knowledge controls are saved locally for now.",
    });
  };

  const handleSaveGovernance = () => {
    setSavedContentGovernance(contentGovernance);
    toast.success("Knowledge governance updated", {
      description: "Content governance rules are saved locally for now.",
    });
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Source Indexing</FieldLegend>
        <FieldDescription>
          Choose what content becomes searchable in your workspace knowledge base.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Index workspace docs</FieldTitle>
            <FieldDescription>
              Include pages and structured docs from the workspace hub.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={sourceIndexing.indexWorkspaceDocs}
            onCheckedChange={(checked) =>
              setSourceIndexing((prev) => ({ ...prev, indexWorkspaceDocs: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Index project specs</FieldTitle>
            <FieldDescription>
              Include product requirement and planning specs by default.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={sourceIndexing.indexProjectSpecs}
            onCheckedChange={(checked) =>
              setSourceIndexing((prev) => ({ ...prev, indexProjectSpecs: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Index task comments</FieldTitle>
            <FieldDescription>
              Include task discussions in semantic search.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={sourceIndexing.indexTaskComments}
            onCheckedChange={(checked) =>
              setSourceIndexing((prev) => ({ ...prev, indexTaskComments: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Include completed projects</FieldTitle>
            <FieldDescription>
              Keep archived project knowledge available for retrieval.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={sourceIndexing.includeCompletedProjects}
            onCheckedChange={(checked) =>
              setSourceIndexing((prev) => ({
                ...prev,
                includeCompletedProjects: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Indexing cadence</FieldTitle>
            <FieldDescription>
              Set how often indexing refreshes source content.
            </FieldDescription>
          </FieldContent>
          <Select
            value={sourceIndexing.indexingCadence}
            onValueChange={(value) =>
              setSourceIndexing((prev) => ({
                ...prev,
                indexingCadence: value as SourceIndexingSettings["indexingCadence"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Cadence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button size="sm" className="max-w-20" disabled={!sourceChanged} onClick={handleSaveSourceIndexing}>
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!sourceChanged}
            onClick={() => setSourceIndexing(savedSourceIndexing)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Agent Knowledge Behavior</FieldLegend>
        <FieldDescription>
          Define how the agent uses indexed knowledge to answer and suggest.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require source citation</FieldTitle>
            <FieldDescription>
              Force references in generated summaries and recommendations.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentKnowledge.requireSourceCitation}
            onCheckedChange={(checked) =>
              setAgentKnowledge((prev) => ({
                ...prev,
                requireSourceCitation: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow semantic search across projects</FieldTitle>
            <FieldDescription>
              Let the agent retrieve related context outside the current project.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentKnowledge.allowSemanticSearchAcrossProjects}
            onCheckedChange={(checked) =>
              setAgentKnowledge((prev) => ({
                ...prev,
                allowSemanticSearchAcrossProjects: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow draft answers from partial sources</FieldTitle>
            <FieldDescription>
              Permit provisional answers when full context is unavailable.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentKnowledge.allowDraftAnswersFromPartialSources}
            onCheckedChange={(checked) =>
              setAgentKnowledge((prev) => ({
                ...prev,
                allowDraftAnswersFromPartialSources: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-suggest related docs</FieldTitle>
            <FieldDescription>
              Show contextually related documentation in workflows and tasks.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentKnowledge.autoSuggestRelatedDocs}
            onCheckedChange={(checked) =>
              setAgentKnowledge((prev) => ({
                ...prev,
                autoSuggestRelatedDocs: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Response depth</FieldTitle>
            <FieldDescription>
              Choose how detailed generated answers should be by default.
            </FieldDescription>
          </FieldContent>
          <Select
            value={agentKnowledge.responseDepth}
            onValueChange={(value) =>
              setAgentKnowledge((prev) => ({
                ...prev,
                responseDepth: value as AgentKnowledgeSettings["responseDepth"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Depth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button size="sm" className="max-w-20" disabled={!agentChanged} onClick={handleSaveAgentKnowledge}>
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!agentChanged}
            onClick={() => setAgentKnowledge(savedAgentKnowledge)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Content Governance</FieldLegend>
        <FieldDescription>
          Set ownership and lifecycle rules for workspace knowledge pages.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow members to create pages</FieldTitle>
            <FieldDescription>
              Permit non-admin users to publish knowledge entries.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={contentGovernance.allowMembersCreatePages}
            onCheckedChange={(checked) =>
              setContentGovernance((prev) => ({
                ...prev,
                allowMembersCreatePages: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require approval for published pages</FieldTitle>
            <FieldDescription>
              Route new pages through approver review before publishing.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={contentGovernance.requireApprovalForPublishedPages}
            onCheckedChange={(checked) =>
              setContentGovernance((prev) => ({
                ...prev,
                requireApprovalForPublishedPages: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Lock pages after approval</FieldTitle>
            <FieldDescription>
              Prevent editing approved pages without new change request.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={contentGovernance.lockPagesAfterApproval}
            onCheckedChange={(checked) =>
              setContentGovernance((prev) => ({
                ...prev,
                lockPagesAfterApproval: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Archive stale pages automatically</FieldTitle>
            <FieldDescription>
              Move outdated pages to archive when inactive for a period.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={contentGovernance.archiveStalePages}
            onCheckedChange={(checked) =>
              setContentGovernance((prev) => ({
                ...prev,
                archiveStalePages: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Stale page window</FieldTitle>
            <FieldDescription>
              Set inactivity duration before auto-archive runs.
            </FieldDescription>
          </FieldContent>
          <Select
            value={contentGovernance.stalePageWindow}
            onValueChange={(value) =>
              setContentGovernance((prev) => ({
                ...prev,
                stalePageWindow: value as ContentGovernanceSettings["stalePageWindow"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button size="sm" className="max-w-20" disabled={!governanceChanged} onClick={handleSaveGovernance}>
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!governanceChanged}
            onClick={() => setContentGovernance(savedContentGovernance)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceKnowledgeBase;
