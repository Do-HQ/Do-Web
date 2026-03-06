"use client";

import { io, Socket } from "socket.io-client";
import config from "@/config";
import { LOCAL_KEYS } from "@/utils/constants";
import { WorkspaceProjectNotificationRecord } from "@/types/project";

type ProjectNotificationEventPayload = {
  notification: WorkspaceProjectNotificationRecord;
};

let projectNotificationsSocket: Socket | null = null;

const resolveSocketBaseUrl = () => {
  const baseUrl = String(config.BASE_API_URL || "").trim();

  if (!baseUrl) {
    return "";
  }

  return baseUrl.endsWith("/api")
    ? baseUrl.slice(0, baseUrl.length - 4)
    : baseUrl.replace(/\/+$/, "");
};

const getSocketToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(LOCAL_KEYS.TOKEN) || "";
};

const getProjectNotificationsSocket = () => {
  if (projectNotificationsSocket) {
    projectNotificationsSocket.auth = {
      token: getSocketToken(),
    };
    return projectNotificationsSocket;
  }

  const socketBaseUrl = resolveSocketBaseUrl();
  projectNotificationsSocket = io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      token: getSocketToken(),
    },
  });

  return projectNotificationsSocket;
};

const connectProjectNotificationsSocket = () => {
  const socket = getProjectNotificationsSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export type { ProjectNotificationEventPayload };
export { getProjectNotificationsSocket, connectProjectNotificationsSocket };
