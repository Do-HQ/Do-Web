"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getSpacesSocket } from "@/lib/realtime/spaces-socket";
import {
  connectProjectNotificationsSocket,
  type ProjectNotificationEventPayload,
} from "@/lib/realtime/project-notifications-socket";
import {
  armBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/helpers/browser-notifications";
import { ROUTES } from "@/utils/constants";

type IncomingCallPayload = {
  id?: string;
  workspaceId?: string;
  roomId?: string;
  startedAt?: number;
  roomName?: string;
  startedByName?: string;
  summary?: string;
  route?: string;
};

type BrowserAudioContext = AudioContext;

const MAX_RING_DURATION_MS = 20_000;
const RING_INTERVAL_MS = 1_000;

const TeamCallNotificationListener = () => {
  const router = useRouter();
  const seenIncomingCallIdsRef = useRef(new Set<string>());
  const ringingTimersRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<BrowserAudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  const ensureAudioUnlocked = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      // @ts-expect-error WebKit fallback for Safari
      window.webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    const ctx = audioContextRef.current;
    if (!ctx) {
      return null;
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (!audioUnlockedRef.current) {
      const unlockGain = ctx.createGain();
      const unlockOscillator = ctx.createOscillator();
      const start = ctx.currentTime;
      unlockGain.gain.setValueAtTime(0.0001, start);
      unlockOscillator.frequency.setValueAtTime(1, start);
      unlockOscillator.connect(unlockGain);
      unlockGain.connect(ctx.destination);
      unlockOscillator.start(start);
      unlockOscillator.stop(start + 0.01);
      audioUnlockedRef.current = true;
    }

    return ctx;
  }, []);

  const stopRinging = useCallback((callId: string) => {
    const timerId = ringingTimersRef.current[callId];
    if (typeof timerId === "number") {
      window.clearInterval(timerId);
      delete ringingTimersRef.current[callId];
    }
  }, []);

  const playRingTonePulse = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const ctx = await ensureAudioUnlocked();

      if (!ctx) {
        return;
      }

      const start = ctx.currentTime;
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();

      oscA.type = "sine";
      oscB.type = "sine";
      oscA.frequency.setValueAtTime(860, start);
      oscB.frequency.setValueAtTime(660, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.04, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(ctx.destination);

      oscA.start(start);
      oscB.start(start + 0.04);
      oscA.stop(start + 0.22);
      oscB.stop(start + 0.28);
    } catch {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([160, 70, 180]);
      }
    }
  }, [ensureAudioUnlocked]);

  const startRinging = useCallback(
    (callId: string) => {
      stopRinging(callId);
      const startedAt = Date.now();

      void playRingTonePulse();
      const timerId = window.setInterval(() => {
        if (Date.now() - startedAt >= MAX_RING_DURATION_MS) {
          stopRinging(callId);
          return;
        }

        void playRingTonePulse();
      }, RING_INTERVAL_MS);

      ringingTimersRef.current[callId] = timerId;
    },
    [playRingTonePulse, stopRinging],
  );

  const toCallKey = useCallback((payload: IncomingCallPayload) => {
    const roomId = String(payload?.roomId || "").trim();
    const startedAt = Number(payload?.startedAt || 0);
    if (roomId && Number.isFinite(startedAt) && startedAt > 0) {
      return `${roomId}:${startedAt}`;
    }
    return String(payload?.id || "").trim();
  }, []);

  const notifyIncomingCall = useCallback(
    (payload: IncomingCallPayload) => {
      const callKey = toCallKey(payload);
      if (!callKey) {
        return;
      }

      if (seenIncomingCallIdsRef.current.has(callKey)) {
        return;
      }

      seenIncomingCallIdsRef.current.add(callKey);
      if (seenIncomingCallIdsRef.current.size > 300) {
        const keys = Array.from(seenIncomingCallIdsRef.current);
        seenIncomingCallIdsRef.current = new Set(keys.slice(keys.length - 120));
      }

      startRinging(callKey);

      toast(`Incoming call: ${payload.roomName || "Team Call"}`, {
        description:
          payload.summary ||
          `${payload.startedByName || "A teammate"} started a call`,
        duration: Infinity,
        action: {
          label: "Join",
          onClick: () => {
            stopRinging(callKey);
            router.push(payload.route || ROUTES.SPACES_TEAM_CALL);
          },
        },
        onDismiss: () => {
          stopRinging(callKey);
        },
      });

      void showBrowserNotification({
        id: callKey,
        title: `Incoming call: ${payload.roomName || "Team Call"}`,
        summary:
          payload.summary ||
          `${payload.startedByName || "A teammate"} started a call`,
        route: payload.route || ROUTES.SPACES_TEAM_CALL,
        tagPrefix: "team-call-incoming",
        requireInteraction: true,
      });
    },
    [router, startRinging, stopRinging, toCallKey],
  );

  useEffect(() => {
    const cleanup = armBrowserNotificationPermission();
    return cleanup;
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      void ensureAudioUnlocked();
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [ensureAudioUnlocked]);

  useEffect(() => {
    const spacesSocket = getSpacesSocket();
    const projectNotificationsSocket = connectProjectNotificationsSocket();
    const ringingTimers = ringingTimersRef.current;

    if (!spacesSocket.connected) {
      spacesSocket.connect();
    }
    if (!projectNotificationsSocket.connected) {
      projectNotificationsSocket.connect();
    }

    const handleIncomingCall = (payload: IncomingCallPayload) => {
      notifyIncomingCall(payload);
    };

    const handleProjectNotification = (
      payload: ProjectNotificationEventPayload,
    ) => {
      const notification = payload?.notification;
      if (!notification || String(notification?.type || "") !== "space.call.incoming") {
        return;
      }

      const metadata =
        notification.metadata && typeof notification.metadata === "object"
          ? notification.metadata
          : {};

      notifyIncomingCall({
        id: String(notification.id || ""),
        workspaceId: String(notification.workspaceId || ""),
        roomId: String((metadata as { roomId?: string })?.roomId || ""),
        startedAt: Number((metadata as { startedAt?: number })?.startedAt || 0),
        roomName:
          String((metadata as { roomName?: string })?.roomName || "").trim() ||
          "Team Call",
        startedByName: String(notification.actorName || "").trim() || "A teammate",
        summary: String(notification.summary || "").trim(),
        route: String(notification.route || "").trim() || ROUTES.SPACES_TEAM_CALL,
      });
    };

    spacesSocket.on("team-call:incoming", handleIncomingCall);
    projectNotificationsSocket.on(
      "project:notification:created",
      handleProjectNotification,
    );

    return () => {
      spacesSocket.off("team-call:incoming", handleIncomingCall);
      projectNotificationsSocket.off(
        "project:notification:created",
        handleProjectNotification,
      );
      Object.keys(ringingTimers).forEach((callId) => {
        stopRinging(callId);
      });
    };
  }, [notifyIncomingCall, stopRinging]);

  return null;
};

export default TeamCallNotificationListener;
