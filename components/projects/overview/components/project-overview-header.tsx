"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Copy,
  FolderKanban,
  MessageSquare,
  MoreHorizontal,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
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

  return parsed.getTime() < now ? `Overdue since ${formatted}` : `Next due ${formatted}`;
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
}: ProjectOverviewHeaderProps) {
  const router = useRouter();
  const updateProject = useProjectStore((state) => state.updateProject);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const { useWorkspacePeople } = useWorkspace();
  const { useWorkspaceTeams } = useWorkspaceTeam();
  const { useInviteWorkspaceProjectCollaborators } = useWorkspaceProject();

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
  const [shareOpen, setShareOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
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
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];

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

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/projects/${project.id}`;
    }

    return `${window.location.origin}/projects/${project.id}`;
  }, [project.id]);

  const workspaceMembers = workspacePeopleData?.data?.members ?? [];
  const workspaceTeams = workspaceTeamsData?.data?.teams ?? [];
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
                  <DropdownMenuItem onClick={() => setShareOpen(true)}>
                    <Share2 className="size-4" />
                    Share
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
                    <AvatarImage src={member.avatarUrl || ""} alt={member.name} />
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
