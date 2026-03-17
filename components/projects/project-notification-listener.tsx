"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  connectProjectNotificationsSocket,
  ProjectNotificationEventPayload,
} from "@/lib/realtime/project-notifications-socket";
import useWorkspaceStore from "@/stores/workspace";

export default function ProjectNotificationListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationServiceWorkerRef = useRef<ServiceWorkerRegistration | null>(
    null,
  );
  const hasRequestedNotificationPermissionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;

    navigator.serviceWorker
      .register("/spaces-notifications-sw.js")
      .then((registration) => {
        if (!mounted) {
          return;
        }
        notificationServiceWorkerRef.current = registration;
      })
      .catch(() => {
        // Browser notifications are optional.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const showBrowserNotification = useCallback(
    async (payload: { id: string; title?: string; summary?: string; route?: string }) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      let permission = Notification.permission;

      if (
        permission === "default" &&
        !hasRequestedNotificationPermissionRef.current
      ) {
        hasRequestedNotificationPermissionRef.current = true;
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = Notification.permission;
        }
      }

      if (permission !== "granted") {
        return;
      }

      const title = String(payload.title || "Notification").trim();
      const body = String(payload.summary || "").trim();
      const route = String(payload.route || "/").trim() || "/";

      const registration =
        notificationServiceWorkerRef.current ||
        (await navigator.serviceWorker.getRegistration().catch(() => null));

      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          tag: `workspace-notification-${payload.id}`,
          data: { route },
        });
        return;
      }

      const notification = new Notification(title, {
        body,
        tag: `workspace-notification-${payload.id}`,
        data: { route },
      });

      notification.onclick = () => {
        window.focus();
        router.push(route);
        notification.close();
      };
    },
    [router],
  );

  useEffect(() => {
    const socket = connectProjectNotificationsSocket();

    const handleNotificationCreated = (
      payload: ProjectNotificationEventPayload,
    ) => {
      const notification = payload?.notification;
      const notificationId = String(notification?.id || "").trim();

      if (!notificationId || seenNotificationIdsRef.current.has(notificationId)) {
        return;
      }

      seenNotificationIdsRef.current.add(notificationId);
      if (seenNotificationIdsRef.current.size > 200) {
        const values = Array.from(seenNotificationIdsRef.current);
        seenNotificationIdsRef.current = new Set(values.slice(values.length - 80));
      }

      toast(notification?.title || "Project update", {
        description: notification?.summary || "",
        action:
          notification?.route
            ? {
                label: "View",
                onClick: () => router.push(notification.route),
              }
            : undefined,
      });

      void showBrowserNotification({
        id: notificationId,
        title: notification?.title,
        summary: notification?.summary,
        route: notification?.route,
      });

      const activeWorkspaceId = String(workspaceId || "").trim();
      if (
        activeWorkspaceId &&
        String(notification?.workspaceId || "") === activeWorkspaceId
      ) {
        const notificationType = String(notification?.type || "").trim();

        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "workspace-project-notifications" &&
            query.queryKey[1] === activeWorkspaceId &&
            query.queryKey[2] === String(notification?.projectId || ""),
        });
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "workspace-notifications" &&
            query.queryKey[1] === activeWorkspaceId,
        });

        if (notificationType.startsWith("support.ticket")) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-tickets" &&
              query.queryKey[1] === activeWorkspaceId,
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-ticket-detail" &&
              query.queryKey[1] === activeWorkspaceId,
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-ticket-messages" &&
              query.queryKey[1] === activeWorkspaceId,
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-ticket-internal-notes" &&
              query.queryKey[1] === activeWorkspaceId,
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-queue" &&
              query.queryKey[1] === activeWorkspaceId,
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-status" &&
              query.queryKey[1] === activeWorkspaceId,
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "workspace-support-sla-board" &&
              query.queryKey[1] === activeWorkspaceId,
          });
        }
      }
    };

    socket.on("project:notification:created", handleNotificationCreated);

    return () => {
      socket.off("project:notification:created", handleNotificationCreated);
    };
  }, [queryClient, router, showBrowserNotification, workspaceId]);

  return null;
}
