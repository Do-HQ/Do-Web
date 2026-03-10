"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  LayoutGrid,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorUp,
  PanelRightClose,
  PanelRightOpen,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  disconnectTeamCallSocket,
  getTeamCallSocket,
  joinTeamCallRoom,
  leaveTeamCallRoom,
  sendTeamCallChatMessage,
  sendTeamCallSignal,
  updateTeamCallParticipantState,
} from "@/lib/realtime/team-call-socket";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import CallPanel from "./components/call-panel";
import type {
  CallChatMessage,
  MinimizedTeamCall,
  PanelTab,
  Participant,
} from "./types";
import {
  formatDuration,
  getInitials,
  stopMediaStream,
  TEAM_CALL_WIDGET_KEY,
} from "./utils";

const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];

const formatChatTime = (isoValue: string) => {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "now";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const shouldInitiatePeer = (localUserId: string, remoteUserId: string) =>
  localUserId.localeCompare(remoteUserId) > 0;

const TeamCallPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();

  const roomId = String(searchParams.get("roomId") || "").trim();
  const roomName = searchParams.get("room") || "Team Call";
  const roomScope = searchParams.get("scope") || "team";
  const callModeParam = String(searchParams.get("callMode") || "video").trim();
  const callMode: "voice" | "video" =
    callModeParam === "voice" ? "voice" : "video";
  const startedAtParamRaw = searchParams.get("startedAt");
  const startedAtParam = startedAtParamRaw ? Number(startedAtParamRaw) : NaN;
  const resolvedWorkspaceId =
    workspaceId || String(user?.currentWorkspaceId?._id || "").trim();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(callMode === "video");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isGridView, setIsGridView] = useState(false);

  const [isPanelOpenDesktop, setIsPanelOpenDesktop] = useState(true);
  const [isPanelSheetOpen, setIsPanelSheetOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>("people");

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [callNote, setCallNote] = useState("");
  const [callMessages, setCallMessages] = useState<CallChatMessage[]>([]);

  const [remoteParticipantsMap, setRemoteParticipantsMap] = useState<
    Record<string, Participant>
  >({});

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localPreviewRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const socketRef = useRef<ReturnType<typeof getTeamCallSocket> | null>(null);

  const currentUserId = String(user?._id || "").trim();
  const currentUserName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "You";

  const localParticipant = useMemo<Participant>(
    () => ({
      id: currentUserId || "you",
      name: currentUserName,
      initials: getInitials(currentUserName),
      avatarUrl: user?.profilePhoto?.url,
      role: "Host",
      isMuted: !isMicOn,
      isVideoOn,
      isScreenSharing: Boolean(screenStream),
      stream: localStream,
    }),
    [
      currentUserId,
      currentUserName,
      isMicOn,
      isVideoOn,
      localStream,
      screenStream,
      user?.profilePhoto?.url,
    ],
  );

  const participants = useMemo<Participant[]>(() => {
    const remoteParticipants = Object.values(remoteParticipantsMap).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return [localParticipant, ...remoteParticipants];
  }, [localParticipant, remoteParticipantsMap]);

  const featuredParticipant = participants[0] || localParticipant;
  const tileParticipants = participants.slice(1);
  const isScreenSharing = Boolean(screenStream);
  const resolvedMediaError = roomId
    ? mediaError
    : "Missing call room context. Start the call from a chat room.";

  const upsertRemoteParticipant = useCallback(
    (userId: string, patch: Partial<Participant>) => {
      if (!userId || userId === currentUserId) {
        return;
      }

      setRemoteParticipantsMap((prev) => {
        const existing = prev[userId];

        const nextParticipant: Participant = {
          id: userId,
          name: existing?.name || "Member",
          initials: existing?.initials || getInitials(existing?.name || "Member"),
          avatarUrl: existing?.avatarUrl,
          role: existing?.role || "Member",
          isMuted: existing?.isMuted ?? true,
          isVideoOn: existing?.isVideoOn ?? false,
          isScreenSharing: existing?.isScreenSharing ?? false,
          stream: existing?.stream || null,
          ...patch,
        };

        return {
          ...prev,
          [userId]: nextParticipant,
        };
      });
    },
    [currentUserId],
  );

  const removeRemoteParticipant = useCallback((userId: string) => {
    setRemoteParticipantsMap((prev) => {
      if (!prev[userId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const closePeerConnection = useCallback((targetUserId: string) => {
    const existing = peerConnectionsRef.current.get(targetUserId);
    if (existing) {
      existing.onicecandidate = null;
      existing.ontrack = null;
      existing.onconnectionstatechange = null;
      existing.close();
      peerConnectionsRef.current.delete(targetUserId);
    }

    const existingRemoteStream = remoteStreamsRef.current.get(targetUserId);
    if (existingRemoteStream) {
      stopMediaStream(existingRemoteStream);
      remoteStreamsRef.current.delete(targetUserId);
    }
  }, []);

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const existing = peerConnectionsRef.current.get(targetUserId);
      if (existing) {
        return existing;
      }

      const connection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      const currentAudioTracks = localStreamRef.current?.getAudioTracks() || [];
      currentAudioTracks.forEach((track) => {
        connection.addTrack(track, localStreamRef.current as MediaStream);
      });

      const currentVideoTrack =
        screenStreamRef.current?.getVideoTracks()?.[0] ||
        localStreamRef.current?.getVideoTracks()?.[0];

      if (currentVideoTrack) {
        const videoCarrierStream =
          screenStreamRef.current || localStreamRef.current || new MediaStream([currentVideoTrack]);
        connection.addTrack(currentVideoTrack, videoCarrierStream);
      }

      connection.onicecandidate = (event) => {
        if (!event.candidate || !resolvedWorkspaceId || !roomId) {
          return;
        }

        sendTeamCallSignal({
          workspaceId: resolvedWorkspaceId,
          roomId,
          targetUserId,
          signal: {
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
          },
        });
      };

      connection.ontrack = (event) => {
        const [incomingStream] = event.streams;
        if (!incomingStream) {
          return;
        }

        remoteStreamsRef.current.set(targetUserId, incomingStream);
        upsertRemoteParticipant(targetUserId, {
          stream: incomingStream,
          isVideoOn: incomingStream.getVideoTracks().length > 0,
        });
      };

      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        if (["failed", "closed", "disconnected"].includes(state)) {
          closePeerConnection(targetUserId);
        }
      };

      peerConnectionsRef.current.set(targetUserId, connection);
      return connection;
    },
    [closePeerConnection, resolvedWorkspaceId, roomId, upsertRemoteParticipant],
  );

  const applyLocalTracksToPeers = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()?.[0] || null;
    const videoTrack =
      screenStreamRef.current?.getVideoTracks()?.[0] ||
      localStreamRef.current?.getVideoTracks()?.[0] ||
      null;

    peerConnectionsRef.current.forEach((connection) => {
      const senders = connection.getSenders();
      const audioSender = senders.find((sender) => sender.track?.kind === "audio");
      const videoSender = senders.find((sender) => sender.track?.kind === "video");

      if (audioSender && audioSender.track !== audioTrack) {
        void audioSender.replaceTrack(audioTrack);
      } else if (!audioSender && audioTrack && localStreamRef.current) {
        connection.addTrack(audioTrack, localStreamRef.current);
      }

      if (videoSender && videoSender.track !== videoTrack) {
        void videoSender.replaceTrack(videoTrack);
      } else if (!videoSender && videoTrack) {
        const videoCarrier =
          screenStreamRef.current || localStreamRef.current || new MediaStream([videoTrack]);
        connection.addTrack(videoTrack, videoCarrier);
      }
    });
  }, []);

  const createOfferToParticipant = useCallback(
    async (targetUserId: string) => {
      if (!resolvedWorkspaceId || !roomId || !targetUserId || targetUserId === currentUserId) {
        return;
      }

      const connection = createPeerConnection(targetUserId);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      sendTeamCallSignal({
        workspaceId: resolvedWorkspaceId,
        roomId,
        targetUserId,
        signal: {
          type: "offer",
          sdp: connection.localDescription?.toJSON() || offer,
        },
      });
    },
    [createPeerConnection, currentUserId, resolvedWorkspaceId, roomId],
  );

  const handleIncomingSignal = useCallback(
    async (payload: {
      workspaceId: string;
      roomId: string;
      fromUserId: string;
      signal: {
        type: "offer" | "answer" | "ice-candidate";
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }) => {
      if (
        !payload ||
        String(payload.workspaceId) !== String(resolvedWorkspaceId) ||
        String(payload.roomId) !== String(roomId)
      ) {
        return;
      }

      const fromUserId = String(payload.fromUserId || "").trim();
      if (!fromUserId || fromUserId === currentUserId) {
        return;
      }

      const signal = payload.signal;
      if (!signal) {
        return;
      }

      const connection = createPeerConnection(fromUserId);

      if (signal.type === "offer" && signal.sdp) {
        await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        sendTeamCallSignal({
          workspaceId: resolvedWorkspaceId,
          roomId,
          targetUserId: fromUserId,
          signal: {
            type: "answer",
            sdp: connection.localDescription?.toJSON() || answer,
          },
        });
        return;
      }

      if (signal.type === "answer" && signal.sdp) {
        await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        return;
      }

      if (signal.type === "ice-candidate" && signal.candidate) {
        await connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    },
    [createPeerConnection, currentUserId, resolvedWorkspaceId, roomId],
  );

  const cleanupCallConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => {
      connection.onicecandidate = null;
      connection.ontrack = null;
      connection.onconnectionstatechange = null;
      connection.close();
    });
    peerConnectionsRef.current.clear();

    remoteStreamsRef.current.forEach((stream) => {
      stopMediaStream(stream);
    });
    remoteStreamsRef.current.clear();
    setRemoteParticipantsMap({});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(startedAtParam) || startedAtParam <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDurationSeconds(Math.max(0, Math.floor((Date.now() - startedAtParam) / 1000)));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [startedAtParam]);

  useEffect(() => {
    if (!localVideoRef.current) {
      return;
    }

    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!localPreviewRef.current) {
      return;
    }

    localPreviewRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!screenVideoRef.current) {
      return;
    }

    screenVideoRef.current.srcObject = screenStream;
  }, [screenStream]);

  useEffect(() => {
    localStreamRef.current = localStream;
    applyLocalTracksToPeers();
  }, [applyLocalTracksToPeers, localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
    applyLocalTracksToPeers();
  }, [applyLocalTracksToPeers, screenStream]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
  }, []);

  const initLocalMedia = useCallback(async (preferVideo: boolean) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMediaError("Camera and microphone are not supported in this browser.");
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: preferVideo,
        audio: true,
      });

      setLocalStream((prev) => {
        if (prev && prev !== stream) {
          stopMediaStream(prev);
        }

        return stream;
      });
      setMediaError(null);
      return stream;
    } catch {
      setMediaError("Camera or microphone permission is unavailable.");
      return null;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initLocalMedia(isVideoOn);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initLocalMedia, isVideoOn]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = isMicOn;
    });
  }, [isMicOn, localStream]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = isVideoOn;
    });
  }, [isVideoOn, localStream]);

  useEffect(() => {
    if (!resolvedWorkspaceId || !roomId || !currentUserId) {
      return;
    }

    const socket = getTeamCallSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    const handleUserJoined = (payload: {
      workspaceId: string;
      roomId: string;
      participant: {
        userId: string;
        name: string;
        initials: string;
        avatarUrl?: string;
        role?: string;
        isMuted: boolean;
        isVideoOn: boolean;
        isScreenSharing: boolean;
      };
    }) => {
      if (
        String(payload.workspaceId) !== String(resolvedWorkspaceId) ||
        String(payload.roomId) !== String(roomId)
      ) {
        return;
      }

      const participant = payload.participant;
      if (!participant?.userId || participant.userId === currentUserId) {
        return;
      }

      upsertRemoteParticipant(participant.userId, {
        id: participant.userId,
        name: participant.name,
        initials: participant.initials,
        avatarUrl: participant.avatarUrl,
        role: participant.role || "Member",
        isMuted: participant.isMuted,
        isVideoOn: participant.isVideoOn,
        isScreenSharing: participant.isScreenSharing,
      });

      if (shouldInitiatePeer(currentUserId, participant.userId)) {
        void createOfferToParticipant(participant.userId);
      }
    };

    const handleUserLeft = (payload: {
      workspaceId: string;
      roomId: string;
      userId: string;
    }) => {
      if (
        String(payload.workspaceId) !== String(resolvedWorkspaceId) ||
        String(payload.roomId) !== String(roomId)
      ) {
        return;
      }

      const targetUserId = String(payload.userId || "").trim();
      if (!targetUserId || targetUserId === currentUserId) {
        return;
      }

      closePeerConnection(targetUserId);
      removeRemoteParticipant(targetUserId);
    };

    const handleUserState = (payload: {
      workspaceId: string;
      roomId: string;
      userId: string;
      state: {
        isMuted: boolean;
        isVideoOn: boolean;
        isScreenSharing: boolean;
      };
    }) => {
      if (
        String(payload.workspaceId) !== String(resolvedWorkspaceId) ||
        String(payload.roomId) !== String(roomId)
      ) {
        return;
      }

      const participantUserId = String(payload.userId || "").trim();
      if (!participantUserId || participantUserId === currentUserId) {
        return;
      }

      upsertRemoteParticipant(participantUserId, {
        isMuted: Boolean(payload.state?.isMuted),
        isVideoOn: Boolean(payload.state?.isVideoOn),
        isScreenSharing: Boolean(payload.state?.isScreenSharing),
      });
    };

    const handleSignal = (payload: {
      workspaceId: string;
      roomId: string;
      fromUserId: string;
      signal: {
        type: "offer" | "answer" | "ice-candidate";
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }) => {
      void handleIncomingSignal(payload);
    };

    const handleChatMessage = (payload: {
      workspaceId: string;
      roomId: string;
      message: {
        id: string;
        authorUserId: string;
        authorName: string;
        content: string;
        sentAt: string;
      };
    }) => {
      if (
        String(payload.workspaceId) !== String(resolvedWorkspaceId) ||
        String(payload.roomId) !== String(roomId)
      ) {
        return;
      }

      const message = payload.message;
      if (!message?.id) {
        return;
      }

      setCallMessages((prev) => {
        if (prev.some((entry) => entry.id === message.id)) {
          return prev;
        }

        return [
          ...prev,
          {
            id: message.id,
            authorUserId: message.authorUserId,
            author: message.authorName,
            content: message.content,
            sentAt: formatChatTime(message.sentAt),
          },
        ];
      });
    };

    socket.on("team-call:user-joined", handleUserJoined);
    socket.on("team-call:user-left", handleUserLeft);
    socket.on("team-call:user-state", handleUserState);
    socket.on("team-call:signal", handleSignal);
    socket.on("team-call:chat:new", handleChatMessage);

    void joinTeamCallRoom({
      workspaceId: resolvedWorkspaceId,
      roomId,
      profile: {
        name: currentUserName,
        initials: getInitials(currentUserName),
        avatarUrl: user?.profilePhoto?.url,
        role: "Host",
        isMuted: false,
        isVideoOn: callMode === "video",
        isScreenSharing: false,
      },
    }).then((response) => {
      if (!response?.ok) {
        setMediaError(response?.message || "Unable to join call room.");
        return;
      }

      const participantsFromServer = Array.isArray(response.participants)
        ? response.participants
        : [];
      const remoteOnly = participantsFromServer.filter(
        (participant) => String(participant.userId || "") !== currentUserId,
      );

      setRemoteParticipantsMap((prev) => {
        const next = { ...prev };

        remoteOnly.forEach((participant) => {
          const remoteUserId = String(participant.userId || "").trim();
          if (!remoteUserId) {
            return;
          }

          next[remoteUserId] = {
            id: remoteUserId,
            name: participant.name,
            initials: participant.initials,
            avatarUrl: participant.avatarUrl,
            role: participant.role || "Member",
            isMuted: participant.isMuted,
            isVideoOn: participant.isVideoOn,
            isScreenSharing: participant.isScreenSharing,
            stream: prev[remoteUserId]?.stream || null,
          };
        });

        return next;
      });

      remoteOnly.forEach((participant) => {
        const remoteUserId = String(participant.userId || "").trim();
        if (!remoteUserId) {
          return;
        }

        if (shouldInitiatePeer(currentUserId, remoteUserId)) {
          void createOfferToParticipant(remoteUserId);
        }
      });
    });

    return () => {
      socket.off("team-call:user-joined", handleUserJoined);
      socket.off("team-call:user-left", handleUserLeft);
      socket.off("team-call:user-state", handleUserState);
      socket.off("team-call:signal", handleSignal);
      socket.off("team-call:chat:new", handleChatMessage);
      leaveTeamCallRoom();
    };
  }, [
    closePeerConnection,
    createOfferToParticipant,
    currentUserId,
    currentUserName,
    callMode,
    handleIncomingSignal,
    removeRemoteParticipant,
    resolvedWorkspaceId,
    roomId,
    upsertRemoteParticipant,
    user?.profilePhoto?.url,
  ]);

  useEffect(() => {
    if (!resolvedWorkspaceId || !roomId || !currentUserId) {
      return;
    }

    updateTeamCallParticipantState({
      workspaceId: resolvedWorkspaceId,
      roomId,
      state: {
        isMuted: !isMicOn,
        isVideoOn,
        isScreenSharing,
      },
    });
  }, [currentUserId, isMicOn, isScreenSharing, isVideoOn, resolvedWorkspaceId, roomId]);

  useEffect(() => {
    return () => {
      leaveTeamCallRoom();
      disconnectTeamCallSocket();
      cleanupCallConnections();
      stopMediaStream(localStreamRef.current);
      stopMediaStream(screenStreamRef.current);
    };
  }, [cleanupCallConnections]);

  const handleToggleMic = async () => {
    if (!isMicOn && !localStream) {
      const stream = await initLocalMedia(isVideoOn);
      if (!stream) {
        return;
      }
    }

    setIsMicOn((prev) => !prev);
  };

  const handleToggleVideo = async () => {
    if (!isVideoOn && !localStream) {
      const stream = await initLocalMedia(true);
      if (!stream) {
        return;
      }
    }

    setIsVideoOn((prev) => !prev);
  };

  const handleToggleScreenShare = async () => {
    if (screenStream) {
      setScreenStream((current) => {
        if (!current) {
          return current;
        }

        current.getVideoTracks().forEach((track) => {
          track.onended = null;
        });
        stopMediaStream(current);
        return null;
      });
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {
      setMediaError("Screen sharing is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          setScreenStream((current) => {
            if (current !== stream) {
              return current;
            }

            stopMediaStream(stream);
            return null;
          });
        };
      }

      setScreenStream((prev) => {
        prev?.getVideoTracks().forEach((track) => {
          track.onended = null;
        });
        stopMediaStream(prev);
        return stream;
      });
      setMediaError(null);
    } catch {
      setMediaError("Screen share permission was denied.");
    }
  };

  const persistMinimizedCall = () => {
    if (typeof window === "undefined") {
      return;
    }

    const startedAt = Date.now() - durationSeconds * 1000;
    const payload: MinimizedTeamCall = {
      roomId,
      roomName,
      roomScope,
      callMode,
      startedAt,
      isMuted: !isMicOn,
      isVideoOn,
      isScreenSharing,
    };

    window.sessionStorage.setItem(TEAM_CALL_WIDGET_KEY, JSON.stringify(payload));
  };

  const handleLeaveToSpaces = () => {
    persistMinimizedCall();
    leaveTeamCallRoom();
    disconnectTeamCallSocket();
    cleanupCallConnections();
    stopMediaStream(localStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    router.push(ROUTES.SPACES);
  };

  const endCall = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
    }

    leaveTeamCallRoom();
    disconnectTeamCallSocket();
    cleanupCallConnections();
    stopMediaStream(localStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    router.push(ROUTES.SPACES);
  };

  const sendCallMessage = async () => {
    const message = chatInput.trim();
    if (!message || !resolvedWorkspaceId || !roomId) {
      return;
    }

    setChatInput("");

    await sendTeamCallChatMessage({
      workspaceId: resolvedWorkspaceId,
      roomId,
      content: message,
    });
  };

  const renderAudioMeter = (participantId: string, muted: boolean) => {
    const activitySeed = (durationSeconds + participantId.length * 7) % 3;

    return (
      <div className="inline-flex items-end gap-[2px]">
        {[0, 1, 2].map((index) => (
          <span
            key={`${participantId}-${index}`}
            className={cn(
              "w-[2px] rounded-full transition-all",
              muted
                ? "h-[5px] bg-muted-foreground/30"
                : "bg-emerald-400/85 animate-pulse",
            )}
            style={{
              height: muted
                ? 5
                : index === activitySeed
                  ? 10
                  : index === (activitySeed + 1) % 3
                    ? 8
                    : 6,
              animationDelay: `${index * 120}ms`,
            }}
          />
        ))}
      </div>
    );
  };

  const renderParticipantTile = (participant: Participant, compact = false) => {
    const hasVideo = Boolean(
      participant.isVideoOn && participant.stream?.getVideoTracks()?.length,
    );

    return (
      <article
        key={participant.id}
        className={cn(
          "relative min-h-0 overflow-hidden rounded-md border bg-muted/30",
          compact && "w-[7rem] shrink-0",
        )}
      >
        {hasVideo ? (
          <video
            autoPlay
            playsInline
            muted={participant.id === currentUserId}
            ref={(node) => {
              if (!node || !participant.stream) {
                return;
              }

              if (node.srcObject !== participant.stream) {
                node.srcObject = participant.stream;
              }
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Avatar
              size="sm"
              userCard={{
                name: participant.name,
                role: participant.role ?? "Member",
                status: participant.isMuted ? "Muted" : "Live",
              }}
            >
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback className="text-[11px]">
                {participant.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <div className="absolute right-1 bottom-1 left-1 flex items-center gap-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-white">
          <p className="truncate text-[11px]">{participant.name}</p>
          <span className="ml-auto inline-flex items-center gap-1">
            {participant.isMuted ? (
              <MicOff className="size-2.5" />
            ) : (
              <Mic className="size-2.5" />
            )}
            {renderAudioMeter(participant.id, participant.isMuted)}
          </span>
        </div>
      </article>
    );
  };

  const renderGridView = () => {
    return (
      <div className="grid h-full min-h-0 grid-cols-2 gap-1.5 overflow-hidden sm:grid-cols-3 lg:grid-cols-4">
        {isScreenSharing && (
          <article className="relative min-h-0 overflow-hidden rounded-md border bg-black/85 sm:col-span-2">
            {screenStream ? (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center">
                <p className="text-[12px] text-white/85">Screen share is live</p>
              </div>
            )}
            <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-[11px] text-white">
              <MonitorUp className="size-3.5" />
              Shared screen
            </div>
          </article>
        )}

        {[featuredParticipant, ...tileParticipants].map((participant) =>
          renderParticipantTile(participant),
        )}
      </div>
    );
  };

  const renderSpeakerView = () => {
    return (
      <div
        className={cn(
          "grid h-full min-h-0 gap-1.5 overflow-hidden",
          isScreenSharing
            ? "grid-rows-[minmax(0,1fr)_4.75rem] sm:grid-rows-[minmax(0,1fr)_6.75rem]"
            : "grid-rows-[minmax(0,1fr)_4.25rem] sm:grid-rows-[minmax(0,1fr)_6.25rem]",
        )}
      >
        <article className="relative min-h-0 overflow-hidden rounded-md border bg-gradient-to-br from-black/90 via-black/78 to-black/90">
          {isScreenSharing ? (
            <>
              {screenStream ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                  <p className="text-[12px] font-medium text-white/90">
                    Sharing is live. Waiting for screen preview.
                  </p>
                </div>
              )}

              <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm border border-white/20 bg-black/45 px-1.5 py-0.5 text-[11px] text-white">
                <MonitorUp className="size-3.5" />
                Screen share live
              </div>
            </>
          ) : isVideoOn && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar
                size="lg"
                userCard={{
                  name: featuredParticipant.name,
                  role: featuredParticipant.role ?? "Member",
                  status: featuredParticipant.isMuted ? "Muted" : "Live",
                }}
              >
                <AvatarImage
                  src={featuredParticipant.avatarUrl}
                  alt={featuredParticipant.name}
                />
                <AvatarFallback>{featuredParticipant.initials}</AvatarFallback>
              </Avatar>
            </div>
          )}

          {isScreenSharing && isVideoOn && localStream && (
            <div className="absolute right-2 bottom-8 h-16 w-[6.5rem] overflow-hidden rounded-sm border border-white/25 bg-black/30 shadow-lg">
              <video
                ref={localPreviewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="absolute right-2 bottom-2 left-2 flex items-center gap-1 rounded-sm bg-black/45 px-2 py-1 text-white">
            <p className="truncate text-[12px] font-medium">{featuredParticipant.name}</p>
            {featuredParticipant.role && (
              <span className="text-[11px] text-white/70">{featuredParticipant.role}</span>
            )}

            <span className="ml-auto inline-flex items-center gap-1 text-[11px]">
              {featuredParticipant.isMuted ? (
                <MicOff className="size-3.5" />
              ) : (
                <Mic className="size-3.5" />
              )}
              {featuredParticipant.isVideoOn ? (
                <Video className="size-3.5" />
              ) : (
                <VideoOff className="size-3.5" />
              )}
            </span>
          </div>
        </article>

        <div className="flex min-h-0 gap-1.5 overflow-x-auto pb-0.5">
          {tileParticipants.map((participant) => renderParticipantTile(participant, true))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-1 gap-0 overflow-hidden overscroll-none sm:gap-2.5">
        <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-x-0 border-b-0 bg-card sm:rounded-md sm:border-x sm:border-b">
          <div className="shrink-0 border-b px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 px-2.5 text-[13px]"
                onClick={handleLeaveToSpaces}
              >
                <ArrowLeft className="size-4" />
                <span className="hidden min-[420px]:inline">Back to Spaces</span>
              </Button>

              <p className="max-w-[8.5rem] shrink-0 truncate text-[13px] font-semibold sm:max-w-none">
                {roomName}
              </p>
              <Badge
                variant="outline"
                className="hidden shrink-0 text-[11px] capitalize min-[430px]:inline-flex"
              >
                {roomScope}
              </Badge>
              <Badge variant="secondary" className="shrink-0 text-[11px]">
                Live {formatDuration(durationSeconds)}
              </Badge>

              <Badge
                variant={localStream ? "outline" : "secondary"}
                className="hidden shrink-0 text-[11px] sm:inline-flex"
              >
                {localStream ? "Connected" : "Limited media"}
              </Badge>

              <Badge
                variant="outline"
                className="hidden shrink-0 text-[11px] md:inline-flex"
              >
                {participants.length} in call
              </Badge>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 px-2.5 text-[13px] lg:ml-auto lg:hidden"
                onClick={() => setIsPanelSheetOpen(true)}
              >
                <MessageSquare className="size-4" />
                Panel
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="hidden h-8 shrink-0 px-2.5 text-[13px] lg:flex"
                onClick={() => setIsPanelOpenDesktop((prev) => !prev)}
              >
                {isPanelOpenDesktop ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
                Panel
              </Button>
            </div>

            {resolvedMediaError && (
              <p className="text-destructive mt-1.5 text-[12px]">{resolvedMediaError}</p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2.5">
            {isGridView ? renderGridView() : renderSpeakerView()}
          </div>

          <div className="shrink-0 border-t bg-card/95 px-2.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-3 sm:py-2.5">
            <div className="overflow-x-auto">
              <div className="mx-auto flex w-max min-w-full items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant={isMicOn ? "secondary" : "destructive"}
                  className="h-9 px-2.5 text-[13px]"
                  onClick={handleToggleMic}
                >
                  {isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                  {isMicOn ? "Mic" : "Muted"}
                </Button>

                <Button
                  size="sm"
                  variant={isVideoOn ? "secondary" : "destructive"}
                  className="h-9 px-2.5 text-[13px]"
                  onClick={handleToggleVideo}
                >
                  {isVideoOn ? (
                    <Video className="size-4" />
                  ) : (
                    <VideoOff className="size-4" />
                  )}
                  {isVideoOn ? "Camera" : "Camera Off"}
                </Button>

                <Button
                  size="sm"
                  variant={isScreenSharing ? "default" : "secondary"}
                  className="h-9 px-2.5 text-[13px]"
                  onClick={handleToggleScreenShare}
                >
                  {isScreenSharing ? (
                    <MonitorUp className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                  {isScreenSharing ? "Stop Share" : "Share Screen"}
                </Button>

                <Button
                  size="sm"
                  variant={isSpeakerOn ? "secondary" : "destructive"}
                  className="h-9 px-2.5 text-[13px]"
                  onClick={() => setIsSpeakerOn((prev) => !prev)}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeX className="size-4" />
                  )}
                  {isSpeakerOn ? "Speaker" : "Speaker Off"}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 px-2.5 text-[13px]"
                  onClick={() => setIsGridView((prev) => !prev)}
                >
                  <LayoutGrid className="size-4" />
                  {isGridView ? "Speaker" : "Grid"}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 px-2.5 text-[13px] lg:hidden"
                  onClick={() => setIsPanelSheetOpen(true)}
                >
                  <Users className="size-4" />
                  People
                </Button>

                <Button
                  size="sm"
                  className="h-9 bg-destructive/85 px-2.5 text-[13px] text-white hover:bg-destructive"
                  onClick={endCall}
                >
                  <PhoneOff className="size-4" />
                  End
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div
          className={cn(
            "hidden min-h-0 overflow-hidden transition-[width,opacity] duration-300 ease-out lg:flex",
            isPanelOpenDesktop ? "w-[18.5rem] opacity-100" : "w-0 opacity-0",
          )}
        >
          {isPanelOpenDesktop && (
            <aside className="min-h-0 w-[18.5rem] overflow-hidden rounded-md border">
              <CallPanel
                participants={participants}
                activePanelTab={activePanelTab}
                callNote={callNote}
                chatInput={chatInput}
                callMessages={callMessages}
                onActivePanelTabChange={setActivePanelTab}
                onCallNoteChange={setCallNote}
                onChatInputChange={setChatInput}
                onSendCallMessage={() => {
                  void sendCallMessage();
                }}
                renderAudioMeter={renderAudioMeter}
              />
            </aside>
          )}
        </div>
      </div>

      <Sheet open={isPanelSheetOpen} onOpenChange={setIsPanelSheetOpen}>
        <SheetContent side="right" className="w-full max-w-none p-0 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Call Panel</SheetTitle>
            <SheetDescription>In-call collaboration panel.</SheetDescription>
          </SheetHeader>
          <CallPanel
            mobile
            participants={participants}
            activePanelTab={activePanelTab}
            callNote={callNote}
            chatInput={chatInput}
            callMessages={callMessages}
            onActivePanelTabChange={setActivePanelTab}
            onCallNoteChange={setCallNote}
            onChatInputChange={setChatInput}
            onSendCallMessage={() => {
              void sendCallMessage();
            }}
            onCloseMobile={() => setIsPanelSheetOpen(false)}
            renderAudioMeter={renderAudioMeter}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TeamCallPage;
