"use client";

import { io, Socket } from "socket.io-client";
import config from "@/config";
import { LOCAL_KEYS } from "@/utils/constants";
import { WorkspaceSupportTicketMessageRecord } from "@/types/support";

export type SupportMessageCreatedPayload = {
  workspaceId: string;
  ticketId: string;
  message: WorkspaceSupportTicketMessageRecord;
};

export type SupportTicketUpdatedPayload = {
  workspaceId: string;
  ticketId: string;
  updates: {
    status?: string;
    priority?: string;
    assignedToUserId?: string | null;
  };
};

export type SupportTypingUser = {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
};

export type SupportTypingPayload = {
  workspaceId: string;
  ticketId: string;
  user: SupportTypingUser;
  isTyping: boolean;
};

let supportSocket: Socket | null = null;

const resolveSocketBaseUrl = () => {
  const baseUrl = String(config.BASE_API_URL || "").trim();
  if (!baseUrl) return "";
  return baseUrl.endsWith("/api")
    ? baseUrl.slice(0, baseUrl.length - 4)
    : baseUrl.replace(/\/+$/, "");
};

const getSocketToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LOCAL_KEYS.TOKEN) || "";
};

const getSupportSocket = () => {
  if (supportSocket) {
    supportSocket.auth = { token: getSocketToken() };
    return supportSocket;
  }

  const socketBaseUrl = resolveSocketBaseUrl();
  supportSocket = io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: { token: getSocketToken() },
  });

  return supportSocket;
};

const subscribeTicket = ({
  workspaceId,
  ticketId,
}: {
  workspaceId: string;
  ticketId: string;
}) => {
  const socket = getSupportSocket();
  if (!socket.connected) socket.connect();
  socket.emit("support:ticket:subscribe", { workspaceId, ticketId });
  return socket;
};

const unsubscribeTicket = ({
  workspaceId,
  ticketId,
}: {
  workspaceId: string;
  ticketId: string;
}) => {
  if (!supportSocket) return;
  supportSocket.emit("support:ticket:unsubscribe", { workspaceId, ticketId });
};

const emitSupportTyping = (payload: SupportTypingPayload) => {
  const socket = getSupportSocket();
  if (!socket.connected) return;
  socket.emit("support:typing", payload);
};

export { getSupportSocket, subscribeTicket, unsubscribeTicket, emitSupportTyping };
