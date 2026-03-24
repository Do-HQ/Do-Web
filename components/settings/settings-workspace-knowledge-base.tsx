"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceStore from "@/stores/workspace";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import {
  WorkspaceKnowledgeBaseAgentBehaviorSettings,
  WorkspaceKnowledgeBaseGovernanceSettings,
  WorkspaceKnowledgeBaseSourceIndexingSettings,
} from "@/types/workspace";

const DEFAULT_SOURCE_INDEXING: WorkspaceKnowledgeBaseSourceIndexingSettings = {
  indexWorkspaceDocs: true,
  indexProjectSpecs: true,
  indexTaskComments: false,
  includeCompletedProjects: false,
  indexingCadence: "daily",
};

const DEFAULT_AGENT_KNOWLEDGE: WorkspaceKnowledgeBaseAgentBehaviorSettings = {
  requireSourceCitation: true,
  allowSemanticSearchAcrossProjects: true,
  allowDraftAnswersFromPartialSources: false,
  autoSuggestRelatedDocs: true,
  responseDepth: "balanced",
};

const DEFAULT_CONTENT_GOVERNANCE: WorkspaceKnowledgeBaseGovernanceSettings = {
  allowMembersCreatePages: true,
  requireApprovalForPublishedPages: false,
  lockPagesAfterApproval: false,
  archiveStalePages: true,
  stalePageWindow: "60",
};

const hasChanges = <T extends object>(value: T, saved: T) => {
  const left = value as Record<string, unknown>;
  const right = saved as Record<string, unknown>;
  return Object.keys(left).some((key) => left[key] !== right[key]);
};

const SettingsWorkspaceKnowledgeBase = () => {
  const { workspaceId } = useWorkspaceStore();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const queryClient = useQueryClient();
  const readOnlyKnowledgeBase = !canManageWorkspaceSettings;

  const { useWorkspaceById, useUpdateWorkspace } = useWorkspace();
  const workspaceQuery = useWorkspaceById(workspaceId || "");
  const workspace = workspaceQuery.data?.data?.workspace;

  const [sourceIndexing, setSourceIndexing] = useState<WorkspaceKnowledgeBaseSourceIndexingSettings>(
    DEFAULT_SOURCE_INDEXING,
  );
  const [savedSourceIndexing, setSavedSourceIndexing] =
    useState<WorkspaceKnowledgeBaseSourceIndexingSettings>(DEFAULT_SOURCE_INDEXING);

  const [agentKnowledge, setAgentKnowledge] = useState<WorkspaceKnowledgeBaseAgentBehaviorSettings>(
    DEFAULT_AGENT_KNOWLEDGE,
  );
  const [savedAgentKnowledge, setSavedAgentKnowledge] =
    useState<WorkspaceKnowledgeBaseAgentBehaviorSettings>(DEFAULT_AGENT_KNOWLEDGE);

  const [contentGovernance, setContentGovernance] =
    useState<WorkspaceKnowledgeBaseGovernanceSettings>(DEFAULT_CONTENT_GOVERNANCE);
  const [savedContentGovernance, setSavedContentGovernance] =
    useState<WorkspaceKnowledgeBaseGovernanceSettings>(DEFAULT_CONTENT_GOVERNANCE);

  useEffect(() => {
    const knowledgeBase = workspace?.knowledgeBase;
    if (!knowledgeBase) {
      setSourceIndexing(DEFAULT_SOURCE_INDEXING);
      setSavedSourceIndexing(DEFAULT_SOURCE_INDEXING);
      setAgentKnowledge(DEFAULT_AGENT_KNOWLEDGE);
      setSavedAgentKnowledge(DEFAULT_AGENT_KNOWLEDGE);
      setContentGovernance(DEFAULT_CONTENT_GOVERNANCE);
      setSavedContentGovernance(DEFAULT_CONTENT_GOVERNANCE);
      return;
    }

    const nextSourceIndexing: WorkspaceKnowledgeBaseSourceIndexingSettings = {
      ...DEFAULT_SOURCE_INDEXING,
      ...(knowledgeBase.sourceIndexing || {}),
    };
    const nextAgentKnowledge: WorkspaceKnowledgeBaseAgentBehaviorSettings = {
      ...DEFAULT_AGENT_KNOWLEDGE,
      ...(knowledgeBase.agentBehavior || {}),
    };
    const nextContentGovernance: WorkspaceKnowledgeBaseGovernanceSettings = {
      ...DEFAULT_CONTENT_GOVERNANCE,
      ...(knowledgeBase.governance || {}),
    };

    setSourceIndexing(nextSourceIndexing);
    setSavedSourceIndexing(nextSourceIndexing);
    setAgentKnowledge(nextAgentKnowledge);
    setSavedAgentKnowledge(nextAgentKnowledge);
    setContentGovernance(nextContentGovernance);
    setSavedContentGovernance(nextContentGovernance);
  }, [workspace?.knowledgeBase]);

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

  const { isPending: isSavingKnowledgeBase, mutateAsync: updateWorkspace } =
    useUpdateWorkspace({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail"],
        });
        queryClient.invalidateQueries({
          queryKey: ["user"],
        });
      },
    });

  const saveSection = async (
    updates: Partial<{
      sourceIndexing: Partial<WorkspaceKnowledgeBaseSourceIndexingSettings>;
      agentBehavior: Partial<WorkspaceKnowledgeBaseAgentBehaviorSettings>;
      governance: Partial<WorkspaceKnowledgeBaseGovernanceSettings>;
    }>,
    successMessage: string,
    onSuccessLocal: () => void,
  ) => {
    if (!workspaceId) {
      return;
    }

    const request = updateWorkspace({
      workspaceId,
      data: {
        knowledgeBase: updates,
      },
    });

    toast.promise(request, {
      loading: "Saving knowledge base settings...",
      success: (response) => {
        onSuccessLocal();
        return response?.data?.message || successMessage;
      },
      error: "Could not save knowledge base settings",
    });
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Source Indexing</FieldLegend>
        <FieldDescription>
          Choose what content becomes searchable in your workspace knowledge base.
        </FieldDescription>
        {readOnlyKnowledgeBase ? (
          <FieldDescription>
            Read-only for members. Ask an owner/admin to update this.
          </FieldDescription>
        ) : null}

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyKnowledgeBase && "pointer-events-none opacity-65",
          )}
        >
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
                Include project summaries and workflow plans in search.
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
                Include task/risk comments for better troubleshooting context.
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
                Keep archived/completed project knowledge searchable.
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
                  indexingCadence:
                    value as WorkspaceKnowledgeBaseSourceIndexingSettings["indexingCadence"],
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
            <Button
              size="sm"
              className="max-w-20"
              disabled={!sourceChanged || !workspaceId || readOnlyKnowledgeBase}
              loading={isSavingKnowledgeBase}
              onClick={() =>
                void saveSection(
                  { sourceIndexing },
                  "Knowledge source indexing updated",
                  () => setSavedSourceIndexing(sourceIndexing),
                )
              }
            >
              Save
            </Button>
            <Button
              size="sm"
              className="max-w-20"
              variant="ghost"
              disabled={!sourceChanged || readOnlyKnowledgeBase}
              onClick={() => setSourceIndexing(savedSourceIndexing)}
            >
              Reset
            </Button>
          </div>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Agent Knowledge Behavior</FieldLegend>
        <FieldDescription>
          Define how the assistant uses indexed knowledge to answer and suggest.
        </FieldDescription>

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyKnowledgeBase && "pointer-events-none opacity-65",
          )}
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Require source citation</FieldTitle>
              <FieldDescription>
                Include source references in generated answers when possible.
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
              <FieldTitle>Semantic search across projects</FieldTitle>
              <FieldDescription>
                Allow fuzzy, intent-based retrieval from indexed project content.
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
                Allow partial-source suggestions when complete references are unavailable.
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
                Show related knowledge entries when users ask support questions.
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
                Choose default response style for knowledge-based assistance.
              </FieldDescription>
            </FieldContent>
            <Select
              value={agentKnowledge.responseDepth}
              onValueChange={(value) =>
                setAgentKnowledge((prev) => ({
                  ...prev,
                  responseDepth:
                    value as WorkspaceKnowledgeBaseAgentBehaviorSettings["responseDepth"],
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
            <Button
              size="sm"
              className="max-w-20"
              disabled={!agentChanged || !workspaceId || readOnlyKnowledgeBase}
              loading={isSavingKnowledgeBase}
              onClick={() =>
                void saveSection(
                  { agentBehavior: agentKnowledge },
                  "Knowledge behavior updated",
                  () => setSavedAgentKnowledge(agentKnowledge),
                )
              }
            >
              Save
            </Button>
            <Button
              size="sm"
              className="max-w-20"
              variant="ghost"
              disabled={!agentChanged || readOnlyKnowledgeBase}
              onClick={() => setAgentKnowledge(savedAgentKnowledge)}
            >
              Reset
            </Button>
          </div>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Content Governance</FieldLegend>
        <FieldDescription>
          Set ownership and lifecycle controls for workspace knowledge content.
        </FieldDescription>

        <div
          className={cn(
            "mt-3 flex flex-col gap-4",
            readOnlyKnowledgeBase && "pointer-events-none opacity-65",
          )}
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Allow members to create pages</FieldTitle>
              <FieldDescription>
                Permit workspace members to contribute KB pages.
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
                Require explicit approval before KB pages are broadly published.
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
                Prevent accidental edits to approved canonical knowledge pages.
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
              <FieldTitle>Archive stale pages</FieldTitle>
              <FieldDescription>
                Automatically archive old knowledge pages with no recent updates.
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
                Days after which pages are considered stale for auto-archiving.
              </FieldDescription>
            </FieldContent>
            <Select
              value={contentGovernance.stalePageWindow}
              onValueChange={(value) =>
                setContentGovernance((prev) => ({
                  ...prev,
                  stalePageWindow:
                    value as WorkspaceKnowledgeBaseGovernanceSettings["stalePageWindow"],
                }))
              }
              disabled={!contentGovernance.archiveStalePages}
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
            <Button
              size="sm"
              className="max-w-20"
              disabled={!governanceChanged || !workspaceId || readOnlyKnowledgeBase}
              loading={isSavingKnowledgeBase}
              onClick={() =>
                void saveSection(
                  { governance: contentGovernance },
                  "Knowledge governance updated",
                  () => setSavedContentGovernance(contentGovernance),
                )
              }
            >
              Save
            </Button>
            <Button
              size="sm"
              className="max-w-20"
              variant="ghost"
              disabled={!governanceChanged || readOnlyKnowledgeBase}
              onClick={() => setContentGovernance(savedContentGovernance)}
            >
              Reset
            </Button>
          </div>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceKnowledgeBase;
