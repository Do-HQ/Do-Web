"use client";

import { io, Socket } from "socket.io-client";
import config from "@/config";
import { LOCAL_KEYS } from "@/utils/constants";
import { WorkspaceProjectEventRecord } from "@/types/project";

type ProjectEventPayload = {
  workspaceId: string;
  projectId: string;
  event: WorkspaceProjectEventRecord;
};

let projectEventsSocket: Socket | null = null;

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

const getProjectEventsSocket = () => {
  if (projectEventsSocket) {
    projectEventsSocket.auth = {
      token: getSocketToken(),
    };
    return projectEventsSocket;
  }

  const socketBaseUrl = resolveSocketBaseUrl();
  projectEventsSocket = io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      token: getSocketToken(),
    },
  });

  return projectEventsSocket;
};

const subscribeProjectEvents = ({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) => {
  const socket = getProjectEventsSocket();

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("project:events:subscribe", {
    workspaceId,
    projectId,
  });

  return socket;
};

const unsubscribeProjectEvents = ({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) => {
  if (!projectEventsSocket) {
    return;
  }

  projectEventsSocket.emit("project:events:unsubscribe", {
    workspaceId,
    projectId,
  });
};

export type { ProjectEventPayload };
export {
  getProjectEventsSocket,
  subscribeProjectEvents,
  unsubscribeProjectEvents,
};
