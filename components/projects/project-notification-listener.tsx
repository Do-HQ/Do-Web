"use client";

import { useEffect, useRef } from "react";
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

      const activeWorkspaceId = String(workspaceId || "").trim();
      if (
        activeWorkspaceId &&
        String(notification?.workspaceId || "") === activeWorkspaceId
      ) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "workspace-project-notifications" &&
            query.queryKey[1] === activeWorkspaceId &&
            query.queryKey[2] === String(notification?.projectId || ""),
        });
      }
    };

    socket.on("project:notification:created", handleNotificationCreated);

    return () => {
      socket.off("project:notification:created", handleNotificationCreated);
    };
  }, [queryClient, router, workspaceId]);

  return null;
}
