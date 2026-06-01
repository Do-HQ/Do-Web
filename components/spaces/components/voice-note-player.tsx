"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceNotePlayerProps = {
  url: string;
  name: string;
  compact?: boolean;
  fluid?: boolean;
  showName?: boolean;
  className?: string;
  onRemove?: () => void;
};

const createWaveformBars = (seedValue: string) => {
  const seed = Array.from(seedValue || "voice-note").reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 3),
    37,
  );

  return Array.from({ length: 62 }, (_, index) => {
    const wave = Math.sin((seed + index * 17) * 0.43);
    const ripple = Math.cos((seed + index * 11) * 0.31);
    return Math.round(10 + Math.abs(wave * 12) + Math.abs(ripple * 7));
  });
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function VoiceNotePlayer({
  url,
  name,
  compact = false,
  fluid = false,
  showName = true,
  className,
  onRemove,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const waveformBars = useMemo(
    () => createWaveformBars(`${name}:${url}`),
    [name, url],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [url]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const progress = duration ? currentTime / duration : 0;
  const activeBars = Math.max(1, Math.round(progress * waveformBars.length));

  return (
    <div
      className={cn(
        "border-border/50 bg-muted/40 flex items-center gap-2 rounded-md border px-2 py-1.5 ",
        fluid ? "max-w-90" : compact ? "max-w-72" : "max-w-[28rem]",
        className,
      )}
    >
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="size-7"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
      </Button>

      <div className="min-w-0 flex-1 flex items-center gap-3">
        {showName ? (
          <div className="mb-1 flex items-center gap-1.5">
            <Mic className="size-3 text-primary" />
            <span className="truncate text-[11.5px] font-medium">{name}</span>
            <span className="text-muted-foreground ml-auto text-[10.5px] tabular-nums">
              {formatTime(currentTime || duration)}
            </span>
          </div>
        ) : null}
        <div
          className="flex h-6 flex-1 items-center gap-[2px] shrink-0"
          aria-hidden="true"
        >
          {waveformBars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className={cn(
                "max-w-[2px] flex-1 rounded-full transition-colors",
                index < activeBars ? "bg-primary/85" : "bg-foreground/20",
              )}
              style={{ height: compact ? Math.max(8, height - 5) : height }}
            />
          ))}
        </div>
        {!showName ? (
          <span className="text-muted-foreground mt-0.5 block text-right text-[10.5px] tabular-nums">
            {formatTime(currentTime || duration)}
          </span>
        ) : null}
      </div>

      {onRemove ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
          aria-label="Remove voice note"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}

      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
}
