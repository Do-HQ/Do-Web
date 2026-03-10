"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getSpacesSocket } from "@/lib/realtime/spaces-socket";
import { ROUTES } from "@/utils/constants";

type IncomingCallPayload = {
  id?: string;
  roomName?: string;
  startedByName?: string;
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
    const socket = getSpacesSocket();
    const ringingTimers = ringingTimersRef.current;

    if (!socket.connected) {
      socket.connect();
    }

    const handleIncomingCall = (payload: IncomingCallPayload) => {
      const callId = String(payload?.id || "").trim();
      if (!callId) {
        return;
      }

      if (seenIncomingCallIdsRef.current.has(callId)) {
        return;
      }

      seenIncomingCallIdsRef.current.add(callId);
      startRinging(callId);

      toast(`Incoming call: ${payload.roomName || "Team Call"}`, {
        description: `${payload.startedByName || "A teammate"} started a call`,
        duration: Infinity,
        action: {
          label: "Join",
          onClick: () => {
            stopRinging(callId);
            router.push(payload.route || ROUTES.SPACES_TEAM_CALL);
          },
        },
        onDismiss: () => {
          stopRinging(callId);
        },
      });
    };

    socket.on("team-call:incoming", handleIncomingCall);

    return () => {
      socket.off("team-call:incoming", handleIncomingCall);
      Object.keys(ringingTimers).forEach((callId) => {
        stopRinging(callId);
      });
    };
  }, [router, startRinging, stopRinging]);

  return null;
};

export default TeamCallNotificationListener;
