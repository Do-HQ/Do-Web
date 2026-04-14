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
  UserPlus,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  saveTeamCallNote,
  sendTeamCallChatMessage,
  sendTeamCallSignal,
  updateTeamCallParticipantState,
} from "@/lib/realtime/team-call-socket";
import { getSpacesSocket } from "@/lib/realtime/spaces-socket";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceSpace from "@/hooks/use-workspace-space";
import LoaderComponent from "@/components/shared/loader";
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

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
  sampleSize: { ideal: 16 },
};

const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: "user",
};

const SCREEN_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920, max: 2560 },
  height: { ideal: 1080, max: 1440 },
  frameRate: { ideal: 24, max: 30 },
};

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

const buildTeamCallRoute = ({
  roomId,
  roomName,
  roomScope,
  roomKind,
  directUserId,
  callMode,
  startedAt,
}: {
  roomId: string;
  roomName: string;
  roomScope: string;
  roomKind?: "direct" | "group" | "project" | "task";
  directUserId?: string;
  callMode: "voice" | "video";
  startedAt: number;
}) => {
  const query = new URLSearchParams({
    roomId: String(roomId || ""),
    room: String(roomName || "Team Call"),
    scope: String(roomScope || "team"),
    roomKind: String(roomKind || "group"),
    callMode: callMode === "voice" ? "voice" : "video",
    startedAt: String(startedAt || Date.now()),
  });

  const normalizedDirectUserId = String(directUserId || "").trim();
  if (normalizedDirectUserId) {
    query.set("directUserId", normalizedDirectUserId);
  }

  return `${ROUTES.SPACES_TEAM_CALL}?${query.toString()}`;
};

const mentionSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const setTrackContentHint = (
  track: MediaStreamTrack,
  hint: "speech" | "motion" | "detail",
) => {
  if (!("contentHint" in track)) {
    return;
  }

  try {
    track.contentHint = hint;
  } catch {
    // Some browsers ignore unsupported hints silently.
  }
};

const looksLikeObjectId = (value = "") =>
  /^[a-f0-9]{24}$/i.test(String(value || "").trim());

const tuneAudioSenderQuality = async (sender: RTCRtpSender) => {
  if (sender.track?.kind !== "audio") {
    return;
  }

  if (!sender.getParameters || !sender.setParameters) {
    return;
  }

  try {
    const params = sender.getParameters();
    const encodings =
      Array.isArray(params.encodings) && params.encodings.length > 0
        ? params.encodings
        : [{}];

    const nextParams: RTCRtpSendParameters = {
      ...params,
      encodings: encodings.map((encoding) => ({
        ...encoding,
        maxBitrate: 96000,
      })),
    };

    await sender.setParameters(nextParams);
  } catch {
    // Browsers may reject unsupported sender parameters.
  }
};

const TeamCallPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();

  const roomId = String(searchParams.get("roomId") || "").trim();
  const roomName = searchParams.get("room") || "Team Call";
  const roomScope = searchParams.get("scope") || "team";
  const roomKindParamRaw = String(searchParams.get("roomKind") || "").trim();
  const roomKind: "direct" | "group" | "project" | "task" =
    roomKindParamRaw === "direct" ||
    roomKindParamRaw === "project" ||
    roomKindParamRaw === "task"
      ? roomKindParamRaw
      : "group";
  const directUserIdParamRaw = String(
    searchParams.get("directUserId") || "",
  ).trim();
  const directUserIdFromQuery = looksLikeObjectId(directUserIdParamRaw)
    ? directUserIdParamRaw
    : "";
  const callModeParam = String(searchParams.get("callMode") || "video").trim();
  const callMode: "voice" | "video" =
    callModeParam === "voice" ? "voice" : "video";
  const startedAtParamRaw = searchParams.get("startedAt");
  const startedAtParam = startedAtParamRaw ? Number(startedAtParamRaw) : NaN;
  const resolvedWorkspaceId =
    workspaceId || String(user?.currentWorkspaceId?._id || "").trim();
  const workspaceHook = useWorkspace();
  const spaceHook = useWorkspaceSpace();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isGridView, setIsGridView] = useState(true);

  const [isPanelOpenDesktop, setIsPanelOpenDesktop] = useState(true);
  const [isPanelSheetOpen, setIsPanelSheetOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [addParticipantSearch, setAddParticipantSearch] = useState("");
  const [selectedAdditionalMemberIds, setSelectedAdditionalMemberIds] =
    useState<string[]>([]);
  const [nextCallGroupName, setNextCallGroupName] = useState("");
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>("people");

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [callNote, setCallNote] = useState("");
  const [isSavingCallNote, setIsSavingCallNote] = useState(false);
  const [callMessages, setCallMessages] = useState<CallChatMessage[]>([]);

  const [remoteParticipantsMap, setRemoteParticipantsMap] = useState<
    Record<string, Participant>
  >({});

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

  const callMentionSuggestions = useMemo(() => {
    const seen = new Set<string>();

    return participants
      .map((participant) => {
        const display = String(participant.name || "").trim();
        const id = mentionSlug(display);

        if (!display || !id || seen.has(id)) {
          return null;
        }

        seen.add(id);
        return {
          id,
          display,
          kind: "user" as const,
          avatarUrl: participant.avatarUrl,
          avatarFallback: participant.initials || getInitials(display),
          subtitle: participant.role || "Member",
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        display: string;
        kind?: "user" | "team" | "project";
        avatarUrl?: string;
        avatarFallback?: string;
        subtitle?: string;
      }>;
  }, [participants]);

  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(
    resolvedWorkspaceId,
    {
      page: 1,
      limit: 200,
      search: addParticipantSearch,
    },
  );
  const createRoomMutation = spaceHook.useCreateWorkspaceSpaceRoom();
  const workspacePeople = useMemo(
    () => workspacePeopleQuery.data?.data?.members || [],
    [workspacePeopleQuery.data?.data?.members],
  );
  const activeParticipantIdSet = useMemo(
    () =>
      new Set(
        participants
          .map((participant) => String(participant.id || "").trim())
          .filter(Boolean),
      ),
    [participants],
  );
  const directCounterpartId = useMemo(() => {
    if (roomKind !== "direct") {
      return "";
    }

    if (directUserIdFromQuery) {
      return directUserIdFromQuery;
    }

    const normalizedRoomName = String(roomName || "").trim().toLowerCase();
    if (!normalizedRoomName) {
      return "";
    }

    const matchingMember = workspacePeople.find((member) => {
      const person = member?.userId;
      const name =
        `${person?.firstName || ""} ${person?.lastName || ""}`.trim() ||
        String(person?.email || "").trim();
      return String(name || "").trim().toLowerCase() === normalizedRoomName;
    });

    const fallbackByName = String(matchingMember?.userId?._id || "").trim();
    return looksLikeObjectId(fallbackByName) ? fallbackByName : "";
  }, [directUserIdFromQuery, roomKind, roomName, workspacePeople]);
  const addParticipantOptions = useMemo(() => {
    const reservedIds = new Set(activeParticipantIdSet);
    if (directCounterpartId) {
      reservedIds.add(directCounterpartId);
    }
    if (currentUserId) {
      reservedIds.add(currentUserId);
    }

    return workspacePeople
      .map((member) => {
        const person = member?.userId;
        const userId = String(person?._id || "").trim();
        if (!userId || reservedIds.has(userId)) {
          return null;
        }

        const fullName =
          `${person?.firstName || ""} ${person?.lastName || ""}`.trim() ||
          String(person?.email || "").trim() ||
          "Member";

        return {
          id: userId,
          name: fullName,
          email: String(person?.email || "").trim(),
          avatarUrl: String(person?.profilePhoto?.url || "").trim(),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    }>;
  }, [activeParticipantIdSet, currentUserId, directCounterpartId, workspacePeople]);

  const isScreenSharing = Boolean(screenStream);
  const screenSharingParticipant =
    participants.find((participant) => participant.isScreenSharing) || null;
  const featuredParticipant = screenSharingParticipant || participants[0] || localParticipant;
  const tileParticipants = participants.filter(
    (participant) => participant.id !== featuredParticipant.id,
  );
  const hasScreenSharing = Boolean(screenSharingParticipant);
  const shouldRenderGrid = isGridView && !hasScreenSharing;
  const resolvedMediaError = roomId
    ? mediaError
    : "Missing call room context. Start the call from a chat room.";
  const canPromoteDirectCall = roomKind === "direct";

  useEffect(() => {
    if (!isAddParticipantOpen) {
      return;
    }

    if (!nextCallGroupName.trim()) {
      const trimmedRoomName = String(roomName || "").trim();
      setNextCallGroupName(
        trimmedRoomName ? `${trimmedRoomName} call` : "Call room",
      );
    }
  }, [isAddParticipantOpen, nextCallGroupName, roomName]);

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
        setTrackContentHint(track, "speech");
        const sender = connection.addTrack(track, localStreamRef.current as MediaStream);
        void tuneAudioSenderQuality(sender);
      });

      const currentVideoTrack =
        screenStreamRef.current?.getVideoTracks()?.[0] ||
        localStreamRef.current?.getVideoTracks()?.[0];

      if (currentVideoTrack) {
        const isScreenTrack =
          screenStreamRef.current?.getVideoTracks().some((track) => track.id === currentVideoTrack.id) ??
          false;
        setTrackContentHint(currentVideoTrack, isScreenTrack ? "detail" : "motion");
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

        const existingStream = remoteStreamsRef.current.get(targetUserId);
        const normalizedStream = existingStream || new MediaStream();
        const existingTrackIds = new Set(normalizedStream.getTracks().map((track) => track.id));

        incomingStream.getTracks().forEach((track) => {
          if (!existingTrackIds.has(track.id)) {
            normalizedStream.addTrack(track);
          }
        });

        remoteStreamsRef.current.set(targetUserId, normalizedStream);
        upsertRemoteParticipant(targetUserId, {
          stream: normalizedStream,
          isVideoOn: normalizedStream.getVideoTracks().length > 0,
        });
      };

      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        if (["failed", "closed"].includes(state)) {
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
    if (audioTrack) {
      setTrackContentHint(audioTrack, "speech");
    }
    if (videoTrack) {
      const isScreenTrack =
        screenStreamRef.current?.getVideoTracks().some((track) => track.id === videoTrack.id) ?? false;
      setTrackContentHint(videoTrack, isScreenTrack ? "detail" : "motion");
    }

    peerConnectionsRef.current.forEach((connection, targetUserId) => {
      const senders = connection.getSenders();
      const audioSender = senders.find((sender) => sender.track?.kind === "audio");
      const videoSender = senders.find((sender) => sender.track?.kind === "video");
      let shouldRenegotiate = false;

      if (audioSender && audioSender.track !== audioTrack) {
        void audioSender.replaceTrack(audioTrack);
        void tuneAudioSenderQuality(audioSender);
      } else if (!audioSender && audioTrack && localStreamRef.current) {
        const sender = connection.addTrack(audioTrack, localStreamRef.current);
        void tuneAudioSenderQuality(sender);
        shouldRenegotiate = true;
      }

      if (videoSender && videoSender.track !== videoTrack) {
        void videoSender.replaceTrack(videoTrack);
      } else if (!videoSender && videoTrack) {
        const videoCarrier =
          screenStreamRef.current || localStreamRef.current || new MediaStream([videoTrack]);
        connection.addTrack(videoTrack, videoCarrier);
        shouldRenegotiate = true;
      }

      if (
        shouldRenegotiate &&
        resolvedWorkspaceId &&
        roomId &&
        targetUserId &&
        connection.signalingState === "stable"
      ) {
        void (async () => {
          try {
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
          } catch {
            // Ignore renegotiation races; follow-up updates will retry.
          }
        })();
      }
    });
  }, [resolvedWorkspaceId, roomId]);

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
        try {
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
        } catch {
          // Ignore signaling race conditions; subsequent signaling will recover.
        }
        return;
      }

      if (signal.type === "answer" && signal.sdp) {
        try {
          await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } catch {
          // Ignore stale answer payloads during renegotiation.
        }
        return;
      }

      if (signal.type === "ice-candidate" && signal.candidate) {
        try {
          await connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          // Ignore candidates that arrive before remote description is available.
        }
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
        video: preferVideo ? CAMERA_VIDEO_CONSTRAINTS : false,
        audio: AUDIO_CONSTRAINTS,
      });
      stream.getAudioTracks().forEach((track) => {
        setTrackContentHint(track, "speech");
      });
      stream.getVideoTracks().forEach((track) => {
        setTrackContentHint(track, "motion");
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
        authorInitials?: string;
        authorAvatarUrl?: string;
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
            authorInitials: message.authorInitials,
            authorAvatarUrl: message.authorAvatarUrl,
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
        isVideoOn: false,
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
        video: SCREEN_VIDEO_CONSTRAINTS,
        audio: false,
      });
      stream.getVideoTracks().forEach((track) => {
        setTrackContentHint(track, "detail");
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
      roomKind,
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

  const saveCallNoteToChat = async () => {
    const note = callNote.trim();

    if (!note || !resolvedWorkspaceId || !roomId || isSavingCallNote) {
      return;
    }

    setIsSavingCallNote(true);

    try {
      const response = await saveTeamCallNote({
        workspaceId: resolvedWorkspaceId,
        roomId,
        note,
        pin: false,
      });

      if (!response?.ok) {
        throw new Error(response?.message || "Unable to save note.");
      }

      setCallNote("");
      toast.success("Note saved to this call thread.");
    } catch (error) {
      const description =
        error instanceof Error && error.message
          ? error.message
          : "Unable to save note.";
      toast.error(description);
    } finally {
      setIsSavingCallNote(false);
    }
  };

  const toggleAdditionalMember = (memberId: string) => {
    const normalizedMemberId = String(memberId || "").trim();
    if (!normalizedMemberId) {
      return;
    }

    setSelectedAdditionalMemberIds((current) =>
      current.includes(normalizedMemberId)
        ? current.filter((entry) => entry !== normalizedMemberId)
        : [...current, normalizedMemberId],
    );
  };

  const openAddParticipantDialog = () => {
    if (!canPromoteDirectCall) {
      return;
    }

    setAddParticipantSearch("");
    setSelectedAdditionalMemberIds([]);
    setIsAddParticipantOpen(true);
  };

  const moveCallToGroup = async () => {
    if (
      !resolvedWorkspaceId ||
      !roomId ||
      !canPromoteDirectCall ||
      createRoomMutation.isPending
    ) {
      return;
    }

    const extraMemberIds = Array.from(
      new Set(
        selectedAdditionalMemberIds
          .map((memberId) => String(memberId || "").trim())
          .filter((memberId) => looksLikeObjectId(memberId)),
      ),
    );

    if (!extraMemberIds.length) {
      toast.error("Select at least one teammate to add.");
      return;
    }

    const baseParticipantIds = Array.from(
      new Set([
        currentUserId,
        ...Array.from(activeParticipantIdSet),
        directCounterpartId,
      ]),
    ).filter((memberId) => looksLikeObjectId(memberId));

    const groupMemberIds = Array.from(
      new Set([...baseParticipantIds, ...extraMemberIds]),
    );

    const groupName =
      String(nextCallGroupName || "").trim() ||
      `${String(roomName || "Call").trim()} call`;

    if (groupMemberIds.length < 2) {
      toast.error("Call room requires at least two members.");
      return;
    }

    const createRoomTask = async () => {
      const response = await createRoomMutation.mutateAsync({
        workspaceId: resolvedWorkspaceId,
        payload: {
          kind: "group",
          name: groupName,
          memberUserIds: groupMemberIds,
        },
      });

      const nextRoom = response?.data?.room;
      const nextRoomId = String(nextRoom?.id || "").trim();
      if (!nextRoomId) {
        throw new Error("Unable to open call room.");
      }

      const startedAt = Date.now();
      const socket = getSpacesSocket();
      if (!socket.connected) {
        socket.connect();
      }

      const callRoute = await new Promise<string>((resolve) => {
        socket.emit(
          "team-call:start",
          {
            workspaceId: resolvedWorkspaceId,
            roomId: nextRoomId,
            roomName: String(nextRoom?.name || groupName),
            roomScope: String(nextRoom?.scope || "team"),
            roomKind: "group",
            callMode,
            startedAt,
            startedByName: currentUserName,
            startedByInitials: getInitials(currentUserName),
          },
          (ack?: { ok?: boolean; route?: string }) => {
            resolve(String(ack?.route || "").trim());
          },
        );
      });

      return {
        route:
          callRoute ||
          buildTeamCallRoute({
            roomId: nextRoomId,
            roomName: String(nextRoom?.name || groupName),
            roomScope: String(nextRoom?.scope || "team"),
            roomKind: "group",
            callMode,
            startedAt,
          }),
      };
    };

    try {
      const callMigrationTask = createRoomTask();
      void toast.promise(callMigrationTask, {
        loading: "Creating call room…",
        success: "Call moved to a new group room.",
        error: "Unable to create group call.",
      });
      const result = await callMigrationTask;

      setIsAddParticipantOpen(false);
      setSelectedAdditionalMemberIds([]);
      setAddParticipantSearch("");
      router.replace(result.route);
    } catch {
      // handled by hook + toast promise
    }
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
          "relative min-h-0 overflow-hidden rounded-xl border border-border/45 bg-muted/25",
          compact && "w-[7.5rem] shrink-0",
        )}
      >
        {hasVideo ? (
          <video
            autoPlay
            playsInline
            muted={participant.id === currentUserId || !isSpeakerOn}
            ref={(node) => {
              if (!node || !participant.stream) {
                return;
              }

              if (node.srcObject !== participant.stream) {
                node.srcObject = participant.stream;
              }
            }}
            className="h-full w-full bg-black object-contain"
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

        {!hasVideo && participant.stream ? (
          <audio
            autoPlay
            playsInline
            muted={participant.id === currentUserId || !isSpeakerOn}
            ref={(node) => {
              if (!node || !participant.stream) {
                return;
              }

              if (node.srcObject !== participant.stream) {
                node.srcObject = participant.stream;
              }
            }}
          />
        ) : null}

        <div className="absolute right-1 bottom-1 left-1 flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-white backdrop-blur-sm">
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

  const renderVoiceParticipantOrb = (
    participant: Participant,
    featured = false,
  ) => {
    const hasVideo = Boolean(
      participant.isVideoOn && participant.stream?.getVideoTracks()?.length,
    );

    return (
      <article
        key={`voice-${participant.id}`}
        className={cn(
          "flex min-w-[7.5rem] flex-col items-center gap-2 text-center transition-transform",
          featured && "scale-[1.02]",
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-full border bg-card/60",
            featured ? "size-32 sm:size-40" : "size-24 sm:size-32",
            featured
              ? "ring-primary/55 border-primary/40 ring-2"
              : "border-border/55 ring-1 ring-border/35",
          )}
        >
          {hasVideo ? (
            <video
              autoPlay
              playsInline
              muted={participant.id === currentUserId || !isSpeakerOn}
              ref={(node) => {
                if (!node || !participant.stream) {
                  return;
                }

                if (node.srcObject !== participant.stream) {
                  node.srcObject = participant.stream;
                }
              }}
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <Avatar
              className="size-[86%] border-0"
              userCard={{
                name: participant.name,
                role: participant.role ?? "Member",
                status: participant.isMuted ? "Muted" : "Live",
              }}
            >
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback className="text-sm">
                {participant.initials}
              </AvatarFallback>
            </Avatar>
          )}

          {!hasVideo && participant.stream ? (
            <audio
              autoPlay
              playsInline
              muted={participant.id === currentUserId || !isSpeakerOn}
              ref={(node) => {
                if (!node || !participant.stream) {
                  return;
                }

                if (node.srcObject !== participant.stream) {
                  node.srcObject = participant.stream;
                }
              }}
            />
          ) : null}

          <span
            className={cn(
              "absolute bottom-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
              participant.isMuted
                ? "border-border/65 bg-background/75 text-muted-foreground"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {participant.isMuted ? (
              <MicOff className="size-3" />
            ) : (
              <Mic className="size-3" />
            )}
            {renderAudioMeter(participant.id, participant.isMuted)}
          </span>
        </div>

        <div className="space-y-0.5">
          <p className="max-w-32 truncate text-[12px] font-medium">
            {participant.name}
          </p>
          {participant.role ? (
            <p className="text-muted-foreground text-[10px]">{participant.role}</p>
          ) : null}
        </div>
      </article>
    );
  };

  const renderVoiceView = () => {
    const featuredVoiceParticipant =
      participants.find((participant) => !participant.isMuted) ||
      featuredParticipant;

    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-[#171232] via-[#0f1023] to-[#0c0d1a] px-3 py-4 text-white sm:px-6 sm:py-6">
        <div className="mb-3 flex items-center justify-between">
          <Badge variant="outline" className="border-white/25 bg-white/10 text-[11px] text-white">
            Voice call
          </Badge>
          <Badge variant="secondary" className="bg-white/10 text-[11px] text-white">
            {participants.length} participant{participants.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
          <div className="flex w-full flex-wrap items-center justify-center gap-4 sm:gap-7">
            {participants.map((participant) =>
              renderVoiceParticipantOrb(
                participant,
                participant.id === featuredVoiceParticipant.id,
              ),
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    return (
      <div className="grid h-full min-h-0 auto-rows-fr grid-cols-2 gap-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-4">
        {hasScreenSharing && (
          <article className="relative min-h-0 overflow-hidden rounded-xl border border-primary/30 bg-black/85 shadow-lg sm:col-span-2">
            {featuredParticipant.id === currentUserId && screenStream ? (
              <video ref={screenVideoRef} autoPlay playsInline muted className="h-full w-full bg-black object-contain" />
            ) : featuredParticipant.stream ? (
              <video
                autoPlay
                playsInline
                muted={featuredParticipant.id === currentUserId || !isSpeakerOn}
                ref={(node) => {
                  if (!node || !featuredParticipant.stream) {
                    return;
                  }

                  if (node.srcObject !== featuredParticipant.stream) {
                    node.srcObject = featuredParticipant.stream;
                  }
                }}
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center">
                <p className="text-[12px] text-white/85">Screen share is live</p>
              </div>
            )}
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
              <MonitorUp className="size-3.5" />
              {featuredParticipant.name} sharing
            </div>
          </article>
        )}

        {(hasScreenSharing ? tileParticipants : [featuredParticipant, ...tileParticipants]).map(
          (participant) => renderParticipantTile(participant),
        )}
      </div>
    );
  };

  const renderSpeakerView = () => {
    return (
      <div
        className={cn(
          "grid h-full min-h-0 gap-2 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-[#16122d] via-[#0d0d19] to-[#121425] p-2 sm:p-3",
          hasScreenSharing
            ? "grid-rows-[minmax(0,1fr)_4.75rem] sm:grid-rows-[minmax(0,1fr)_6.75rem]"
            : "grid-rows-[minmax(0,1fr)_4.75rem] sm:grid-rows-[minmax(0,1fr)_6.75rem]",
        )}
      >
        <article className="relative min-h-0 overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-black/90 via-black/80 to-black/90">
          {hasScreenSharing ? (
            <>
              {featuredParticipant.id === currentUserId && screenStream ? (
                <video ref={screenVideoRef} autoPlay playsInline muted className="h-full w-full bg-black object-contain" />
              ) : featuredParticipant.stream ? (
                <video
                  autoPlay
                  playsInline
                  muted={featuredParticipant.id === currentUserId || !isSpeakerOn}
                  ref={(node) => {
                    if (!node || !featuredParticipant.stream) {
                      return;
                    }

                    if (node.srcObject !== featuredParticipant.stream) {
                      node.srcObject = featuredParticipant.stream;
                    }
                  }}
                  className="h-full w-full bg-black object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                  <p className="text-[12px] font-medium text-white/90">
                    Sharing is live. Waiting for screen preview.
                  </p>
                </div>
              )}

              <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                <MonitorUp className="size-3.5" />
                {featuredParticipant.name} sharing
              </div>
            </>
          ) : featuredParticipant.isVideoOn && featuredParticipant.stream ? (
            <video
              autoPlay
              playsInline
              muted={featuredParticipant.id === currentUserId || !isSpeakerOn}
              ref={(node) => {
                if (!node || !featuredParticipant.stream) {
                  return;
                }

                if (node.srcObject !== featuredParticipant.stream) {
                  node.srcObject = featuredParticipant.stream;
                }
              }}
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-black/35">
              <Avatar
                size="lg"
                className="size-28 border-primary/45 ring-2 ring-primary/35 sm:size-36"
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

          {hasScreenSharing && isVideoOn && localStream && (
            <div className="absolute right-2 bottom-8 h-16 w-[6.5rem] overflow-hidden rounded-sm border border-white/25 bg-black/30 shadow-lg">
              <video
                ref={localPreviewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full bg-black object-contain"
              />
            </div>
          )}

          <div className="absolute right-2 bottom-2 left-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2 py-1 text-white backdrop-blur-sm">
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
      <div className="flex h-full min-h-0 w-full flex-1 gap-0 overflow-hidden overscroll-none bg-gradient-to-b from-background via-background to-muted/10 sm:gap-2.5">
        <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-x-0 border-b-0 bg-card/95 sm:rounded-xl sm:border-x sm:border-b sm:shadow-sm">
          <div className="shrink-0 border-b bg-card/95 px-2.5 py-2.5 sm:px-3.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 px-2.5 text-[13px]"
                  onClick={handleLeaveToSpaces}
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden min-[420px]:inline">Back</span>
                </Button>

                <div className="hidden h-5 w-px bg-border/70 min-[420px]:block" />

                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold sm:text-[14px]">
                    {roomName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full px-1.5 text-[10px] capitalize"
                    >
                      {roomScope}
                    </Badge>
                    <p className="text-muted-foreground text-[11px]">
                      {participants.length} in call
                    </p>
                  </div>
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
                  Live {formatDuration(durationSeconds)}
                </Badge>
                <Badge
                  variant={localStream ? "outline" : "secondary"}
                  className="hidden h-6 rounded-full px-2 text-[11px] sm:inline-flex"
                >
                  {localStream ? "Connected" : "Limited media"}
                </Badge>
                {canPromoteDirectCall ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 px-2 text-[12px]"
                    onClick={openAddParticipantDialog}
                  >
                    <UserPlus className="size-4" />
                    Add person
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 px-2 text-[12px] lg:hidden"
                  onClick={() => setIsPanelSheetOpen(true)}
                >
                  <MessageSquare className="size-4" />
                  Panel
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="hidden h-8 shrink-0 px-2 text-[12px] lg:flex"
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
            </div>

            {resolvedMediaError && (
              <p className="text-destructive mt-1.5 text-[12px]">
                {resolvedMediaError}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2.5">
            {callMode === "voice" && !hasScreenSharing
              ? renderVoiceView()
              : shouldRenderGrid
                ? renderGridView()
                : renderSpeakerView()}
          </div>

          <div className="shrink-0 border-t bg-card/95 px-2.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-3 sm:py-2.5">
            <div className="overflow-x-auto">
              <div className="mx-auto flex w-max min-w-full items-center justify-center gap-1.5 rounded-full border border-border/45 bg-background/75 p-1 shadow-sm">
                <Button
                  size="sm"
                  variant={isMicOn ? "secondary" : "destructive"}
                  className="h-9 rounded-full px-2.5 text-[13px]"
                  onClick={handleToggleMic}
                >
                  {isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                  {isMicOn ? "Mic" : "Muted"}
                </Button>

                <Button
                  size="sm"
                  variant={isScreenSharing ? "default" : "secondary"}
                  className="h-9 rounded-full px-2.5 text-[13px]"
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
                  className="h-9 rounded-full px-2.5 text-[13px]"
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
                  className="h-9 rounded-full px-2.5 text-[13px]"
                  onClick={() => setIsGridView((prev) => !prev)}
                >
                  <LayoutGrid className="size-4" />
                  {callMode === "voice" && !hasScreenSharing
                    ? "Tiles"
                    : shouldRenderGrid
                      ? "Speaker"
                      : "Grid"}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-full px-2.5 text-[13px] lg:hidden"
                  onClick={() => setIsPanelSheetOpen(true)}
                >
                  <Users className="size-4" />
                  People
                </Button>

                <Button
                  size="sm"
                  className="h-9 rounded-full bg-destructive/85 px-2.5 text-[13px] text-white hover:bg-destructive"
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
                callMentionSuggestions={callMentionSuggestions}
                onActivePanelTabChange={setActivePanelTab}
                onCallNoteChange={setCallNote}
                onChatInputChange={setChatInput}
                onSendCallMessage={() => {
                  void sendCallMessage();
                }}
                onSaveCallNote={() => {
                  void saveCallNoteToChat();
                }}
                isSavingCallNote={isSavingCallNote}
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
            callMentionSuggestions={callMentionSuggestions}
            onActivePanelTabChange={setActivePanelTab}
            onCallNoteChange={setCallNote}
            onChatInputChange={setChatInput}
            onSendCallMessage={() => {
              void sendCallMessage();
            }}
            onSaveCallNote={() => {
              void saveCallNoteToChat();
            }}
            isSavingCallNote={isSavingCallNote}
            onCloseMobile={() => setIsPanelSheetOpen(false)}
            renderAudioMeter={renderAudioMeter}
          />
        </SheetContent>
      </Sheet>

      <Dialog
        open={isAddParticipantOpen}
        onOpenChange={(open) => {
          setIsAddParticipantOpen(open);
          if (!open) {
            setSelectedAdditionalMemberIds([]);
            setAddParticipantSearch("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add people to this call</DialogTitle>
            <DialogDescription>
              We will create a new group chat for this call and move everyone there.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium">Group chat name</p>
            <Input
              value={nextCallGroupName}
              onChange={(event) => setNextCallGroupName(event.target.value)}
              placeholder="Call room name"
              className="h-9 text-[13px]"
            />
          </div>

          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium">Add teammates</p>
            <Input
              value={addParticipantSearch}
              onChange={(event) => setAddParticipantSearch(event.target.value)}
              placeholder="Search workspace members"
              className="h-9 text-[13px]"
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-1.5">
            {workspacePeopleQuery.isLoading ? (
              <div className="flex min-h-[8rem] items-center justify-center">
                <LoaderComponent />
              </div>
            ) : addParticipantOptions.length ? (
              addParticipantOptions.map((option) => {
                const checked = selectedAdditionalMemberIds.includes(option.id);
                const fallback = getInitials(option.name || "Member");

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleAdditionalMember(option.id)}
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    <Checkbox checked={checked} className="size-4" />
                    <Avatar className="size-6">
                      <AvatarImage src={option.avatarUrl} alt={option.name} />
                      <AvatarFallback className="text-[10px]">
                        {fallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium">
                        {option.name}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {option.email}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground px-2 py-3 text-[12px]">
                No available members to add.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddParticipantOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void moveCallToGroup();
              }}
              disabled={
                createRoomMutation.isPending ||
                selectedAdditionalMemberIds.length === 0
              }
            >
              {createRoomMutation.isPending ? "Moving…" : "Move to group call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamCallPage;
