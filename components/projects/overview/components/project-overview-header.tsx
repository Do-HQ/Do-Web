"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ChartColumnIncreasing,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  FolderKanban,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceReports from "@/hooks/use-workspace-reports";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import { AI_DEFAULT_ESTIMATED_COSTS } from "@/lib/helpers/ai-token-cost";
import { ProjectNotificationsPopover } from "@/components/projects/project-notifications-popover";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";

import {
  ProjectMember,
  ProjectOverviewRecord,
  ProjectPipelineSummary,
} from "../types";

type ProjectOverviewHeaderProps = {
  project: ProjectOverviewRecord;
  selectedPipeline: ProjectPipelineSummary | null;
  visibleMembers: ProjectMember[];
  scopedTeamCount: number;
  taskTotal: number;
  dueWindow: string;
  onArchiveProject: () => void | Promise<void>;
  archivePending?: boolean;
  canInviteCollaborators?: boolean;
  canArchiveProject?: boolean;
  canGenerateReports?: boolean;
};

type ProjectMemberWithProfile = ProjectMember & {
  email?: string;
};

const STATUS_STYLES: Record<ProjectOverviewRecord["status"], string> = {
  "on-track":
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "at-risk": "border-primary/20 bg-primary/10 text-primary",
  paused: "border-border bg-muted/40 text-muted-foreground",
};

const ACCESS_OPTIONS = [
  { value: "edit", label: "Can edit" },
  { value: "comment", label: "Can comment" },
  { value: "view", label: "View only" },
] as const;

const INVITE_TARGET_OPTIONS = [
  { value: "team", label: "Workspace team" },
  { value: "member", label: "Workspace member" },
  { value: "email", label: "Email invite" },
] as const;

function getUserName(
  user:
    | {
        firstName?: string;
        firstname?: string;
        lastName?: string;
        lastnale?: string;
        email?: string;
      }
    | undefined,
) {
  if (!user) {
    return "Unknown member";
  }

  const firstName = String(user.firstName || user.firstname || "").trim();
  const lastName = String(user.lastName || user.lastnale || "").trim();

  return (
    `${firstName} ${lastName}`.trim() || String(user.email || "Unknown member")
  );
}

function formatHeaderDueDateLabel(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = Date.now();
  const formatted = parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return parsed.getTime() < now
    ? `Overdue since ${formatted}`
    : `Next due ${formatted}`;
}

function toDateTimeLocalValue(value: Date) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ProjectOverviewHeader({
  project,
  selectedPipeline,
  visibleMembers,
  scopedTeamCount,
  taskTotal,
  dueWindow,
  onArchiveProject,
  archivePending = false,
  canInviteCollaborators = true,
  canArchiveProject = true,
  canGenerateReports = false,
}: ProjectOverviewHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateProject = useProjectStore((state) => state.updateProject);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const { useWorkspacePeople } = useWorkspace();
  const { useWorkspaceTeams } = useWorkspaceTeam();
  const {
    useInviteWorkspaceProjectCollaborators,
    useRemoveWorkspaceProjectCollaborators,
  } = useWorkspaceProject();
  const workspaceReportsHook = useWorkspaceReports();
  const workspaceBilling = useWorkspaceBilling();
  const runProjectReportNowMutation =
    workspaceReportsHook.useRunWorkspaceProjectReportNow();
  const billingSummaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    workspaceId || "",
    undefined,
    {
      enabled: !!workspaceId,
    },
  );
  const estimatedReportTokenCost = AI_DEFAULT_ESTIMATED_COSTS.reportGeneration;
  const workspaceTokenBalance = Number(
    billingSummaryQuery.data?.data?.workspace?.tokens?.balance || 0,
  );
  const hasInsufficientReportTokens =
    billingSummaryQuery.isSuccess &&
    workspaceTokenBalance < estimatedReportTokenCost;

  const displayedMembers = visibleMembers.slice(0, 5);
  const extraMembers = Math.max(
    visibleMembers.length - displayedMembers.length,
    0,
  );
  const topContributor = useMemo(() => {
    if (!visibleMembers.length) {
      return null;
    }

    return [...visibleMembers].sort(
      (left, right) => Number(right.score || 0) - Number(left.score || 0),
    )[0];
  }, [visibleMembers]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageTeamsOpen, setManageTeamsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [manageAddTeamId, setManageAddTeamId] = useState("");
  const [expandedTeamIds, setExpandedTeamIds] = useState<string[]>([]);
  const [pendingTeamRemoval, setPendingTeamRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteTargetType, setInviteTargetType] =
    useState<(typeof INVITE_TARGET_OPTIONS)[number]["value"]>("team");
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [inviteMemberId, setInviteMemberId] = useState("");
  const [inviteWorkflowId, setInviteWorkflowId] = useState("__project__");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] =
    useState<(typeof ACCESS_OPTIONS)[number]["value"]>("edit");
  const [inviteMessage, setInviteMessage] = useState(
    "Join this project and collaborate with the current delivery squad.",
  );
  const [shareAccess, setShareAccess] =
    useState<(typeof ACCESS_OPTIONS)[number]["value"]>("view");
  const [generateReportOpen, setGenerateReportOpen] = useState(false);
  const [
    generateReportRecipientPickerOpen,
    setGenerateReportRecipientPickerOpen,
  ] = useState(false);
  const [generateReportRecipientUserIds, setGenerateReportRecipientUserIds] =
    useState<string[]>([]);
  const [generateReportSendEmail, setGenerateReportSendEmail] = useState(true);
  const [generateReportPeriodStart, setGenerateReportPeriodStart] = useState(
    () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return toDateTimeLocalValue(start);
    },
  );
  const [generateReportPeriodEnd, setGenerateReportPeriodEnd] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );

  const nearestDueLabel = useMemo(() => {
    const dueCandidates: string[] = [];

    project.milestones.forEach((milestone) => {
      if (
        selectedPipeline &&
        milestone.pipelineId &&
        milestone.pipelineId !== selectedPipeline.id
      ) {
        return;
      }

      if (milestone.dueDate) {
        dueCandidates.push(milestone.dueDate);
      }
    });

    project.workflows
      .filter((workflow) => !workflow.archived)
      .forEach((workflow) => {
        workflow.tasks.forEach((task) => {
          if (
            selectedPipeline &&
            task.pipelineId &&
            task.pipelineId !== selectedPipeline.id
          ) {
            return;
          }

          if (task.status !== "done" && task.dueDate) {
            dueCandidates.push(task.dueDate);
          }

          (task.subtasks ?? []).forEach((subtask) => {
            if (
              selectedPipeline &&
              task.pipelineId &&
              task.pipelineId !== selectedPipeline.id
            ) {
              return;
            }

            if (subtask.status !== "done" && subtask.dueDate) {
              dueCandidates.push(subtask.dueDate);
            }
          });
        });
      });

    const nearest = dueCandidates
      .filter((value) => !Number.isNaN(new Date(value).getTime()))
      .sort(
        (left, right) => new Date(left).getTime() - new Date(right).getTime(),
      )[0];

    return formatHeaderDueDateLabel(nearest);
  }, [project.milestones, project.workflows, selectedPipeline]);

  const dueBadgeLabel =
    dueWindow && dueWindow !== "No date range"
      ? dueWindow
      : nearestDueLabel || "No active due dates";

  const { data: workspacePeopleData } = useWorkspacePeople(workspaceId ?? "", {
    page: 1,
    limit: 100,
    search: "",
  });
  const { data: workspaceTeamsData } = useWorkspaceTeams(workspaceId ?? "", {
    page: 1,
    limit: 100,
    search: "",
    status: "active",
  });
  const inviteCollaborators = useInviteWorkspaceProjectCollaborators({
    onSuccess: (response) => {
      const nextRecord = response?.data?.project?.record;

      if (nextRecord?.id) {
        updateProject(project.id, () => nextRecord);
      }
    },
  });
  const removeCollaborators = useRemoveWorkspaceProjectCollaborators({
    onSuccess: (response) => {
      const nextRecord = response?.data?.project?.record;

      if (nextRecord?.id) {
        updateProject(project.id, () => nextRecord);
      }
    },
  });

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/projects/${project.id}`;
    }

    return `${window.location.origin}/projects/${project.id}`;
  }, [project.id]);

  const workspaceMembers = workspacePeopleData?.data?.members ?? [];
  const workspaceTeams = workspaceTeamsData?.data?.teams ?? [];
  const reportRecipientOptions = useMemo(() => {
    return workspaceMembers
      .map((entry) => {
        const user = entry?.userId;
        const id = String(user?._id || "").trim();
        const email = String(user?.email || "")
          .trim()
          .toLowerCase();
        const firstName = String(user?.firstName || "").trim();
        const lastName = String(user?.lastName || "").trim();
        const label = `${firstName} ${lastName}`.trim() || email;

        if (!id || !email) {
          return null;
        }

        return {
          id,
          email,
          label,
        };
      })
      .filter((entry): entry is { id: string; email: string; label: string } =>
        Boolean(entry),
      );
  }, [workspaceMembers]);
  const reportRecipientOptionMap = useMemo(
    () => new Map(reportRecipientOptions.map((entry) => [entry.id, entry])),
    [reportRecipientOptions],
  );
  const selectedReportRecipients = useMemo(
    () =>
      generateReportRecipientUserIds
        .map((id) => reportRecipientOptionMap.get(id))
        .filter(
          (entry): entry is { id: string; email: string; label: string } =>
            Boolean(entry),
        ),
    [generateReportRecipientUserIds, reportRecipientOptionMap],
  );
  const assignedTeamIds = useMemo(
    () => new Set(project.teams.map((team) => String(team.id))),
    [project.teams],
  );
  const availableTeamsForProject = workspaceTeams.filter(
    (team) => !assignedTeamIds.has(String(team._id)),
  );
  const workspaceMemberProfileById = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        initials: string;
        avatarUrl?: string;
        email?: string;
      }
    >();

    workspaceMembers.forEach((workspaceMember) => {
      const user = workspaceMember?.userId;
      const userId = String(user?._id || "").trim();
      if (!userId) {
        return;
      }

      const firstName = String(user?.firstName || "").trim();
      const lastName = String(user?.lastName || "").trim();
      const email = String(user?.email || "").trim();
      const name =
        `${firstName} ${lastName}`.trim() || email || "Project member";
      const initials =
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || "U";
      const avatarUrl =
        String(user?.profilePhoto?.url || "").trim() || undefined;

      map.set(userId, {
        name,
        initials,
        avatarUrl,
        email: email || undefined,
      });
    });

    return map;
  }, [workspaceMembers]);

  const membersById = useMemo(() => {
    const map = new Map<string, ProjectMemberWithProfile>();

    project.members.forEach((member) => {
      const memberId = String(member.id || "").trim();
      if (!memberId) {
        return;
      }

      const profile = workspaceMemberProfileById.get(memberId);

      map.set(memberId, {
        ...member,
        name: profile?.name || member.name,
        initials: profile?.initials || member.initials,
        avatarUrl: profile?.avatarUrl || member.avatarUrl,
        email: profile?.email,
      });
    });

    visibleMembers.forEach((member) => {
      const memberId = String(member.id || "").trim();
      if (!memberId) {
        return;
      }

      const profile = workspaceMemberProfileById.get(memberId);
      const existing = map.get(memberId);

      map.set(memberId, {
        ...(existing || member),
        ...member,
        name:
          member.name || existing?.name || profile?.name || "Project member",
        initials:
          member.initials || existing?.initials || profile?.initials || "U",
        avatarUrl:
          member.avatarUrl || existing?.avatarUrl || profile?.avatarUrl,
        email: existing?.email || profile?.email,
      });
    });

    return map;
  }, [project.members, visibleMembers, workspaceMemberProfileById]);
  const availableWorkflows = project.workflows.filter(
    (workflow) => !workflow.archived,
  );
  const selectedWorkflowId =
    inviteWorkflowId && inviteWorkflowId !== "__project__"
      ? inviteWorkflowId
      : undefined;
  const canSendInvite =
    !!workspaceId &&
    ((inviteTargetType === "team" && !!inviteTeamId) ||
      (inviteTargetType === "member" && !!inviteMemberId) ||
      (inviteTargetType === "email" && !!inviteEmail.trim()));

  const handleInviteTeam = async () => {
    if (!canInviteCollaborators) {
      toast("Only workspace owners/admins can invite collaborators.");
      return;
    }

    if (!workspaceId || !canSendInvite) {
      return;
    }

    const payload =
      inviteTargetType === "team"
        ? {
            workflowId: selectedWorkflowId,
            access: inviteAccess,
            teamIds: [inviteTeamId],
            message: inviteMessage,
          }
        : inviteTargetType === "member"
          ? {
              workflowId: selectedWorkflowId,
              access: inviteAccess,
              memberIds: [inviteMemberId],
              message: inviteMessage,
            }
          : {
              workflowId: selectedWorkflowId,
              access: inviteAccess,
              emails: inviteEmail
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              message: inviteMessage,
            };

    await toast.promise(
      inviteCollaborators.mutateAsync({
        workspaceId,
        projectId: project.id,
        payload,
      }),
      {
        loading:
          inviteTargetType === "email"
            ? "Sending workspace invite..."
            : "Adding collaborator to the project...",
        success: (response) =>
          response?.data?.message || "Project invite processed successfully",
        error: "We could not complete that project invite.",
      },
    );

    setInviteOpen(false);
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Project link copied.");
    } catch {
      toast("Could not copy the project link in this browser.");
    }
  };

  const handleArchiveProject = async () => {
    await onArchiveProject();
    setArchiveOpen(false);
  };

  const resetGenerateReportForm = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    setGenerateReportPeriodStart(toDateTimeLocalValue(start));
    setGenerateReportPeriodEnd(toDateTimeLocalValue(end));
    setGenerateReportRecipientUserIds([]);
    setGenerateReportRecipientPickerOpen(false);
    setGenerateReportSendEmail(true);
  };

  const toggleGenerateReportRecipient = (userId: string) => {
    setGenerateReportRecipientUserIds((current) =>
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId],
    );
  };

  const handleOpenGenerateReportDialog = () => {
    resetGenerateReportForm();
    setGenerateReportOpen(true);
  };

  const handleGenerateProjectReportNow = async () => {
    if (!workspaceId || !project.id || !canGenerateReports) {
      return;
    }

    if (!generateReportPeriodStart || !generateReportPeriodEnd) {
      toast("Select both period start and period end.");
      return;
    }

    const periodStart = new Date(generateReportPeriodStart);
    const periodEnd = new Date(generateReportPeriodEnd);

    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime())
    ) {
      toast("Please use valid dates for the report period.");
      return;
    }

    if (periodEnd.getTime() <= periodStart.getTime()) {
      toast("Period end must be after period start.");
      return;
    }

    if (hasInsufficientReportTokens) {
      toast.error("Not enough AI tokens", {
        description: `This report needs about ${estimatedReportTokenCost.toLocaleString()} tokens, but your workspace has ${workspaceTokenBalance.toLocaleString()} left.`,
        action: {
          label: "Open billing",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.assign(ROUTES.SETTINGS_BILLING);
            }
          },
        },
      });
      return;
    }

    const request = runProjectReportNowMutation.mutateAsync({
      workspaceId,
      projectId: project.id,
      payload: {
        reportType: "PROJECT_HEALTH",
        deliveryChannels: generateReportSendEmail
          ? ["DASHBOARD", "EMAIL"]
          : ["DASHBOARD"],
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        recipientUserIds: generateReportRecipientUserIds,
        recipients: selectedReportRecipients.map((entry) => entry.email),
      },
    });

    void toast.promise(request, {
      loading: "Generating project report...",
      success: (payload) => {
        return payload?.data?.message || "Project report generated.";
      },
      error: "We could not generate a project report right now.",
    });

    let response = null;

    try {
      response = await request;
    } catch {
      return;
    }

    const reportId = String(response?.data?.report?.id || "").trim();

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-reports", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-report-detail", workspaceId, reportId],
      }),
    ]);

    setGenerateReportOpen(false);

    if (reportId) {
      router.push(`/reports/${encodeURIComponent(reportId)}`);
    }
  };

  const toggleExpandedTeam = (teamId: string) => {
    setExpandedTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((value) => value !== teamId)
        : [...current, teamId],
    );
  };

  const handleAddTeamToProject = async () => {
    if (!canInviteCollaborators) {
      toast("Only workspace owners/admins can manage project teams.");
      return;
    }

    if (!workspaceId || !manageAddTeamId) {
      return;
    }

    await toast.promise(
      inviteCollaborators.mutateAsync({
        workspaceId,
        projectId: project.id,
        payload: {
          teamIds: [manageAddTeamId],
          access: "edit",
          message: "Added from project team management.",
        },
      }),
      {
        loading: "Adding team...",
        success: (response) =>
          response?.data?.message || "Team added to project successfully",
        error: "Could not add this team to the project.",
      },
    );

    setManageAddTeamId("");
  };

  const handleRemoveTeamFromProject = async (teamId: string) => {
    if (!canInviteCollaborators) {
      toast("Only workspace owners/admins can manage project teams.");
      return;
    }

    if (!workspaceId || !teamId) {
      return;
    }

    await toast.promise(
      removeCollaborators.mutateAsync({
        workspaceId,
        projectId: project.id,
        payload: {
          teamIds: [teamId],
        },
      }),
      {
        loading: "Removing team...",
        success: (response) =>
          response?.data?.message || "Team removed from project",
        error: "Could not remove this team from the project.",
      },
    );

    setPendingTeamRemoval(null);
  };

  const handleOpenProjectChat = () => {
    const next = new URLSearchParams({
      project: project.id,
    });
    router.push(`${ROUTES.SPACES}?${next.toString()}`);
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border/35 bg-card/80 shadow-xs backdrop-blur-sm">
        <div className="flex flex-col gap-3 px-4 py-4 md:px-5 md:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-muted/60 text-muted-foreground inline-flex size-7 items-center justify-center rounded-md border border-border/35">
                  <FolderKanban className="size-4" />
                </span>
                <h1 className="truncate text-[19px] font-semibold tracking-tight md:text-[21px]">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className={cn("capitalize", STATUS_STYLES[project.status])}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-current",
                      project.status !== "paused" && "animate-pulse",
                    )}
                  />
                  {project.status.replace("-", " ")}
                </Badge>
                {selectedPipeline ? (
                  <Badge
                    variant="outline"
                    className="border-primary/20 bg-primary/8 text-[11px] text-primary"
                  >
                    {selectedPipeline.name}
                  </Badge>
                ) : null}
              </div>

              <p className="text-muted-foreground max-w-4xl text-[13px] leading-5 md:text-[14px]">
                {project.summary}
              </p>
            </div>

            <div className="bg-background/70 border-border/40 inline-flex flex-wrap items-center gap-1 rounded-lg border p-1 backdrop-blur-sm lg:justify-end">
              <ProjectNotificationsPopover projectId={project.id} compact />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleOpenProjectChat}
                title="Open project chat"
                className="size-8 rounded-md"
              >
                <MessageSquare className="size-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-md"
                    title="Project actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!canInviteCollaborators}
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="size-4" />
                    Invite
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canInviteCollaborators}
                    onClick={() => setManageTeamsOpen(true)}
                  >
                    <Users className="size-4" />
                    Manage teams
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShareOpen(true)}>
                    <Share2 className="size-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      !canGenerateReports ||
                      runProjectReportNowMutation.isPending
                    }
                    onClick={() => handleOpenGenerateReportDialog()}
                  >
                    <ChartColumnIncreasing className="size-4" />
                    Generate report
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canArchiveProject}
                    onClick={() => setArchiveOpen(true)}
                  >
                    <Archive className="size-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/35 pt-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <Badge variant="outline" className="gap-1.5 font-medium">
                <Users className="size-3.5" />
                {scopedTeamCount} team{scopedTeamCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline" className="font-medium">
                {taskTotal} tasks
              </Badge>
              <Badge variant="outline" className="gap-1.5 font-medium">
                <CalendarDays className="size-3.5" />
                {dueBadgeLabel}
              </Badge>
            </div>

            <div className="flex items-center gap-2.5">
              <AvatarGroup>
                {displayedMembers.map((member) => (
                  <Avatar
                    key={member.id}
                    size="sm"
                    userCard={{
                      name: member.name,
                      role: member.role,
                      team:
                        member.teamIds.length > 1
                          ? `${member.teamIds.length} teams`
                          : member.teamIds.length === 1
                            ? "1 team"
                            : "No team",
                      status: member.active ? "Active" : "Offline",
                      details: [
                        {
                          label: "Score",
                          value: `${Number(member.score || 0)} pts`,
                        },
                      ],
                    }}
                  >
                    <AvatarImage
                      src={member.avatarUrl || ""}
                      alt={member.name}
                    />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                ))}
                {extraMembers ? (
                  <AvatarGroupCount className="text-[11px]">
                    +{extraMembers}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
              <span className="text-muted-foreground text-[12px]">
                {visibleMembers.length} active contributor
                {visibleMembers.length === 1 ? "" : "s"}
              </span>
              {topContributor ? (
                <Badge
                  variant="outline"
                  className="text-[10.5px] font-medium text-primary border-primary/25 bg-primary/8"
                >
                  Top: {topContributor.name.split(" ")[0]} •{" "}
                  {Number(topContributor.score || 0)} pts
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite collaborators</DialogTitle>
            <DialogDescription>
              Add a workspace team or member directly, or send a workspace
              invite email with project or workflow access attached.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Invite type</Label>
              <Select
                value={inviteTargetType}
                onValueChange={(value) =>
                  setInviteTargetType(
                    value as (typeof INVITE_TARGET_OPTIONS)[number]["value"],
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_TARGET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select
                value={inviteWorkflowId}
                onValueChange={setInviteWorkflowId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__project__">Whole project</SelectItem>
                  {availableWorkflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteTargetType === "team" ? (
              <div className="grid gap-2">
                <Label>Workspace team</Label>
                <Select value={inviteTeamId} onValueChange={setInviteTeamId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceTeams.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {inviteTargetType === "member" ? (
              <div className="grid gap-2">
                <Label>Workspace member</Label>
                <Select
                  value={inviteMemberId}
                  onValueChange={setInviteMemberId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceMembers
                      .filter((member) => member?.userId?._id)
                      .map((member) => (
                        <SelectItem
                          key={member._id}
                          value={String(member.userId._id)}
                        >
                          {getUserName(member.userId)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {inviteTargetType === "email" ? (
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@example.com"
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Access</Label>
              <Select
                value={inviteAccess}
                onValueChange={(value) =>
                  setInviteAccess(
                    value as (typeof ACCESS_OPTIONS)[number]["value"],
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInviteTeam}
              disabled={
                !canInviteCollaborators ||
                !canSendInvite ||
                inviteCollaborators.isPending
              }
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageTeamsOpen} onOpenChange={setManageTeamsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage project teams</DialogTitle>
            <DialogDescription>
              Add or remove teams assigned to this project. Removing a team
              revokes its project chat access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
              <div className="mb-2 text-[12px] font-medium">
                Add workspace team
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={manageAddTeamId}
                  onValueChange={setManageAddTeamId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a workspace team" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeamsForProject.length ? (
                      availableTeamsForProject.map((team) => (
                        <SelectItem key={team._id} value={String(team._id)}>
                          {team.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none__" disabled>
                        All active workspace teams are already assigned
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  className="sm:w-auto"
                  disabled={
                    !canInviteCollaborators ||
                    !manageAddTeamId ||
                    inviteCollaborators.isPending
                  }
                  onClick={handleAddTeamToProject}
                >
                  <Plus className="size-3.5" />
                  Add team
                </Button>
              </div>
            </div>

            <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
              {project.teams.length ? (
                project.teams.map((team) => {
                  const teamId = String(team.id || "");
                  const teamMembers = (
                    Array.isArray(team.memberIds) ? team.memberIds : []
                  )
                    .map((memberId) => membersById.get(String(memberId)))
                    .filter(
                      (member): member is ProjectMemberWithProfile =>
                        typeof member !== "undefined" && member !== null,
                    );
                  const isExpanded = expandedTeamIds.includes(teamId);

                  return (
                    <div
                      key={teamId}
                      className="rounded-lg border border-border/35 bg-background/60 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">
                            {team.name}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            {teamMembers.length} member
                            {teamMembers.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandedTeam(teamId)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                            Members
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={
                              !canInviteCollaborators ||
                              removeCollaborators.isPending
                            }
                            onClick={() =>
                              setPendingTeamRemoval({
                                id: teamId,
                                name: team.name,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      {isExpanded ? (
                        <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
                          {teamMembers.length ? (
                            teamMembers.map((member) => (
                              <div
                                key={member.id}
                                className="text-muted-foreground flex items-center gap-2 text-[12px]"
                              >
                                <Avatar
                                  size="sm"
                                  userCard={{
                                    name: member.name,
                                    email: member.email,
                                    role: member.role,
                                    team: team.name,
                                    status: member.active
                                      ? "Active"
                                      : "Offline",
                                    details: [
                                      {
                                        label: "Score",
                                        value: `${Number(member.score || 0)} pts`,
                                      },
                                    ],
                                  }}
                                >
                                  <AvatarImage
                                    src={member.avatarUrl || ""}
                                    alt={member.name}
                                  />
                                  <AvatarFallback>
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{member.name}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-[11px]">
                              No visible members on this team in the project
                              record yet.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground rounded-lg border border-border/30 bg-muted/20 px-3 py-3 text-[12px]">
                  No teams are currently assigned to this project.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setManageTeamsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingTeamRemoval)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTeamRemoval(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove team from project</DialogTitle>
            <DialogDescription>
              {pendingTeamRemoval
                ? `Remove "${pendingTeamRemoval.name}" from this project? Team members will immediately lose project/task chat access.`
                : "Remove this team from the project?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingTeamRemoval(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !pendingTeamRemoval ||
                !canInviteCollaborators ||
                removeCollaborators.isPending
              }
              onClick={() => {
                if (!pendingTeamRemoval) {
                  return;
                }
                void handleRemoveTeamFromProject(pendingTeamRemoval.id);
              }}
            >
              Remove team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share project</DialogTitle>
            <DialogDescription>
              Share a direct project link and choose the default access level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/20 bg-muted/20 px-3 py-2 text-[12px] leading-5">
              {shareUrl}
            </div>
            <div className="grid gap-2">
              <Label>Default access</Label>
              <Select
                value={shareAccess}
                onValueChange={(value) =>
                  setShareAccess(
                    value as (typeof ACCESS_OPTIONS)[number]["value"],
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShareOpen(false)}
            >
              Close
            </Button>
            <Button type="button" onClick={handleCopyShareLink}>
              <Copy />
              Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateReportOpen} onOpenChange={setGenerateReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate project report</DialogTitle>
            <DialogDescription>
              Choose the report period and who should receive this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="report-period-start">Period start</Label>
                <Input
                  id="report-period-start"
                  type="datetime-local"
                  value={generateReportPeriodStart}
                  onChange={(event) =>
                    setGenerateReportPeriodStart(event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="report-period-end">Period end</Label>
                <Input
                  id="report-period-end"
                  type="datetime-local"
                  value={generateReportPeriodEnd}
                  onChange={(event) =>
                    setGenerateReportPeriodEnd(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Recipients</Label>
              <Popover
                open={generateReportRecipientPickerOpen}
                onOpenChange={setGenerateReportRecipientPickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="h-auto min-h-10 w-full justify-between px-3 py-2"
                  >
                    <span
                      className={cn(
                        "truncate text-left text-sm",
                        selectedReportRecipients.length
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {selectedReportRecipients.length
                        ? `${selectedReportRecipients.length} member${selectedReportRecipients.length === 1 ? "" : "s"} selected`
                        : "Select members to notify about this report"}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandEmpty>No members found.</CommandEmpty>
                    <CommandGroup className="max-h-56 overflow-auto">
                      {reportRecipientOptions.map((option) => {
                        const checked = generateReportRecipientUserIds.includes(
                          option.id,
                        );

                        return (
                          <CommandItem
                            key={option.id}
                            onSelect={() =>
                              toggleGenerateReportRecipient(option.id)
                            }
                            className="gap-2"
                          >
                            <Check
                              className={cn(
                                "size-4",
                                checked ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm">{option.label}</p>
                              <p className="text-muted-foreground truncate text-xs">
                                {option.email}
                              </p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-md border border-border/60 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="report-delivery-email"
                  checked={generateReportSendEmail}
                  onCheckedChange={(checked) =>
                    setGenerateReportSendEmail(Boolean(checked))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="report-delivery-email">Send email copy</Label>
                  <p className="text-muted-foreground text-xs">
                    Recipients always get in-app notifications. Enable this to
                    also send the report by email.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground">
                Estimated AI usage:{" "}
                <span className="text-foreground font-medium">
                  ~{estimatedReportTokenCost.toLocaleString()} tokens
                </span>
                {billingSummaryQuery.isSuccess ? (
                  <>
                    {" "}
                    · Workspace balance{" "}
                    <span className="text-foreground font-medium">
                      {workspaceTokenBalance.toLocaleString()}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setGenerateReportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleGenerateProjectReportNow()}
              disabled={
                runProjectReportNowMutation.isPending || hasInsufficientReportTokens
              }
            >
              <ChartColumnIncreasing className="size-4" />
              Generate report (~{estimatedReportTokenCost})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive project</DialogTitle>
            <DialogDescription>
              This will pause the project and persist the archived state to the
              backend.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/20 bg-muted/20 px-3 py-3 text-[12px] leading-5">
            {project.name} will remain visible, but its status will move to{" "}
            <span className="font-medium">Paused</span>.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setArchiveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleArchiveProject()}
              disabled={archivePending || !canArchiveProject}
            >
              Archive project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
