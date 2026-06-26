"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/stores";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import {
  getSpacesSocket,
  subscribeWorkspaceSpaces,
  unsubscribeWorkspaceSpaces,
  type SpaceMessageEventPayload,
} from "@/lib/realtime/spaces-socket";
import {
  connectProjectNotificationsSocket,
  type ProjectNotificationEventPayload,
} from "@/lib/realtime/project-notifications-socket";
import { ROUTES } from "@/utils/constants";

export default function GlobalNavBadgeListener() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const {
    incrementSpacesUnread,
    incrementJamsUnread,
    clearSpacesUnread,
    clearJamsUnread,
  } = useAppStore();

  const currentUserId = String(user?._id || "").trim();
  const subscribedWorkspaceRef = useRef<string | null>(null);

  // Clear badge counts when user navigates to the relevant section.
  useEffect(() => {
    if (pathname.startsWith(ROUTES.SPACES)) clearSpacesUnread();
    if (pathname.startsWith(ROUTES.JAMS)) clearJamsUnread();
  }, [pathname, clearSpacesUnread, clearJamsUnread]);

  // Spaces: listen for new messages at the workspace level.
  useEffect(() => {
    if (!workspaceId || !currentUserId) return;

    if (subscribedWorkspaceRef.current !== workspaceId) {
      if (subscribedWorkspaceRef.current) {
        unsubscribeWorkspaceSpaces({ workspaceId: subscribedWorkspaceRef.current });
      }
      subscribeWorkspaceSpaces({ workspaceId });
      subscribedWorkspaceRef.current = workspaceId;
    }

    const socket = getSpacesSocket();

    const handleMessage = ({ message }: SpaceMessageEventPayload) => {
      const senderId = String(message?.author?.id || "").trim();
      if (senderId && senderId === currentUserId) return;
      if (window.location.pathname.startsWith(ROUTES.SPACES)) return;
      incrementSpacesUnread();
    };

    socket.on("spaces:message:created", handleMessage);

    return () => {
      socket.off("spaces:message:created", handleMessage);
    };
  }, [workspaceId, currentUserId, incrementSpacesUnread]);

  // Project notifications: listen for jam-related notifications.
  useEffect(() => {
    if (!workspaceId) return;

    const socket = connectProjectNotificationsSocket();

    const handleNotification = ({ notification }: ProjectNotificationEventPayload) => {
      const type = String(notification?.type || "");
      if (!type.startsWith("jam.")) return;
      if (window.location.pathname.startsWith(ROUTES.JAMS)) return;
      incrementJamsUnread();
    };

    socket.on("project:notification:created", handleNotification);

    return () => {
      socket.off("project:notification:created", handleNotification);
    };
  }, [workspaceId, incrementJamsUnread]);

  return null;
}
