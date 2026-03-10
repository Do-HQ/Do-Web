"use client";

import { io, Socket } from "socket.io-client";
import config from "@/config";
import { LOCAL_KEYS } from "@/utils/constants";

type TeamCallParticipantState = {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
};

type TeamCallParticipant = {
  userId: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  role?: string;
} & TeamCallParticipantState;

type TeamCallSignalPayload = {
  type: "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type TeamCallChatMessagePayload = {
  id: string;
  authorUserId: string;
  authorName: string;
  content: string;
  sentAt: string;
};

type TeamCallJoinAck = {
  ok: boolean;
  message?: string;
  participants?: TeamCallParticipant[];
};

type TeamCallJoinPayload = {
  workspaceId: string;
  roomId: string;
  profile: {
    name: string;
    initials: string;
    avatarUrl?: string;
    role?: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
  };
};

type TeamCallChatSendAck = {
  ok: boolean;
  message?: string;
  payload?: TeamCallChatMessagePayload;
};

let teamCallSocket: Socket | null = null;

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

const getTeamCallSocket = () => {
  if (teamCallSocket) {
    teamCallSocket.auth = {
      token: getSocketToken(),
    };
    return teamCallSocket;
  }

  const socketBaseUrl = resolveSocketBaseUrl();
  teamCallSocket = io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      token: getSocketToken(),
    },
  });

  return teamCallSocket;
};

const ensureTeamCallSocketConnection = () => {
  const socket = getTeamCallSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

const joinTeamCallRoom = (payload: TeamCallJoinPayload) => {
  const socket = ensureTeamCallSocketConnection();

  return new Promise<TeamCallJoinAck>((resolve) => {
    socket.emit("team-call:join", payload, (response: TeamCallJoinAck) => {
      resolve(response);
    });
  });
};

const leaveTeamCallRoom = () => {
  if (!teamCallSocket) {
    return;
  }

  teamCallSocket.emit("team-call:leave", () => {});
};

const sendTeamCallSignal = (payload: {
  workspaceId: string;
  roomId: string;
  targetUserId: string;
  signal: TeamCallSignalPayload;
}) => {
  if (!teamCallSocket) {
    return;
  }

  teamCallSocket.emit("team-call:signal", payload, () => {});
};

const updateTeamCallParticipantState = (payload: {
  workspaceId: string;
  roomId: string;
  state: TeamCallParticipantState;
}) => {
  if (!teamCallSocket) {
    return;
  }

  teamCallSocket.emit("team-call:state:update", payload, () => {});
};

const sendTeamCallChatMessage = (payload: {
  workspaceId: string;
  roomId: string;
  content: string;
}) => {
  if (!teamCallSocket) {
    return Promise.resolve<TeamCallChatSendAck>({
      ok: false,
      message: "Socket is unavailable",
    });
  }

  return new Promise<TeamCallChatSendAck>((resolve) => {
    teamCallSocket?.emit("team-call:chat:send", payload, (response: TeamCallChatSendAck) => {
      resolve(response);
    });
  });
};

const disconnectTeamCallSocket = () => {
  if (!teamCallSocket) {
    return;
  }

  teamCallSocket.disconnect();
};

export type {
  TeamCallParticipant,
  TeamCallParticipantState,
  TeamCallSignalPayload,
  TeamCallChatMessagePayload,
};
export {
  getTeamCallSocket,
  ensureTeamCallSocketConnection,
  joinTeamCallRoom,
  leaveTeamCallRoom,
  sendTeamCallSignal,
  updateTeamCallParticipantState,
  sendTeamCallChatMessage,
  disconnectTeamCallSocket,
};
