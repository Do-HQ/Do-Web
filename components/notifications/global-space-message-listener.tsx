"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  subscribeWorkspaceSpaces,
} from "@/lib/realtime/spaces-socket";
import type { SpaceMessageEventPayload } from "@/lib/realtime/spaces-socket";
import { playNotificationSound } from "@/lib/helpers/notification-sound";
import useWorkspaceStore from "@/stores/workspace";
import useAuthStore from "@/stores/auth";

const MAX_PREVIEW_LENGTH = 80;

const truncate = (text: string, max: number): string => {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
};

// Read every cached rooms page and collect room IDs the current user belongs to.
// The rooms query key prefix is ["workspace-spaces-rooms", workspaceId, "infinite"].
const getUserRoomIds = (
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
): Set<string> => {
  const ids = new Set<string>();
  const allCached = queryClient.getQueriesData<{
    pages: Array<{ data?: { rooms?: Array<{ id?: string }> } }>;
  }>({ queryKey: ["workspace-spaces-rooms", workspaceId, "infinite"] });

  for (const [, data] of allCached) {
    for (const page of data?.pages ?? []) {
      for (const room of page?.data?.rooms ?? []) {
        if (room?.id) ids.add(String(room.id));
      }
    }
  }
  return ids;
};

export default function GlobalSpaceMessageListener() {
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const currentUserIdRef = useRef<string>("");

  useEffect(() => {
    currentUserIdRef.current = String(user?._id || "").trim();
  }, [user?._id]);

  useEffect(() => {
    const scopedWorkspaceId = String(workspaceId || "").trim();
    if (!scopedWorkspaceId) return;

    const socket = subscribeWorkspaceSpaces({ workspaceId: scopedWorkspaceId });

    const handleReconnect = () => {
      socket.emit("spaces:workspace:subscribe", { workspaceId: scopedWorkspaceId });
    };

    const handleMessageCreated = (payload: SpaceMessageEventPayload) => {
      const message = payload?.message;
      if (!message) return;

      const messageId = String(message?.id || "").trim();
      if (!messageId) return;

      if (seenMessageIdsRef.current.has(messageId)) return;
      seenMessageIdsRef.current.add(messageId);
      if (seenMessageIdsRef.current.size > 300) {
        const values = Array.from(seenMessageIdsRef.current);
        seenMessageIdsRef.current = new Set(values.slice(values.length - 100));
      }

      // Skip own messages and AI agent messages
      const authorId = String(message.author?.id || "").trim();
      if (authorId && currentUserIdRef.current && authorId === currentUserIdRef.current) return;
      if (message.author?.role === "agent") return;

      // Only notify for rooms the user is actually a member of.
      // The workspace socket delivers events for ALL rooms — including private
      // rooms the user has no access to.
      const incomingRoomId = String(payload.roomId || "").trim();
      if (incomingRoomId) {
        const userRoomIds = getUserRoomIds(queryClient, scopedWorkspaceId);
        // If we have cached rooms and this room isn't one of them, skip.
        if (userRoomIds.size > 0 && !userRoomIds.has(incomingRoomId)) return;
      }

      const senderName = message.author?.name || "Someone";
      const preview = message.content
        ? truncate(message.content, MAX_PREVIEW_LENGTH)
        : message.attachments?.length
        ? `Sent ${message.attachments.length} attachment(s)`
        : "";

      playNotificationSound();
      toast(senderName, {
        description: preview || undefined,
      });
    };

    socket.on("connect", handleReconnect);
    socket.on("spaces:message:created", handleMessageCreated);

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("spaces:message:created", handleMessageCreated);
    };
  }, [workspaceId, queryClient]);

  return null;
}
