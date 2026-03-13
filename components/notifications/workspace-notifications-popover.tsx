"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceProjectNotificationRecord } from "@/types/project";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import LoaderComponent from "@/components/shared/loader";

type NotificationStateFilter = "all" | "unread";

const formatNotificationTime = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const resolveNotificationRoute = (notification: WorkspaceProjectNotificationRecord) => {
  const route = String(notification?.route || "").trim();
  if (route) {
    return route;
  }

  const projectId = String(notification?.projectId || "").trim();
  if (projectId) {
    return `/projects/${projectId}`;
  }

  return ROUTES.DASHBOARD;
};

export function WorkspaceNotificationsPopover() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const {
    useWorkspaceNotifications,
    useMarkWorkspaceNotificationRead,
    useMarkAllWorkspaceNotificationsRead,
  } = useWorkspaceProject();

  const [open, setOpen] = useState(false);
  const [stateFilter, setStateFilter] =
    useState<NotificationStateFilter>("all");
  const [page, setPage] = useState(1);
  const limit = 12;
  const activeWorkspaceId = String(workspaceId || "").trim();

  const notificationsQuery = useWorkspaceNotifications(
    activeWorkspaceId,
    {
      page,
      limit,
      state: stateFilter,
    },
    {
      enabled: Boolean(activeWorkspaceId) && open,
    },
  );

  const unreadCountQuery = useWorkspaceNotifications(
    activeWorkspaceId,
    {
      page: 1,
      limit: 1,
      state: "unread",
    },
    {
      enabled: Boolean(activeWorkspaceId),
    },
  );

  const markNotificationReadMutation = useMarkWorkspaceNotificationRead({
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-notifications" &&
          query.queryKey[1] === activeWorkspaceId,
      });
    },
  });

  const markAllNotificationsReadMutation = useMarkAllWorkspaceNotificationsRead({
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-notifications" &&
          query.queryKey[1] === activeWorkspaceId,
      });
    },
  });

  const notifications = notificationsQuery.data?.data?.notifications ?? [];
  const pagination = notificationsQuery.data?.data?.pagination;
  const unreadCount = unreadCountQuery.data?.data?.pagination?.total ?? 0;
  const isLoading =
    notificationsQuery.isLoading || notificationsQuery.isFetching;
  const hasUnread = unreadCount > 0;

  const filterOptions = useMemo(
    () =>
      [
        { value: "all", label: "All" },
        { value: "unread", label: "Unread" },
      ] as const,
    [],
  );

  const markOneRead = async (notificationId: string) => {
    if (!activeWorkspaceId || !notificationId) {
      return;
    }

    await markNotificationReadMutation.mutateAsync({
      workspaceId: activeWorkspaceId,
      notificationId,
    });
  };

  const handleMarkAllRead = async () => {
    if (!activeWorkspaceId || !hasUnread) {
      return;
    }

    await toast.promise(
      markAllNotificationsReadMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
      }),
      {
        loading: "Marking notifications as read...",
        success: "All notifications marked as read.",
        error: "Could not mark all notifications as read.",
      },
    );
  };

  const handleOpenNotification = async (
    notification: WorkspaceProjectNotificationRecord,
  ) => {
    if (!notification.isRead) {
      try {
        await markOneRead(notification.id);
      } catch {
        // Do not block navigation when read action fails.
      }
    }

    setOpen(false);
    router.push(resolveNotificationRoute(notification));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setPage(1);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative size-8"
          title="Notifications"
        >
          <Bell className="size-4" />
          {hasUnread ? (
            <span
              className="bg-primary ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
              aria-hidden="true"
            />
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[24rem] p-0">
        <div className="flex items-center justify-between border-b border-border/35 px-3 py-2.5">
          <div className="text-[12px] font-semibold">Notifications</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            disabled={!hasUnread || markAllNotificationsReadMutation.isPending}
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-border/25 px-3 py-2">
          {filterOptions.map((option) => {
            const isActive = stateFilter === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 rounded-md px-2.5 text-[11px]",
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setStateFilter(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {isLoading && !notifications.length ? (
            <div className="text-muted-foreground px-3 py-4 text-[12px]">
              <LoaderComponent />
            </div>
          ) : notifications.length ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "group flex items-start justify-between gap-2 border-b border-border/20 px-3 py-2.5",
                  notification.isRead ? "bg-transparent" : "bg-primary/4",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleOpenNotification(notification)}
                >
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 text-[12px] font-medium">
                      {notification.title || "Workspace update"}
                    </span>
                    {!notification.isRead ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-4.5">
                    {notification.summary}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px]">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-4 rounded-sm px-1 text-[9px] uppercase"
                    >
                      {notification.type.replace(/\./g, " ")}
                    </Badge>
                  </div>
                </button>

                {!notification.isRead ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-70 hover:opacity-100"
                    onClick={() => void markOneRead(notification.id)}
                    disabled={markNotificationReadMutation.isPending}
                  >
                    <Check className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="px-3 py-4">
              <Empty className="border-0 p-0 md:p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellOff className="size-4 text-primary/85" />
                  </EmptyMedia>
                  <EmptyDescription className="text-[12px]">
                    You&apos;re all caught up.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/30 px-3 py-2">
          <div className="text-muted-foreground text-[10px]">
            Page {pagination?.page ?? page} of{" "}
            {Math.max(1, pagination?.totalPages ?? 1)}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={!pagination?.hasPrevPage || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={!pagination?.hasNextPage || isLoading}
              onClick={() =>
                setPage((current) =>
                  pagination?.hasNextPage ? current + 1 : current,
                )
              }
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
