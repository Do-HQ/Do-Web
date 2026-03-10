"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  BellRing,
  CalendarPlus,
  CalendarX2,
  ExternalLink,
  History,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceProjectAgentConfig } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { ProjectMember, ProjectOverviewRecord } from "../types";
import LoaderComponent from "@/components/shared/loader";

type ProjectAgentsAutomationTabProps = {
  project: ProjectOverviewRecord;
  members?: ProjectMember[];
};

type MeetingDraft = {
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  memberUserIds: string[];
  teamIds: string[];
};

function clampNumericInput(
  value: string,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatRunTime(value?: string | null) {
  if (!value) {
    return "Never";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Never";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMeetingDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "No date";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRunTypeLabel(value?: string | null) {
  const runType = String(value || "").trim();

  if (runType === "deadline") {
    return "Deadline reminders";
  }

  if (runType === "meeting") {
    return "Meeting reminders";
  }

  return runType || "Automation";
}

function toGoogleDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarLink(
  meeting: {
    title: string;
    description?: string;
    location?: string;
    startAt?: string | null;
    endAt?: string | null;
  },
  projectName: string,
) {
  const start = toGoogleDate(meeting.startAt || "");
  const end = toGoogleDate(meeting.endAt || "");

  if (!start || !end) {
    return "";
  }

  const details =
    `${meeting.description || ""}\n\nProject: ${projectName}`.trim();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    details,
    location: meeting.location || "",
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookCalendarLink(
  meeting: {
    title: string;
    description?: string;
    location?: string;
    startAt?: string | null;
    endAt?: string | null;
  },
  projectName: string,
) {
  const startAt = new Date(meeting.startAt || "");
  const endAt = new Date(meeting.endAt || "");

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return "";
  }

  const start = startAt.toISOString();
  const end = endAt.toISOString();

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: meeting.title,
    body: `${meeting.description || ""}\n\nProject: ${projectName}`.trim(),
    location: meeting.location || "",
    startdt: start,
    enddt: end,
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

const EMPTY_MEETING_DRAFT: MeetingDraft = {
  title: "",
  description: "",
  location: "",
  startAt: "",
  endAt: "",
  memberUserIds: [],
  teamIds: [],
};

export function ProjectAgentsAutomationTab({
  project,
  members = [],
}: ProjectAgentsAutomationTabProps) {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const {
    useWorkspaceProjectAgent,
    useWorkspaceProjectAgentRuns,
    useUpdateWorkspaceProjectAgent,
    useRunWorkspaceProjectAgent,
  } = useWorkspaceProject();

  const activeWorkspaceId = String(workspaceId || "").trim();
  const [draft, setDraft] = useState<WorkspaceProjectAgentConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDraft, setMeetingDraft] =
    useState<MeetingDraft>(EMPTY_MEETING_DRAFT);

  const agentQuery = useWorkspaceProjectAgent(activeWorkspaceId, project.id, {
    enabled: Boolean(activeWorkspaceId) && Boolean(project.id),
  });
  const runsQuery = useWorkspaceProjectAgentRuns(
    activeWorkspaceId,
    project.id,
    {
      page: 1,
      limit: 8,
    },
    {
      enabled: Boolean(activeWorkspaceId) && Boolean(project.id),
    },
  );

  const updateAgentMutation = useUpdateWorkspaceProjectAgent({
    onSuccess: (response) => {
      const next = response.data?.agent;

      if (next) {
        setDraft(next);
        setDirty(false);
      }

      queryClient.invalidateQueries({
        queryKey: ["workspace-project-agent", activeWorkspaceId, project.id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-project-agent-runs",
          activeWorkspaceId,
          project.id,
        ],
      });
    },
  });

  const runAgentMutation = useRunWorkspaceProjectAgent({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-project-agent", activeWorkspaceId, project.id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-project-agent-runs",
          activeWorkspaceId,
          project.id,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-project-notifications",
          activeWorkspaceId,
          project.id,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-project-events", activeWorkspaceId, project.id],
      });
    },
  });

  useEffect(() => {
    const serverAgent = agentQuery.data?.data?.agent;

    if (!serverAgent) {
      return;
    }

    if (dirty) {
      return;
    }

    setDraft(serverAgent);
  }, [agentQuery.data, dirty]);

  const automationStats = useMemo(() => {
    const serverStats = agentQuery.data?.data?.stats;

    if (serverStats) {
      return serverStats;
    }

    return {
      totalTasks: 0,
      totalSubtasks: 0,
      overdueTasks: 0,
      openRisks: 0,
      activeWorkflows: 0,
    };
  }, [agentQuery.data]);

  const runs = runsQuery.data?.data?.runs ?? [];
  const visibleRuns = runs.filter(
    (run) => run.runType === "deadline" || run.runType === "meeting",
  );
  const meetings = (draft?.meetings ?? []).filter(
    (meeting) => !meeting.archived,
  );
  const enabledAutomationCount =
    Number(Boolean(draft?.taskReminder?.enabled)) +
    Number(Boolean(draft?.meetingReminder?.enabled));

  const updateDraft = (
    updater: (
      current: WorkspaceProjectAgentConfig,
    ) => WorkspaceProjectAgentConfig,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      setDirty(true);
      return next;
    });
  };

  const saveAutomationSettings = async () => {
    if (!activeWorkspaceId) {
      toast("Open this project from a workspace first.");
      return;
    }

    if (!draft) {
      toast("Automation settings are still loading.");
      return;
    }

    await toast.promise(
      updateAgentMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        projectId: project.id,
        updates: {
          enabled: draft.enabled,
          timezone: draft.timezone,
          taskReminder: {
            enabled: draft.taskReminder.enabled,
            intervalMinutes: draft.taskReminder.intervalMinutes,
            thresholdHours: draft.taskReminder.thresholdHours,
            includeSubtasks: draft.taskReminder.includeSubtasks,
            includeTeamFallback: draft.taskReminder.includeTeamFallback,
            dedupeWindowMinutes: draft.taskReminder.dedupeWindowMinutes,
            roomId: draft.taskReminder.roomId,
          },
          meetingReminder: {
            enabled: draft.meetingReminder.enabled,
            intervalMinutes: draft.meetingReminder.intervalMinutes,
            reminderMinutes: draft.meetingReminder.reminderMinutes,
            dedupeWindowMinutes: draft.meetingReminder.dedupeWindowMinutes,
            roomId: draft.meetingReminder.roomId,
          },
          meetings: draft.meetings.map((meeting) => ({
            id: meeting.id,
            title: meeting.title,
            description: meeting.description,
            location: meeting.location,
            startAt: meeting.startAt || "",
            endAt: meeting.endAt || "",
            memberUserIds: meeting.memberUserIds,
            teamIds: meeting.teamIds,
            archived: meeting.archived,
            createdByUserId: meeting.createdByUserId,
          })),
        },
      }),
      {
        loading: "Saving automation settings...",
        success: "Automation settings saved.",
        error: "Could not save automation settings.",
      },
    );
  };

  const runAutomationNow = async (runType: "deadline" | "meeting") => {
    if (!activeWorkspaceId) {
      toast("Open this project from a workspace first.");
      return;
    }

    await toast.promise(
      runAgentMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        projectId: project.id,
        runType,
      }),
      {
        loading:
          runType === "deadline"
            ? "Running task deadline reminders..."
            : "Running meeting reminders...",
        success: (response) =>
          response.data?.run?.summary || "Automation run completed.",
        error: "Automation run failed.",
      },
    );
  };

  const toggleMeetingTeam = (teamId: string) => {
    setMeetingDraft((current) => {
      const exists = current.teamIds.includes(teamId);
      return {
        ...current,
        teamIds: exists
          ? current.teamIds.filter((item) => item !== teamId)
          : [...current.teamIds, teamId],
      };
    });
  };

  const toggleMeetingMember = (memberId: string) => {
    setMeetingDraft((current) => {
      const exists = current.memberUserIds.includes(memberId);
      return {
        ...current,
        memberUserIds: exists
          ? current.memberUserIds.filter((item) => item !== memberId)
          : [...current.memberUserIds, memberId],
      };
    });
  };

  const handleCreateMeeting = () => {
    if (!meetingDraft.title.trim()) {
      toast("Meeting title is required.");
      return;
    }

    const startAt = new Date(meetingDraft.startAt);
    const endAt = new Date(meetingDraft.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      toast("Meeting start and end are required.");
      return;
    }

    if (endAt.getTime() <= startAt.getTime()) {
      toast("Meeting end time must be after start time.");
      return;
    }

    updateDraft((current) => ({
      ...current,
      meetings: [
        ...current.meetings,
        {
          id: createLocalId("meeting"),
          title: meetingDraft.title.trim(),
          description: meetingDraft.description.trim(),
          location: meetingDraft.location.trim(),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          memberUserIds: Array.from(new Set(meetingDraft.memberUserIds)),
          teamIds: Array.from(new Set(meetingDraft.teamIds)),
          archived: false,
          createdByUserId: "",
        },
      ],
    }));

    setMeetingDraft(EMPTY_MEETING_DRAFT);
    setMeetingDialogOpen(false);
  };

  const archiveMeeting = (meetingId: string) => {
    updateDraft((current) => ({
      ...current,
      meetings: current.meetings.map((meeting) =>
        meeting.id === meetingId
          ? {
              ...meeting,
              archived: true,
            }
          : meeting,
      ),
    }));
  };

  if (!draft && agentQuery.isLoading) {
    return <LoaderComponent />;
  }

  if (!draft) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/35 bg-card/70 px-3 py-4 text-[12px]">
        Automation settings are unavailable for this project.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-border/35 bg-card/85 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-[14px] md:text-[15px]">
                Automation Hub
              </CardTitle>
              <CardDescription className="text-[12px]">
                Core platform automation for deadline reminders and meeting
                reminders. This is scheduler behavior, not a persona-style
                agent.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.enabled}
                onCheckedChange={(checked) =>
                  updateDraft((current) => ({
                    ...current,
                    enabled: checked,
                  }))
                }
              />
              <Button
                type="button"
                size="sm"
                onClick={saveAutomationSettings}
                disabled={!dirty || updateAgentMutation.isPending}
              >
                <Save className="size-3.5" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 pt-0 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-lg border border-border/20 bg-background/75 px-3 py-2">
            <div className="text-muted-foreground text-[11px]">
              Automations active
            </div>
            <div className="mt-1 text-[13px] font-semibold">
              {enabledAutomationCount}/2
            </div>
          </div>
          <div className="rounded-lg border border-border/20 bg-background/75 px-3 py-2">
            <div className="text-muted-foreground text-[11px]">Workflows</div>
            <div className="mt-1 text-[13px] font-semibold">
              {automationStats.activeWorkflows}
            </div>
          </div>
          <div className="rounded-lg border border-border/20 bg-background/75 px-3 py-2">
            <div className="text-muted-foreground text-[11px]">Tasks</div>
            <div className="mt-1 text-[13px] font-semibold">
              {automationStats.totalTasks}
            </div>
          </div>
          <div className="rounded-lg border border-border/20 bg-background/75 px-3 py-2">
            <div className="text-muted-foreground text-[11px]">Subtasks</div>
            <div className="mt-1 text-[13px] font-semibold">
              {automationStats.totalSubtasks ?? 0}
            </div>
          </div>
          <div className="rounded-lg border border-border/20 bg-background/75 px-3 py-2">
            <div className="text-muted-foreground text-[11px]">Overdue</div>
            <div className="mt-1 text-[13px] font-semibold">
              {automationStats.overdueTasks}
            </div>
          </div>
          <div className="rounded-lg border border-border/20 bg-background/75 px-3 py-2">
            <div className="text-muted-foreground text-[11px]">Open risks</div>
            <div className="mt-1 text-[13px] font-semibold">
              {automationStats.openRisks}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="deadlines" className="space-y-3">
        <TabsList className="h-8 rounded-lg border border-border/25 bg-muted/55 p-1">
          <TabsTrigger
            value="deadlines"
            className="h-6 px-2.5 text-[11px] data-[state=active]:bg-background"
          >
            Deadlines
          </TabsTrigger>
          <TabsTrigger
            value="meetings"
            className="h-6 px-2.5 text-[11px] data-[state=active]:bg-background"
          >
            Meetings
          </TabsTrigger>
          <TabsTrigger
            value="runs"
            className="h-6 px-2.5 text-[11px] data-[state=active]:bg-background"
          >
            Run Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deadlines" className="mt-0">
          <Card className="border-border/35 bg-card/80 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-[13px]">
                    Task & Subtask Deadline Reminders
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Notify assignees when due dates are close. If a task has no
                    assignee, team fallback notifies project team members.
                  </CardDescription>
                </div>
                <Switch
                  checked={draft.taskReminder.enabled}
                  onCheckedChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      taskReminder: {
                        ...current.taskReminder,
                        enabled: checked,
                      },
                    }))
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    Check interval (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={draft.taskReminder.intervalMinutes}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        taskReminder: {
                          ...current.taskReminder,
                          intervalMinutes: clampNumericInput(
                            event.target.value,
                            current.taskReminder.intervalMinutes,
                            5,
                            1440,
                          ),
                        },
                      }))
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    Near-end threshold (hours)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={draft.taskReminder.thresholdHours}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        taskReminder: {
                          ...current.taskReminder,
                          thresholdHours: clampNumericInput(
                            event.target.value,
                            current.taskReminder.thresholdHours,
                            1,
                            168,
                          ),
                        },
                      }))
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Dedupe window (minutes)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={1440}
                    value={draft.taskReminder.dedupeWindowMinutes}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        taskReminder: {
                          ...current.taskReminder,
                          dedupeWindowMinutes: clampNumericInput(
                            event.target.value,
                            current.taskReminder.dedupeWindowMinutes,
                            10,
                            1440,
                          ),
                        },
                      }))
                    }
                    className="h-8"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-md border border-border/25 px-2 py-1.5">
                  <Switch
                    checked={draft.taskReminder.includeSubtasks}
                    onCheckedChange={(checked) =>
                      updateDraft((current) => ({
                        ...current,
                        taskReminder: {
                          ...current.taskReminder,
                          includeSubtasks: checked,
                        },
                      }))
                    }
                  />
                  <span className="text-[11px]">Include subtasks</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/25 px-2 py-1.5">
                  <Switch
                    checked={draft.taskReminder.includeTeamFallback}
                    onCheckedChange={(checked) =>
                      updateDraft((current) => ({
                        ...current,
                        taskReminder: {
                          ...current.taskReminder,
                          includeTeamFallback: checked,
                        },
                      }))
                    }
                  />
                  <span className="text-[11px]">Fallback to team members</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border border-border/25 bg-background/70 px-2.5 py-2">
                <div className="text-[11px] text-muted-foreground">
                  Last run: {formatRunTime(draft.taskReminder.lastRunAt)}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runAutomationNow("deadline")}
                  disabled={runAgentMutation.isPending}
                >
                  <AlarmClock className="size-3.5" />
                  Run now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="mt-0">
          <Card className="border-border/35 bg-card/80 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-[13px]">
                    Meeting Reminders + Calendar
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Schedule project meetings, send reminders, and generate
                    Google or Outlook calendar events.
                  </CardDescription>
                </div>
                <Switch
                  checked={draft.meetingReminder.enabled}
                  onCheckedChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      meetingReminder: {
                        ...current.meetingReminder,
                        enabled: checked,
                      },
                    }))
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    Check interval (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={draft.meetingReminder.intervalMinutes}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        meetingReminder: {
                          ...current.meetingReminder,
                          intervalMinutes: clampNumericInput(
                            event.target.value,
                            current.meetingReminder.intervalMinutes,
                            5,
                            1440,
                          ),
                        },
                      }))
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    Reminder window (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={draft.meetingReminder.reminderMinutes}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        meetingReminder: {
                          ...current.meetingReminder,
                          reminderMinutes: clampNumericInput(
                            event.target.value,
                            current.meetingReminder.reminderMinutes,
                            1,
                            1440,
                          ),
                        },
                      }))
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Dedupe window (minutes)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={1440}
                    value={draft.meetingReminder.dedupeWindowMinutes}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        meetingReminder: {
                          ...current.meetingReminder,
                          dedupeWindowMinutes: clampNumericInput(
                            event.target.value,
                            current.meetingReminder.dedupeWindowMinutes,
                            10,
                            1440,
                          ),
                        },
                      }))
                    }
                    className="h-8"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border border-border/25 bg-background/70 px-2.5 py-2">
                <div className="text-[11px] text-muted-foreground">
                  Last run: {formatRunTime(draft.meetingReminder.lastRunAt)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runAutomationNow("meeting")}
                    disabled={runAgentMutation.isPending}
                  >
                    <BellRing className="size-3.5" />
                    Run now
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMeetingDialogOpen(true)}
                  >
                    <CalendarPlus className="size-3.5" />
                    Add meeting
                  </Button>
                </div>
              </div>

              <div className="max-h-[18rem] overflow-y-auto rounded-md border border-border/25 bg-background/65">
                <div className="divide-y divide-border/20">
                  {meetings.length ? (
                    meetings.map((meeting) => {
                      const googleLink = buildGoogleCalendarLink(
                        meeting,
                        project.name,
                      );
                      const outlookLink = buildOutlookCalendarLink(
                        meeting,
                        project.name,
                      );

                      return (
                        <div key={meeting.id} className="space-y-2 px-2.5 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="text-[12px] font-medium">
                                {meeting.title}
                              </div>
                              <div className="text-muted-foreground text-[11px]">
                                {formatMeetingDate(meeting.startAt)} →{" "}
                                {formatMeetingDate(meeting.endAt)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => archiveMeeting(meeting.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <Badge variant="outline" className="gap-1">
                              <Users className="size-3" />
                              {meeting.memberUserIds.length} members
                            </Badge>
                            <Badge variant="outline">
                              {meeting.teamIds.length} teams
                            </Badge>
                            {meeting.location ? (
                              <Badge variant="outline">
                                {meeting.location}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {googleLink ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                onClick={() =>
                                  window.open(
                                    googleLink,
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                                }
                              >
                                <ExternalLink className="size-3" />
                                Google
                              </Button>
                            ) : null}
                            {outlookLink ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                onClick={() =>
                                  window.open(
                                    outlookLink,
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                                }
                              >
                                <ExternalLink className="size-3" />
                                Outlook
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-2.5 py-4">
                      <Empty className="border-0 p-0 md:p-0">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <CalendarX2 className="size-4 text-primary/85" />
                          </EmptyMedia>
                          <EmptyDescription className="text-[11px]">
                            No meetings created yet.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="mt-0">
          <Card className="border-border/35 bg-card/80 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">
                Recent Automation Runs
              </CardTitle>
              <CardDescription className="text-[11px]">
                Deadline and meeting reminder runs for this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {visibleRuns.length ? (
                  visibleRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border/20 bg-background/70 px-2.5 py-2"
                    >
                      <div>
                        <div className="text-[12px] font-medium">
                          {formatRunTypeLabel(run.runType)} · {run.status}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {run.summary}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-muted-foreground">
                        <div>{formatRunTime(run.createdAt)}</div>
                        <div>{run.createdNotifications} notifications</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty className="border-0 p-0 md:p-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <History className="size-4 text-primary/85" />
                      </EmptyMedia>
                      <EmptyDescription className="text-[11px]">
                        No deadline or meeting runs yet.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
            <DialogDescription>
              Add a project meeting. Save it, then open a prefilled
              Google/Outlook event from the meeting row.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-[11px]">Title</Label>
              <Input
                value={meetingDraft.title}
                onChange={(event) =>
                  setMeetingDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Sprint planning"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px]">Description</Label>
              <Textarea
                value={meetingDraft.description}
                onChange={(event) =>
                  setMeetingDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-20"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Start</Label>
                <Input
                  type="datetime-local"
                  value={meetingDraft.startAt}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">End</Label>
                <Input
                  type="datetime-local"
                  value={meetingDraft.endAt}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({
                      ...current,
                      endAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px]">Location</Label>
              <Input
                value={meetingDraft.location}
                onChange={(event) =>
                  setMeetingDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="Zoom / Room A"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px]">Notify teams</Label>
              <div className="max-h-24 overflow-y-auto rounded-md border border-border/25 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {project.teams.map((team) => {
                    const selected = meetingDraft.teamIds.includes(team.id);

                    return (
                      <button
                        key={team.id}
                        type="button"
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px]",
                          selected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/30 bg-background/70 text-muted-foreground",
                        )}
                        onClick={() => toggleMeetingTeam(team.id)}
                      >
                        {team.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px]">Notify members</Label>
              <div className="max-h-28 overflow-y-auto rounded-md border border-border/25 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {members.map((member) => {
                    const selected = meetingDraft.memberUserIds.includes(
                      member.id,
                    );

                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px]",
                          selected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/30 bg-background/70 text-muted-foreground",
                        )}
                        onClick={() => toggleMeetingMember(member.id)}
                      >
                        {member.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMeetingDialogOpen(false);
                setMeetingDraft(EMPTY_MEETING_DRAFT);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateMeeting}>
              Create meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
