"use client";

import { io, Socket } from "socket.io-client";
import config from "@/config";
import { LOCAL_KEYS } from "@/utils/constants";
import { WorkspaceProjectRiskCommentRecord } from "@/types/project";

type RiskCommentEventPayload = {
  workspaceId: string;
  projectId: string;
  riskId: string;
  comment: WorkspaceProjectRiskCommentRecord;
};

let projectRiskSocket: Socket | null = null;

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

const getProjectRiskSocket = () => {
  if (projectRiskSocket) {
    projectRiskSocket.auth = {
      token: getSocketToken(),
    };
    return projectRiskSocket;
  }

  const socketBaseUrl = resolveSocketBaseUrl();
  projectRiskSocket = io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      token: getSocketToken(),
    },
  });

  return projectRiskSocket;
};

const subscribeProjectRiskComments = ({
  workspaceId,
  projectId,
  riskId,
}: {
  workspaceId: string;
  projectId: string;
  riskId: string;
}) => {
  const socket = getProjectRiskSocket();

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("project:risk-comments:subscribe", {
    workspaceId,
    projectId,
    riskId,
  });

  return socket;
};

const unsubscribeProjectRiskComments = ({
  workspaceId,
  projectId,
  riskId,
}: {
  workspaceId: string;
  projectId: string;
  riskId: string;
}) => {
  if (!projectRiskSocket) {
    return;
  }

  projectRiskSocket.emit("project:risk-comments:unsubscribe", {
    workspaceId,
    projectId,
    riskId,
  });
};

export type { RiskCommentEventPayload };
export {
  getProjectRiskSocket,
  subscribeProjectRiskComments,
  unsubscribeProjectRiskComments,
};
