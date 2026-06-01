"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceNoteRecorderProps = {
  onRecordingReady: (file: File) => void;
  disabled?: boolean;
  className?: string;
};

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const formatElapsedTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const waveformBars = [
  9, 15, 11, 20, 13, 24, 10, 18, 14, 22, 12, 16, 9, 15, 11, 20, 13, 24, 10, 18,
  9, 15, 11, 20, 13, 24, 10, 18, 14, 22, 12, 16, 14, 22, 12, 16, 9, 15, 11, 20,
];

export default function VoiceNoteRecorder({
  onRecordingReady,
  disabled = false,
  className,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (
        recorderRef.current?.state &&
        recorderRef.current.state !== "inactive"
      ) {
        recorderRef.current.stop();
      }
      stopTracks();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const cancelRecording = () => {
    discardRecordingRef.current = true;
    stopRecording();
  };

  const startRecording = async () => {
    if (disabled || isRecording) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error("Voice notes are not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      chunksRef.current = [];
      discardRecordingRef.current = false;
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        chunksRef.current = [];
        setIsRecording(false);
        setElapsedSeconds(0);
        stopTracks();

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }

        if (!blob.size) {
          toast.error("We could not capture that voice note.");
          return;
        }

        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        onRecordingReady(
          new File([blob], `voice-note-${Date.now()}.${extension}`, {
            type: blob.type || "audio/webm",
          }),
        );
      };

      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
    } catch {
      setIsRecording(false);
      setElapsedSeconds(0);
      stopTracks();
      toast.error("Microphone access was blocked.", {
        description: "Allow microphone access to record a voice note.",
      });
    }
  };

  if (isRecording) {
    return (
      <div
        className={cn(
          "border-border/50 bg-muted/65 inline-flex h-8 items-center gap-2 rounded-md border px-2 text-[12px]",
          className,
        )}
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
        </span>
        <span className="tabular-nums text-foreground">
          {formatElapsedTime(elapsedSeconds)}
        </span>
        <div
          className="flex h-6 items-center gap-[2px] flex-1"
          aria-hidden="true"
        >
          {waveformBars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="w-[2px] rounded-full bg-foreground/70 motion-safe:animate-pulse"
              style={{
                height,
                animationDelay: `${index * 65}ms`,
                animationDuration: "850ms",
              }}
            />
          ))}
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground "
          onClick={cancelRecording}
          aria-label="Cancel voice note"
        >
          <X className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[12px] text-red-500"
          onClick={stopRecording}
        >
          <Square className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn("h-8 px-2 text-[12px]", className)}
      disabled={disabled}
      onClick={startRecording}
    >
      <Mic className="size-3.5" />
      Voice
    </Button>
  );
}
