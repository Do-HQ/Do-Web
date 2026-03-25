"use client";

import { io, Socket } from "socket.io-client";
import config from "@/config";
import { LOCAL_KEYS } from "@/utils/constants";
import { WorkspaceSpaceMessageRecord } from "@/types/space";

type SpaceMessageEventPayload = {
  workspaceId: string;
  roomId: string;
  message: WorkspaceSpaceMessageRecord;
};

type SpaceMessageDeletedEventPayload = {
  workspaceId: string;
  roomId: string;
  messageId: string;
  parentMessageId: string | null;
};

type SpaceMentionEventPayload = {
  mention: {
    id: string;
    workspaceId: string;
    roomId: string;
    messageId: string;
    actorUserId: string;
    actorName: string;
    title: string;
    summary: string;
    route: string;
    createdAt: string;
  };
};

let spacesSocket: Socket | null = null;

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

const getSpacesSocket = () => {
  if (spacesSocket) {
    spacesSocket.auth = {
      token: getSocketToken(),
    };
    return spacesSocket;
  }

  const socketBaseUrl = resolveSocketBaseUrl();
  spacesSocket = io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      token: getSocketToken(),
    },
  });

  return spacesSocket;
};

const subscribeSpaceRoom = ({
  workspaceId,
  roomId,
}: {
  workspaceId: string;
  roomId: string;
}) => {
  const socket = getSpacesSocket();

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("spaces:room:subscribe", {
    workspaceId,
    roomId,
  });

  return socket;
};

const subscribeWorkspaceSpaces = ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const socket = getSpacesSocket();

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("spaces:workspace:subscribe", {
    workspaceId,
  });

  return socket;
};

const unsubscribeSpaceRoom = ({
  workspaceId,
  roomId,
}: {
  workspaceId: string;
  roomId: string;
}) => {
  if (!spacesSocket) {
    return;
  }

  spacesSocket.emit("spaces:room:unsubscribe", {
    workspaceId,
    roomId,
  });
};

const unsubscribeWorkspaceSpaces = ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  if (!spacesSocket) {
    return;
  }

  spacesSocket.emit("spaces:workspace:unsubscribe", {
    workspaceId,
  });
};

export type {
  SpaceMessageEventPayload,
  SpaceMessageDeletedEventPayload,
  SpaceMentionEventPayload,
};
export {
  getSpacesSocket,
  subscribeWorkspaceSpaces,
  subscribeSpaceRoom,
  unsubscribeWorkspaceSpaces,
  unsubscribeSpaceRoom,
};
