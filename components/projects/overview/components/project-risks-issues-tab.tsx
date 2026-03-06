"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CircleOff,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Send,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mention,
  MentionItem,
  MentionsInput,
  OnChangeHandlerFunc,
} from "react-mentions";
import { useTheme } from "next-themes";

import useWorkspaceProject from "@/hooks/use-workspace-project";
import {
  RiskCommentEventPayload,
  subscribeProjectRiskComments,
  unsubscribeProjectRiskComments,
} from "@/lib/realtime/project-risk-socket";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/auth";
import { WorkspaceProjectRecord } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  ProjectMember,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
  ProjectRisk,
  ProjectRiskComment,
  ProjectRiskKind,
  ProjectRiskSeverity,
  ProjectRiskState,
  ProjectTeamSummary,
} from "../types";
import {
  RISK_BADGE_CLASSES,
  formatPipelineLabel,
  getViewChipClass,
} from "../utils";
import LoaderComponent from "@/components/shared/loader";

type ProjectRisksIssuesTabProps = {
  workspaceId: string | null;
  projectId: string;
  view: ProjectRiskKind;
  onViewChange: (value: ProjectRiskKind) => void;
  selectedPipeline: ProjectPipelineSummary | null;
  selectedTeamId: string;
  onTeamChange: (value: string) => void;
  teams: ProjectTeamSummary[];
  members: ProjectMember[];
  onProjectRecordSynced?: (record: ProjectOverviewRecord | null) => void;
};

type RiskDraft = {
  id?: string;
  kind: ProjectRiskKind;
  title: string;
  description: string;
  severity: ProjectRiskSeverity;
  ownerUserId?: string;
  status: string;
  state: ProjectRiskState;
  teamId?: string;
  pipelineId?: string;
};

type RiskDialogMode = "create" | "view" | "edit";
type MentionKind = "user" | "team";

type RiskCommentMentionPayload = {
  kind: MentionKind;
  id: string;
  label: string;
};

const SEVERITY_OPTIONS: Array<{
  value: ProjectRiskSeverity | "all";
  label: string;
}> = [
  { value: "all", label: "All severities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS: Record<ProjectRiskKind, string[]> = {
  risk: ["Watching", "Mitigating", "Escalated", "Resolved"],
  issue: ["Open", "In progress", "Queued", "Resolved"],
};

function buildEmptyDraft(
  kind: ProjectRiskKind,
  selectedPipeline: ProjectPipelineSummary | null,
  selectedTeamId: string,
) {
  return {
    kind,
    title: "",
    description: "",
    severity: "medium" as ProjectRiskSeverity,
    ownerUserId: undefined,
    status: STATUS_OPTIONS[kind][0],
    state: "open" as ProjectRiskState,
    teamId: selectedTeamId === "all" ? undefined : selectedTeamId,
    pipelineId: selectedPipeline?.id,
  };
}

function stateBadgeClass(state?: ProjectRiskState) {
  if (state === "closed") {
    return "border-muted-foreground/45 text-muted-foreground";
  }

  if (state === "resolved") {
    return "border-emerald-500/45 text-emerald-500";
  }

  return "border-primary/45 text-primary";
}

function formatMentionLabel(label?: string, id?: string) {
  const fallback = String(id || "").trim();
  const source = String(label || fallback).trim();

  return source.replace(/^@+/, "") || fallback;
}

function toRiskDraft(item: ProjectRisk): RiskDraft {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    description: item.description,
    severity: item.severity,
    ownerUserId: item.ownerUserId,
    status: item.status,
    state: item.state || "open",
    teamId: item.teamId,
    pipelineId: item.pipelineId,
  };
}

export function ProjectRisksIssuesTab({
  workspaceId,
  projectId,
  view,
  onViewChange,
  selectedPipeline,
  selectedTeamId,
  onTeamChange,
  teams,
  members,
  onProjectRecordSynced,
}: ProjectRisksIssuesTabProps) {
  const { user } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const {
    useWorkspaceProjectRisks,
    useWorkspaceProjectRiskDetail,
    useCreateWorkspaceProjectRisk,
    useUpdateWorkspaceProjectRisk,
    useResolveWorkspaceProjectRisk,
    useCloseWorkspaceProjectRisk,
    useDeleteWorkspaceProjectRisk,
    useCreateWorkspaceProjectRiskComment,
  } = useWorkspaceProject();

  const [search, setSearch] = useState("");
  const [riskPage, setRiskPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<
    ProjectRiskSeverity | "all"
  >("all");
  const [dialogMode, setDialogMode] = useState<RiskDialogMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<RiskDraft>(
    buildEmptyDraft(view, selectedPipeline, selectedTeamId),
  );
  const [commentDraftMarkup, setCommentDraftMarkup] = useState("");
  const [commentDraftPlain, setCommentDraftPlain] = useState("");
  const [commentMentions, setCommentMentions] = useState<MentionItem[]>([]);

  const risksQuery = useWorkspaceProjectRisks(
    workspaceId ?? "",
    projectId,
    {
      page: riskPage,
      limit: 12,
      kind: view,
      severity: severityFilter,
      state: "all",
      teamId: selectedTeamId,
      pipelineId: selectedPipeline?.id || "",
      search,
      sort: "updated",
    },
    {
      enabled: Boolean(workspaceId) && Boolean(projectId),
    },
  );
  const detailRiskId = editorOpen && draft.id ? draft.id : "";
  const riskDetailQuery = useWorkspaceProjectRiskDetail(
    workspaceId ?? "",
    projectId,
    detailRiskId,
    {
      enabled:
        Boolean(workspaceId) && Boolean(projectId) && Boolean(detailRiskId),
    },
  );
  const createRiskMutation = useCreateWorkspaceProjectRisk();
  const updateRiskMutation = useUpdateWorkspaceProjectRisk();
  const resolveRiskMutation = useResolveWorkspaceProjectRisk();
  const closeRiskMutation = useCloseWorkspaceProjectRisk();
  const deleteRiskMutation = useDeleteWorkspaceProjectRisk();
  const createCommentMutation = useCreateWorkspaceProjectRiskComment();

  const visibleItems = useMemo(
    () => risksQuery.data?.data?.risks ?? [],
    [risksQuery.data],
  );
  const riskPagination = risksQuery.data?.data?.pagination ?? null;
  const currentUserId = String(user?._id || "").trim();
  const detailRisk = riskDetailQuery.data?.data?.risk;
  const detailComments: ProjectRiskComment[] = useMemo(
    () =>
      Array.isArray(detailRisk?.comments)
        ? [...detailRisk.comments].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime(),
          )
        : [],
    [detailRisk],
  );

  const selectedRisk = detailRisk || draft;
  const selectedRiskCreatorId = String(
    detailRisk?.createdByUserId ||
      detailRisk?.ownerUserId ||
      draft.ownerUserId ||
      "",
  ).trim();
  const canEditSelectedRisk =
    dialogMode === "create" ||
    (Boolean(currentUserId) &&
      Boolean(selectedRiskCreatorId) &&
      selectedRiskCreatorId === currentUserId);
  const isClosed = (selectedRisk?.state || "open") === "closed";
  const isViewMode = dialogMode === "view";
  const isReadOnly = isClosed || isViewMode || !canEditSelectedRisk;
  const ownerLabelMap = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  );
  const mentionListBg =
    resolvedTheme === "dark" ? "#000000" : "hsl(var(--popover))";
  const mentionListText =
    resolvedTheme === "dark" ? "#ffffff" : "hsl(var(--popover-foreground))";
  const mentionFocusedBg =
    resolvedTheme === "dark"
      ? "rgba(255,255,255,0.12)"
      : "hsl(var(--muted) / 0.75)";
  const mentionFocusedText =
    resolvedTheme === "dark" ? "#ffffff" : "hsl(var(--foreground))";
  const mentionSuggestions = useMemo(
    () => [
      ...members
        .filter((member) => String(member.id) !== currentUserId)
        .map((member) => ({
          id: `user:${member.id}`,
          display: member.name,
        })),
      ...teams.map((team) => ({
        id: `team:${team.id}`,
        display: `team:${team.name}`,
      })),
    ],
    [currentUserId, members, teams],
  );

  const handleCommentInputChange: OnChangeHandlerFunc = (
    _event,
    newValue,
    newPlainTextValue,
    mentions,
  ) => {
    setCommentDraftMarkup(newValue);
    setCommentDraftPlain(newPlainTextValue);
    setCommentMentions(mentions);
  };

  const syncProjectRecordFromResponse = (
    record?: WorkspaceProjectRecord | null,
  ) => {
    if (!record?.record) {
      return;
    }

    onProjectRecordSynced?.(record.record);
  };

  const invalidateRiskQueries = () => {
    if (!workspaceId) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["workspace-project-risks", workspaceId, projectId],
    });
    queryClient.invalidateQueries({
      queryKey: ["workspace-project-risk-detail", workspaceId, projectId],
    });
    queryClient.invalidateQueries({
      queryKey: ["workspace-project-detail", workspaceId, projectId],
    });
  };

  useEffect(() => {
    setRiskPage(1);
  }, [view, severityFilter, selectedTeamId, selectedPipeline?.id, search]);

  const canEditRiskItem = (
    item: Pick<ProjectRisk, "createdByUserId" | "ownerUserId">,
  ) => {
    const creatorId = String(
      item?.createdByUserId || item?.ownerUserId || "",
    ).trim();

    return Boolean(currentUserId && creatorId && creatorId === currentUserId);
  };

  useEffect(() => {
    if (!workspaceId || !projectId || !detailRiskId) {
      return;
    }

    const socket = subscribeProjectRiskComments({
      workspaceId,
      projectId,
      riskId: detailRiskId,
    });
    const handleRiskCommentCreated = (payload: RiskCommentEventPayload) => {
      if (
        payload.workspaceId !== workspaceId ||
        payload.projectId !== projectId ||
        payload.riskId !== detailRiskId
      ) {
        return;
      }

      queryClient.setQueryData(
        ["workspace-project-risk-detail", workspaceId, projectId, detailRiskId],
        (
          current:
            | {
                data?: {
                  risk?: ProjectRisk;
                };
              }
            | undefined,
        ) => {
          if (!current?.data?.risk) {
            return current;
          }

          const currentRisk = current.data.risk;
          const existingComments = Array.isArray(currentRisk.comments)
            ? currentRisk.comments
            : [];

          if (
            existingComments.some(
              (comment) => comment.id === payload.comment.id,
            )
          ) {
            return current;
          }

          return {
            ...current,
            data: {
              ...current.data,
              risk: {
                ...currentRisk,
                comments: [...existingComments, payload.comment],
                commentCount:
                  (currentRisk.commentCount || existingComments.length) + 1,
                updatedAt: payload.comment.createdAt,
              },
            },
          };
        },
      );

      const queryEntries = queryClient.getQueriesData({
        queryKey: ["workspace-project-risks", workspaceId, projectId],
      });

      queryEntries.forEach(([queryKey, response]) => {
        const typedResponse = response as
          | {
              data?: {
                risks?: ProjectRisk[];
              };
            }
          | undefined;

        if (!Array.isArray(typedResponse?.data?.risks)) {
          return;
        }

        queryClient.setQueryData(queryKey, {
          ...typedResponse,
          data: {
            ...typedResponse.data,
            risks: typedResponse.data.risks.map((item) =>
              item.id === payload.riskId
                ? {
                    ...item,
                    commentCount: (item.commentCount || 0) + 1,
                    updatedAt: payload.comment.createdAt,
                  }
                : item,
            ),
          },
        });
      });
    };

    socket.on("project:risk-comment:created", handleRiskCommentCreated);

    return () => {
      socket.off("project:risk-comment:created", handleRiskCommentCreated);
      unsubscribeProjectRiskComments({
        workspaceId,
        projectId,
        riskId: detailRiskId,
      });
    };
  }, [detailRiskId, projectId, queryClient, workspaceId]);

  const resetCommentDraft = () => {
    setCommentDraftMarkup("");
    setCommentDraftPlain("");
    setCommentMentions([]);
  };

  const openCreate = () => {
    setDialogMode("create");
    setDraft(buildEmptyDraft(view, selectedPipeline, selectedTeamId));
    resetCommentDraft();
    setEditorOpen(true);
  };

  const openDetails = (item: ProjectRisk) => {
    setDialogMode("view");
    setDraft(toRiskDraft(item));
    resetCommentDraft();
    setEditorOpen(true);
  };

  const openEdit = (item: ProjectRisk) => {
    setDialogMode("edit");
    setDraft(toRiskDraft(item));
    resetCommentDraft();
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (dialogMode === "view") {
      return;
    }

    if (!canEditSelectedRisk) {
      toast("Only the creator can edit this record.");
      return;
    }

    if (!workspaceId) {
      toast("Open this project from a workspace to manage risks.");
      return;
    }

    const title = draft.title.trim();
    const description = draft.description.trim();

    if (!title || !description) {
      toast("Title and description are required.");
      return;
    }

    const payload = {
      kind: draft.kind,
      title,
      description,
      severity: draft.severity,
      ownerUserId: draft.ownerUserId || undefined,
      status: draft.status.trim(),
      state: draft.state,
      teamId: draft.teamId,
      pipelineId: draft.pipelineId,
    } as const;

    if (draft.id) {
      await toast.promise(
        updateRiskMutation.mutateAsync({
          workspaceId,
          projectId,
          riskId: draft.id,
          updates: payload,
        }),
        {
          loading: "Saving changes...",
          success: (response) => {
            syncProjectRecordFromResponse(response.data.project);
            invalidateRiskQueries();
            return "Saved.";
          },
          error: "Could not save this record.",
        },
      );
    } else {
      await toast.promise(
        createRiskMutation.mutateAsync({
          workspaceId,
          projectId,
          payload,
        }),
        {
          loading: "Creating record...",
          success: (response) => {
            syncProjectRecordFromResponse(response.data.project);
            invalidateRiskQueries();
            return "Created.";
          },
          error: "Could not create this record.",
        },
      );
    }

    setEditorOpen(false);
  };

  const handleQuickStatus = async (item: ProjectRisk, status: string) => {
    if (!workspaceId || item.state === "closed") {
      return;
    }

    if (!canEditRiskItem(item)) {
      toast("Only the creator can edit this record.");
      return;
    }

    await toast.promise(
      updateRiskMutation.mutateAsync({
        workspaceId,
        projectId,
        riskId: item.id,
        updates: {
          status,
        },
      }),
      {
        loading: "Updating status...",
        success: (response) => {
          syncProjectRecordFromResponse(response.data.project);
          invalidateRiskQueries();
          return "Status updated.";
        },
        error: "Could not update this status.",
      },
    );
  };

  const handleResolve = async (item: ProjectRisk) => {
    if (!workspaceId || item.state === "closed") {
      return;
    }

    if (!canEditRiskItem(item)) {
      toast("Only the creator can resolve this record.");
      return;
    }

    await toast.promise(
      resolveRiskMutation.mutateAsync({
        workspaceId,
        projectId,
        riskId: item.id,
      }),
      {
        loading: "Resolving...",
        success: (response) => {
          syncProjectRecordFromResponse(response.data.project);
          invalidateRiskQueries();
          return "Marked as resolved.";
        },
        error: "Could not resolve this record.",
      },
    );
  };

  const handleClose = async (item: ProjectRisk) => {
    if (!workspaceId || item.state === "closed") {
      return;
    }

    if (!canEditRiskItem(item)) {
      toast("Only the creator can close this record.");
      return;
    }

    await toast.promise(
      closeRiskMutation.mutateAsync({
        workspaceId,
        projectId,
        riskId: item.id,
      }),
      {
        loading: "Closing...",
        success: (response) => {
          syncProjectRecordFromResponse(response.data.project);
          invalidateRiskQueries();
          return "Closed.";
        },
        error: "Could not close this record.",
      },
    );
  };

  const handleDelete = async (item: ProjectRisk) => {
    if (!workspaceId) {
      return;
    }

    if (!canEditRiskItem(item)) {
      toast("Only the creator can delete this record.");
      return;
    }

    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      return;
    }

    await toast.promise(
      deleteRiskMutation.mutateAsync({
        workspaceId,
        projectId,
        riskId: item.id,
      }),
      {
        loading: "Deleting...",
        success: (response) => {
          syncProjectRecordFromResponse(response.data.project);
          invalidateRiskQueries();
          return "Deleted.";
        },
        error: "Could not delete this record.",
      },
    );
  };

  const handleSendComment = async () => {
    if (!workspaceId || !detailRiskId || isClosed) {
      return;
    }

    const message = commentDraftPlain.trim();
    if (!message) {
      return;
    }

    const mentionPayload = [
      ...new Map(
        commentMentions
          .map((mention) => {
            const rawId = String(mention?.id || "").trim();
            const [kind, id] = rawId.split(":");

            if ((kind !== "user" && kind !== "team") || !id) {
              return null;
            }

            const label = String(mention?.display || "").trim();

            return {
              key: `${kind}:${id}`,
              value: {
                kind: kind as MentionKind,
                id,
                label: formatMentionLabel(label, id),
              } satisfies RiskCommentMentionPayload,
            };
          })
          .filter(
            (
              entry,
            ): entry is { key: string; value: RiskCommentMentionPayload } =>
              Boolean(entry?.key && entry?.value),
          )
          .map((entry) => [entry.key, entry.value]),
      ).values(),
    ];

    await toast.promise(
      createCommentMutation.mutateAsync({
        workspaceId,
        projectId,
        riskId: detailRiskId,
        payload: {
          message,
          mentions: mentionPayload,
        },
      }),
      {
        loading: "Posting comment...",
        success: (response) => {
          syncProjectRecordFromResponse(response.data.project);
          queryClient.setQueryData(
            [
              "workspace-project-risk-detail",
              workspaceId,
              projectId,
              detailRiskId,
            ],
            (
              current:
                | {
                    data?: {
                      risk?: ProjectRisk;
                    };
                  }
                | undefined,
            ) => {
              if (!current?.data?.risk) {
                return current;
              }

              const currentRisk = current.data.risk;
              const comments = Array.isArray(currentRisk.comments)
                ? currentRisk.comments
                : [];
              if (
                comments.some((item) => item.id === response.data.comment.id)
              ) {
                return current;
              }

              return {
                ...current,
                data: {
                  ...current.data,
                  risk: {
                    ...currentRisk,
                    comments: [...comments, response.data.comment],
                    commentCount:
                      (currentRisk.commentCount || comments.length) + 1,
                    updatedAt: response.data.comment.createdAt,
                  },
                },
              };
            },
          );
          invalidateRiskQueries();
          resetCommentDraft();
          return "Comment posted.";
        },
        error: "Could not post this comment.",
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <section className="rounded-xl border border-border/35 bg-card/75 shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/20 px-3 py-3 md:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[14px] font-semibold md:text-[15px]">
                Risks & issues
              </div>
              <div className="text-muted-foreground text-[12px] leading-5">
                Track descriptive risks, resolve them deliberately, and close
                them to lock actions and comments.
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <div className="bg-muted/80 inline-flex rounded-md p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewChange("risk")}
                  className={getViewChipClass(view === "risk")}
                >
                  Risks
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewChange("issue")}
                  className={getViewChipClass(view === "issue")}
                >
                  Issues
                </Button>
              </div>

              <div className="relative min-w-48 flex-1 sm:flex-none">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${view === "risk" ? "risks" : "issues"}`}
                  className="h-8 w-full sm:w-52"
                />
              </div>

              <Select
                value={severityFilter}
                onValueChange={(value) =>
                  setSeverityFilter(value as ProjectRiskSeverity | "all")
                }
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTeamId} onValueChange={onTeamChange}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openCreate}
              >
                <Plus />
                {view === "risk" ? "Risk" : "Issue"}
              </Button>
            </div>
          </div>
        </div>

        {risksQuery.isLoading ? (
          <LoaderComponent />
        ) : visibleItems.length ? (
          <div className="divide-y divide-border/20">
            {visibleItems.map((item) => {
              const Icon = item.kind === "risk" ? TriangleAlert : ShieldAlert;
              const nextStatus =
                item.kind === "risk" ? "Mitigating" : "In progress";
              const itemTeamLabel =
                teams.find((team) => team.id === item.teamId)?.name ??
                (item.teamId ? "Scoped team" : "All teams");
              const isItemClosed = item.state === "closed";
              const canEditItem = canEditRiskItem(item);

              return (
                <div key={item.id} className="px-3 py-2.5 md:px-4">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => openDetails(item)}
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-background/80"
                    >
                      <Icon className="size-3.5 text-primary" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openDetails(item)}
                      className="min-w-0 flex-1 space-y-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1.5 text-[10px]",
                            RISK_BADGE_CLASSES[item.severity],
                          )}
                        >
                          {item.severity}
                        </Badge>
                        <div className="line-clamp-1 text-[12px] font-medium md:text-[13px]">
                          {item.title}
                        </div>
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-medium"
                        >
                          {item.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium capitalize",
                            stateBadgeClass(item.state),
                          )}
                        >
                          {item.state || "open"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-1 text-[11px] leading-5">
                        {item.description}
                      </p>
                      <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-[11px]">
                        <span className="truncate">{item.owner}</span>
                        <span className="opacity-60">•</span>
                        <span className="truncate">{itemTeamLabel}</span>
                        {item.pipelineId ? (
                          <>
                            <span className="opacity-60">•</span>
                            <span className="truncate">
                              {formatPipelineLabel(item.pipelineId)}
                            </span>
                          </>
                        ) : null}
                        <span className="opacity-60">•</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {item.commentCount || 0}
                        </span>
                      </div>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetails(item)}>
                          Open details
                        </DropdownMenuItem>
                        {canEditItem ? (
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            Edit
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          disabled={isItemClosed || !canEditItem}
                          onClick={() => handleQuickStatus(item, nextStatus)}
                        >
                          Mark {nextStatus}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isItemClosed || !canEditItem}
                          onClick={() => handleResolve(item)}
                        >
                          <Check className="size-3.5" />
                          Mark resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            isItemClosed ||
                            item.state !== "resolved" ||
                            !canEditItem
                          }
                          onClick={() => handleClose(item)}
                        >
                          <CircleOff className="size-3.5" />
                          Close
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isItemClosed || !canEditItem}
                          onClick={() => handleDelete(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground px-4 py-4 text-[12px] leading-5">
            No {view === "risk" ? "risks" : "issues"} match the current search
            and filters.
          </div>
        )}

        {riskPagination ? (
          <div className="flex items-center justify-between gap-2 border-t border-border/20 px-3 py-2.5 md:px-4">
            <div className="text-muted-foreground text-[11px]">
              Page {riskPagination.page} of{" "}
              {Math.max(1, riskPagination.totalPages)} ({riskPagination.total}{" "}
              total)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!riskPagination.hasPrevPage || risksQuery.isFetching}
                onClick={() =>
                  setRiskPage((current) => Math.max(1, current - 1))
                }
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!riskPagination.hasNextPage || risksQuery.isFetching}
                onClick={() =>
                  setRiskPage((current) =>
                    riskPagination.hasNextPage ? current + 1 : current,
                  )
                }
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);

          if (!open) {
            resetCommentDraft();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? `Create ${draft.kind === "risk" ? "risk" : "issue"}`
                : dialogMode === "edit"
                  ? `Edit ${draft.kind === "risk" ? "risk" : "issue"}`
                  : `${draft.kind === "risk" ? "Risk" : "Issue"} details`}
            </DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? "View details and comments. Editing is restricted to the uploader while open."
                : "Update details, resolve, then close to lock actions and comments."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="risk-title">Title</Label>
                <Input
                  id="risk-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div className="grid gap-2">
                <Label>Kind</Label>
                <Select
                  value={draft.kind}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      kind: value as ProjectRiskKind,
                      status: STATUS_OPTIONS[value as ProjectRiskKind][0],
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="risk-description">Description</Label>
              <Textarea
                id="risk-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-24"
                disabled={isReadOnly}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select
                  value={draft.severity}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      severity: value as ProjectRiskSeverity,
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, status: value }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS[draft.kind].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>State</Label>
                <Select
                  value={draft.state}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      state: value as ProjectRiskState,
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    {draft.state === "closed" ? (
                      <SelectItem value="closed">Closed</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label>Owner</Label>
                <Select
                  value={draft.ownerUserId || "unassigned"}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      ownerUserId: value === "unassigned" ? undefined : value,
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Team</Label>
                <Select
                  value={draft.teamId ?? "all"}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      teamId: value === "all" ? undefined : value,
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.id ? (
              <section className="rounded-lg border border-border/35 bg-background/40">
                <div className="flex items-center justify-between border-b border-border/25 px-3 py-2">
                  <div className="text-[12px] font-medium">Comments</div>
                  <Badge variant="outline" className="text-[11px] font-medium">
                    {detailComments.length}
                  </Badge>
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto px-3 py-2">
                  {riskDetailQuery.isFetching && !detailComments.length ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
                      <LoaderComponent />
                    </div>
                  ) : detailComments.length ? (
                    detailComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-md border border-border/25 bg-background/70 px-2.5 py-2"
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px]">
                          <Badge variant="outline" className="font-medium">
                            {comment.authorInitials}
                          </Badge>
                          <span className="font-medium">
                            {comment.authorName ||
                              ownerLabelMap.get(comment.authorUserId) ||
                              "Project member"}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[12px] leading-5">
                          {comment.message}
                        </p>
                        {Array.isArray(comment.mentions) &&
                        comment.mentions.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {comment.mentions.map((mention) => (
                              <Badge
                                key={`${comment.id}-${mention.kind}-${mention.id}`}
                                variant="outline"
                                className="h-5 rounded-md px-1.5 text-[10px]"
                              >
                                @{formatMentionLabel(mention.label, mention.id)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-[12px]">
                      No comments yet.
                    </div>
                  )}
                </div>

                <div className="border-t border-border/25 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <MentionsInput
                      value={commentDraftMarkup}
                      onChange={handleCommentInputChange}
                      placeholder={
                        isClosed
                          ? "Comments are locked on closed records"
                          : "Write a comment (use @ to mention users or teams)"
                      }
                      disabled={isClosed || createCommentMutation.isPending}
                      allowSuggestionsAboveCursor
                      className="flex-1"
                      style={{
                        control: {
                          width: "100%",
                          minHeight: 34,
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border) / 0.45)",
                          background: "hsl(var(--background))",
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                          lineHeight: 1.4,
                        },
                        highlighter: {
                          padding: "8px 10px",
                          overflow: "hidden",
                          color: "transparent",
                        },
                        input: {
                          margin: 0,
                          padding: "8px 10px",
                          outline: 0,
                          border: 0,
                          backgroundColor: "transparent",
                          color: "hsl(var(--foreground))",
                        },
                        suggestions: {
                          list: {
                            backgroundColor: mentionListBg,
                            color: mentionListText,
                            border: "1px solid hsl(var(--border) / 0.45)",
                            boxShadow: "0 8px 24px rgba(0,0,0,.22)",
                            fontSize: 12,
                            overflow: "hidden",
                            zIndex: 40,
                          },
                          item: {
                            display: "block",
                            padding: "6px 8px",
                            backgroundColor: mentionListBg,
                            color: mentionListText,
                            borderBottom: "1px solid hsl(var(--border) / 0.2)",
                            "&focused": {
                              backgroundColor: mentionFocusedBg,
                              color: mentionFocusedText,
                            },
                          },
                        },
                      }}
                    >
                      <Mention
                        trigger="@"
                        data={mentionSuggestions}
                        markup="@[__display__](__id__)"
                        displayTransform={(_id, display) => `@${display}`}
                        appendSpaceOnAdd
                      />
                    </MentionsInput>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendComment}
                      disabled={
                        isClosed ||
                        createCommentMutation.isPending ||
                        !commentDraftPlain.trim()
                      }
                    >
                      <Send className="size-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            {dialogMode !== "view" ? (
              <Button type="button" onClick={handleSave} disabled={isReadOnly}>
                {draft.id ? "Save changes" : `Create ${draft.kind}`}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
