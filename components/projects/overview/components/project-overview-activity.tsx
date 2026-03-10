"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoaderComponent from "@/components/shared/loader";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceStore from "@/stores/workspace";
import {
  ProjectEventPayload,
  subscribeProjectEvents,
  unsubscribeProjectEvents,
} from "@/lib/realtime/project-events-socket";
import { WorkspaceProjectEventRecord } from "@/types/project";
import { Pagination } from "@/types";

import { ProjectActivityEvent, ProjectMember } from "../types";
import { formatPipelineLabel } from "../utils";

type ProjectOverviewActivityProps = {
  projectId: string;
  selectedPipelineId?: string;
  selectedTeamId: string;
  fallbackActivities: ProjectActivityEvent[];
  members?: ProjectMember[];
};

type EventQueryData = {
  data?: {
    events?: WorkspaceProjectEventRecord[];
    pagination?: Pagination;
  };
};

const PREVIEW_LIMIT = 3;
const MODAL_LIMIT = 20;

const formatRelativeTime = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value || "Just now";
  }

  const seconds = Math.round((Date.now() - parsed.getTime()) / 1000);
  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
};

const mapEventToActivity = (
  event: WorkspaceProjectEventRecord,
  actorAvatarByUserId: Map<string, string>,
): ProjectActivityEvent => ({
  id: event.id,
  actor: event.actorName,
  actorInitials: event.actorInitials || "U",
  actorAvatarUrl:
    String(
      actorAvatarByUserId.get(String(event.actorUserId || "")) ||
        event.actorAvatarUrl ||
        ((event.metadata as { actorAvatarUrl?: string } | undefined)
          ?.actorAvatarUrl ?? ""),
    ).trim() || undefined,
  summary: event.summary,
  createdAt: formatRelativeTime(event.createdAt),
  eventType: event.eventType,
  route: event.route,
  target: event.target,
  pipelineId: event.pipelineId || undefined,
  teamId: event.teamId || undefined,
});

const appendLiveEvent = (
  current: EventQueryData | undefined,
  event: WorkspaceProjectEventRecord,
  limit: number,
): EventQueryData => {
  const previousEvents = Array.isArray(current?.data?.events)
    ? current.data.events
    : [];

  if (previousEvents.some((item) => item.id === event.id)) {
    return current || { data: { events: previousEvents } };
  }

  const nextEvents = [event, ...previousEvents].slice(0, limit);
  const previousPagination = current?.data?.pagination;
  const nextTotal =
    Number(previousPagination?.total || previousEvents.length) + 1;

  return {
    ...(current || {}),
    data: {
      ...(current?.data || {}),
      events: nextEvents,
      pagination: previousPagination
        ? {
            ...previousPagination,
            total: nextTotal,
            hasNextPage:
              nextTotal >
              Number(previousPagination.page || 1) *
                Number(previousPagination.limit || limit),
          }
        : {
            total: nextTotal,
            page: 1,
            limit,
            totalPages: Math.max(1, Math.ceil(nextTotal / limit)),
            hasNextPage: nextTotal > limit,
            hasPrevPage: false,
          },
    },
  };
};

const resolveActivityRoute = (
  activity: ProjectActivityEvent,
  projectId: string,
) => {
  const route = String(activity.route || "").trim();

  if (route) {
    return route;
  }

  const tab = String(activity.target?.tab || "").trim();

  if (tab) {
    return `/projects/${projectId}?tab=${encodeURIComponent(tab)}`;
  }

  return `/projects/${projectId}`;
};

export function ProjectOverviewActivity({
  projectId,
  selectedPipelineId,
  selectedTeamId,
  fallbackActivities,
  members = [],
}: ProjectOverviewActivityProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspaceProjectEvents } = useWorkspaceProject();
  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);

  const previewParams = useMemo(
    () => ({
      page: 1,
      limit: PREVIEW_LIMIT,
      pipelineId: selectedPipelineId || "",
      teamId: selectedTeamId || "all",
      search: "",
      eventType: "",
    }),
    [selectedPipelineId, selectedTeamId],
  );
  const modalParams = useMemo(
    () => ({
      page: eventsPage,
      limit: MODAL_LIMIT,
      pipelineId: selectedPipelineId || "",
      teamId: selectedTeamId || "all",
      search: "",
      eventType: "",
    }),
    [eventsPage, selectedPipelineId, selectedTeamId],
  );
  const modalPageOneParams = useMemo(
    () => ({
      page: 1,
      limit: MODAL_LIMIT,
      pipelineId: selectedPipelineId || "",
      teamId: selectedTeamId || "all",
      search: "",
      eventType: "",
    }),
    [selectedPipelineId, selectedTeamId],
  );

  const previewEventsQuery = useWorkspaceProjectEvents(
    workspaceId || "",
    projectId,
    previewParams,
    {
      enabled: Boolean(workspaceId) && Boolean(projectId),
    },
  );
  const modalEventsQuery = useWorkspaceProjectEvents(
    workspaceId || "",
    projectId,
    modalParams,
    {
      enabled: Boolean(workspaceId) && Boolean(projectId) && eventsOpen,
    },
  );

  useEffect(() => {
    setEventsPage(1);
  }, [selectedPipelineId, selectedTeamId]);

  useEffect(() => {
    if (!eventsOpen) {
      setEventsPage(1);
    }
  }, [eventsOpen]);

  useEffect(() => {
    if (!workspaceId || !projectId) {
      return;
    }

    const socket = subscribeProjectEvents({
      workspaceId,
      projectId,
    });

    const handleProjectEventCreated = (payload: ProjectEventPayload) => {
      if (
        payload.workspaceId !== workspaceId ||
        payload.projectId !== projectId ||
        !payload.event
      ) {
        return;
      }

      if (
        selectedPipelineId &&
        payload.event.pipelineId &&
        payload.event.pipelineId !== selectedPipelineId
      ) {
        return;
      }

      if (
        selectedTeamId &&
        selectedTeamId !== "all" &&
        payload.event.teamId &&
        payload.event.teamId !== selectedTeamId
      ) {
        return;
      }

      queryClient.setQueryData<EventQueryData>(
        ["workspace-project-events", workspaceId, projectId, previewParams],
        (current) => appendLiveEvent(current, payload.event, PREVIEW_LIMIT),
      );
      queryClient.setQueryData<EventQueryData>(
        [
          "workspace-project-events",
          workspaceId,
          projectId,
          modalPageOneParams,
        ],
        (current) => appendLiveEvent(current, payload.event, MODAL_LIMIT),
      );
    };

    socket.on("project:event:created", handleProjectEventCreated);

    return () => {
      socket.off("project:event:created", handleProjectEventCreated);
      unsubscribeProjectEvents({
        workspaceId,
        projectId,
      });
    };
  }, [
    modalPageOneParams,
    previewParams,
    projectId,
    queryClient,
    selectedPipelineId,
    selectedTeamId,
    workspaceId,
  ]);
  const actorAvatarByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      const memberId = String(member.id || "").trim();
      const avatarUrl = String(member.avatarUrl || "").trim();
      if (memberId && avatarUrl) {
        map.set(memberId, avatarUrl);
      }
    }
    return map;
  }, [members]);

  const previewActivities = useMemo(() => {
    const apiEvents = previewEventsQuery.data?.data?.events || [];

    if (apiEvents.length) {
      return apiEvents
        .map((event) => mapEventToActivity(event, actorAvatarByUserId))
        .slice(0, PREVIEW_LIMIT);
    }

    return fallbackActivities.slice(0, PREVIEW_LIMIT);
  }, [actorAvatarByUserId, fallbackActivities, previewEventsQuery.data]);
  const modalActivities = useMemo(
    () =>
      (modalEventsQuery.data?.data?.events || []).map((event) =>
        mapEventToActivity(event, actorAvatarByUserId),
      ),
    [actorAvatarByUserId, modalEventsQuery.data],
  );
  const modalPagination = modalEventsQuery.data?.data?.pagination;

  const handleOpenActivity = (activity: ProjectActivityEvent) => {
    const route = resolveActivityRoute(activity, projectId);
    if (!route) {
      return;
    }

    setEventsOpen(false);
    router.push(route);
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-border/35 px-3 py-3 md:px-4">
          <div>
            <h2 className="text-[14px] font-semibold md:text-[15px]">
              Recent activity
            </h2>
            <p className="text-muted-foreground text-[12px] leading-5">
              Live project actions. Click any event to jump to it.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEventsOpen(true)}
          >
            View all
            <ArrowUpRight />
          </Button>
        </div>

        {previewEventsQuery.isLoading || previewEventsQuery.isFetching ? (
          <div className="px-3 py-4 md:px-4">
            <LoaderComponent />
          </div>
        ) : previewActivities.length ? (
          <div className="divide-y divide-border/35">
            {previewActivities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => handleOpenActivity(activity)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/20 md:px-4"
              >
                <Avatar
                  size="sm"
                  userCard={{
                    name: activity.actor,
                    role: "Project actor",
                    status: activity.createdAt,
                  }}
                >
                  <AvatarImage
                    src={activity.actorAvatarUrl || ""}
                    alt={activity.actor}
                  />
                  <AvatarFallback>{activity.actorInitials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[12.5px] leading-5 md:text-[13.5px]">
                    <span className="font-medium">{activity.actor}</span>{" "}
                    {activity.summary}
                  </p>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span>{activity.createdAt}</span>
                    {activity.pipelineId ? (
                      <Badge variant="outline" className="font-medium">
                        {formatPipelineLabel(activity.pipelineId)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-3 md:px-4">
            <Empty className="border-0 p-0 md:p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Activity className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyDescription className="text-[12px]">
                  No activity matches the current filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </section>

      <Dialog open={eventsOpen} onOpenChange={setEventsOpen}>
        <DialogContent className="flex max-h-[82vh] flex-col overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b border-border/30 px-4 py-3 md:px-5">
            <DialogTitle>Project events</DialogTitle>
            <DialogDescription>
              Real-time event stream for this project. Click an event to jump to
              the related section.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 md:px-5">
            {modalEventsQuery.isLoading || modalEventsQuery.isFetching ? (
              <LoaderComponent />
            ) : modalActivities.length ? (
              <div className="flex-1 overflow-y-auto rounded-md border-border/35 border">
                <div className="divide-y divide-border/35">
                  {modalActivities.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => handleOpenActivity(activity)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/20"
                    >
                      <Avatar
                        size="sm"
                        userCard={{
                          name: activity.actor,
                          role: "Project actor",
                          status: activity.createdAt,
                        }}
                      >
                        <AvatarImage
                          src={activity.actorAvatarUrl || ""}
                          alt={activity.actor}
                        />
                        <AvatarFallback>
                          {activity.actorInitials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[12.5px] leading-5">
                          <span className="font-medium">{activity.actor}</span>{" "}
                          {activity.summary}
                        </p>

                        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span>{activity.createdAt}</span>
                          {activity.pipelineId ? (
                            <Badge variant="outline" className="font-medium">
                              {formatPipelineLabel(activity.pipelineId)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Empty className="rounded-md border border-border/35 p-3 md:p-3">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Activity className="size-4 text-primary/85" />
                  </EmptyMedia>
                  <EmptyDescription className="text-[12px]">
                    No events found for this scope yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="text-muted-foreground text-[11px]">
                {modalPagination
                  ? `Page ${modalPagination.page} of ${modalPagination.totalPages}`
                  : "Page 1"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEventsPage((current) => Math.max(1, current - 1))
                  }
                  disabled={!modalPagination?.hasPrevPage}
                >
                  <ChevronLeft />
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEventsPage((current) =>
                      modalPagination?.hasNextPage ? current + 1 : current,
                    )
                  }
                  disabled={!modalPagination?.hasNextPage}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
