"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import useAuthStore from "@/stores/auth";
import { ROUTES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import CallPanel from "./components/call-panel";
import type {
  CallChatMessage,
  MinimizedTeamCall,
  PanelTab,
  Participant,
} from "./types";
import { formatDuration, getInitials, stopMediaStream, TEAM_CALL_WIDGET_KEY } from "./utils";

const TeamCallPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const roomName = searchParams.get("room") || "Team Call";
  const roomScope = searchParams.get("scope") || "team";
  const startedAtParamRaw = searchParams.get("startedAt");
  const startedAtParam = startedAtParamRaw ? Number(startedAtParamRaw) : NaN;

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
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
  const [callMessages, setCallMessages] = useState<CallChatMessage[]>([
    {
      id: "c1",
      author: "Aya",
      content: "Let's align on blockers before we close this call.",
      sentAt: "09:11",
    },
    {
      id: "c2",
      author: "Jude",
      content: "I shared updated QA timing in the thread.",
      sentAt: "09:13",
    },
  ]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localPreviewRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const currentUserName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "You";

  const participants = useMemo<Participant[]>(() => {
    return [
      {
        id: "you",
        name: currentUserName,
        initials: getInitials(currentUserName),
        avatarUrl: user?.profilePhoto?.url,
        role: "Host",
        isMuted: !isMicOn,
        isVideoOn,
      },
      {
        id: "aya",
        name: "Aya Wilson",
        initials: "AW",
        avatarUrl:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
        isMuted: false,
        isVideoOn: true,
      },
      {
        id: "jude",
        name: "Jude Okafor",
        initials: "JO",
        avatarUrl:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
        isMuted: true,
        isVideoOn: true,
      },
      {
        id: "mariam",
        name: "Mariam Bello",
        initials: "MB",
        avatarUrl:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80",
        isMuted: false,
        isVideoOn: false,
      },
    ];
  }, [currentUserName, isMicOn, isVideoOn, user?.profilePhoto?.url]);

  const featuredParticipant = participants[0];
  const tileParticipants = participants.slice(1);
  const isScreenSharing = Boolean(screenStream);

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
      setDurationSeconds(
        Math.max(0, Math.floor((Date.now() - startedAtParam) / 1000)),
      );
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
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
  }, []);

  const initLocalMedia = async () => {
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
        video: true,
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
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initLocalMedia();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

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
    return () => {
      stopMediaStream(localStreamRef.current);
      stopMediaStream(screenStreamRef.current);
    };
  }, []);

  const handleToggleMic = async () => {
    if (!isMicOn && !localStream) {
      const stream = await initLocalMedia();
      if (!stream) {
        return;
      }
    }

    setIsMicOn((prev) => !prev);
  };

  const handleToggleVideo = async () => {
    if (!isVideoOn && !localStream) {
      const stream = await initLocalMedia();
      if (!stream) {
        return;
      }
    }

    setIsVideoOn((prev) => !prev);
  };

  const handleToggleScreenShare = async () => {
    if (screenStream) {
      stopMediaStream(screenStream);
      setScreenStream(null);
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
        audio: true,
      });

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          stopMediaStream(stream);
          setScreenStream(null);
        });
      }

      setScreenStream((prev) => {
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
      roomName,
      roomScope,
      startedAt,
      isMuted: !isMicOn,
      isVideoOn,
      isScreenSharing,
    };

    window.sessionStorage.setItem(TEAM_CALL_WIDGET_KEY, JSON.stringify(payload));
  };

  const handleLeaveToSpaces = () => {
    persistMinimizedCall();
    stopMediaStream(localStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    router.push(ROUTES.SPACES);
  };

  const endCall = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(TEAM_CALL_WIDGET_KEY);
    }

    stopMediaStream(localStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    router.push(ROUTES.SPACES);
  };

  const sendCallMessage = () => {
    const message = chatInput.trim();
    if (!message) {
      return;
    }

    setCallMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 10),
        author: "You",
        content: message,
        sentAt: formatDuration(durationSeconds),
      },
    ]);
    setChatInput("");
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
    return (
      <article
        key={participant.id}
        className={cn(
          "relative min-h-0 overflow-hidden rounded-md border bg-muted/30",
          compact && "w-[7rem] shrink-0",
        )}
      >
        {participant.isVideoOn ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={participant.avatarUrl}
            alt={participant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Avatar size="sm">
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback className="text-[10px]">
                {participant.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <div className="absolute right-1 bottom-1 left-1 flex items-center gap-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-white">
          <p className="truncate text-[10px]">{participant.name}</p>
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
                <p className="text-[11px] text-white/85">Screen share is live</p>
              </div>
            )}
            <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
              <MonitorUp className="size-3" />
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
                  <p className="text-[11px] font-medium text-white/90">
                    Sharing is live. Waiting for screen preview.
                  </p>
                </div>
              )}

              <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm border border-white/20 bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
                <MonitorUp className="size-3" />
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
              <Avatar size="lg">
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
            <p className="truncate text-[11px] font-medium">{featuredParticipant.name}</p>
            {featuredParticipant.role && (
              <span className="text-[10px] text-white/70">{featuredParticipant.role}</span>
            )}

            <span className="ml-auto inline-flex items-center gap-1 text-[10px]">
              {featuredParticipant.isMuted ? (
                <MicOff className="size-3" />
              ) : (
                <Mic className="size-3" />
              )}
              {featuredParticipant.isVideoOn ? (
                <Video className="size-3" />
              ) : (
                <VideoOff className="size-3" />
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
                className="h-7 shrink-0 px-2 text-[11px]"
                onClick={handleLeaveToSpaces}
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden min-[420px]:inline">Back to Spaces</span>
              </Button>

              <p className="max-w-[8.5rem] shrink-0 truncate text-[12px] font-semibold sm:max-w-none">
                {roomName}
              </p>
              <Badge
                variant="outline"
                className="hidden shrink-0 text-[10px] capitalize min-[430px]:inline-flex"
              >
                {roomScope}
              </Badge>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                Live {formatDuration(durationSeconds)}
              </Badge>

              <Badge
                variant={localStream ? "outline" : "secondary"}
                className="hidden shrink-0 text-[10px] sm:inline-flex"
              >
                {localStream ? "Connected" : "Limited media"}
              </Badge>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-[11px] lg:ml-auto lg:hidden"
                onClick={() => setIsPanelSheetOpen(true)}
              >
                <MessageSquare className="size-3.5" />
                Panel
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="hidden h-7 shrink-0 px-2 text-[11px] lg:flex"
                onClick={() => setIsPanelOpenDesktop((prev) => !prev)}
              >
                {isPanelOpenDesktop ? (
                  <PanelRightClose className="size-3.5" />
                ) : (
                  <PanelRightOpen className="size-3.5" />
                )}
                Panel
              </Button>
            </div>

            {mediaError && (
              <p className="text-destructive mt-1.5 text-[11px]">{mediaError}</p>
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
                  className="h-8 px-2 text-[11px]"
                  onClick={handleToggleMic}
                >
                  {isMicOn ? (
                    <Mic className="size-3.5" />
                  ) : (
                    <MicOff className="size-3.5" />
                  )}
                  {isMicOn ? "Mic" : "Muted"}
                </Button>

                <Button
                  size="sm"
                  variant={isVideoOn ? "secondary" : "destructive"}
                  className="h-8 px-2 text-[11px]"
                  onClick={handleToggleVideo}
                >
                  {isVideoOn ? (
                    <Video className="size-3.5" />
                  ) : (
                    <VideoOff className="size-3.5" />
                  )}
                  {isVideoOn ? "Camera" : "Camera Off"}
                </Button>

                <Button
                  size="sm"
                  variant={isScreenSharing ? "default" : "secondary"}
                  className="h-8 px-2 text-[11px]"
                  onClick={handleToggleScreenShare}
                >
                  {isScreenSharing ? (
                    <MonitorUp className="size-3.5" />
                  ) : (
                    <Monitor className="size-3.5" />
                  )}
                  {isScreenSharing ? "Stop Share" : "Share Screen"}
                </Button>

                <Button
                  size="sm"
                  variant={isSpeakerOn ? "secondary" : "destructive"}
                  className="h-8 px-2 text-[11px]"
                  onClick={() => setIsSpeakerOn((prev) => !prev)}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="size-3.5" />
                  ) : (
                    <VolumeX className="size-3.5" />
                  )}
                  {isSpeakerOn ? "Speaker" : "Speaker Off"}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2 text-[11px]"
                  onClick={() => setIsGridView((prev) => !prev)}
                >
                  <LayoutGrid className="size-3.5" />
                  {isGridView ? "Speaker" : "Grid"}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2 text-[11px] lg:hidden"
                  onClick={() => setIsPanelSheetOpen(true)}
                >
                  <Users className="size-3.5" />
                  People
                </Button>

                <Button
                  size="sm"
                  className="h-8 bg-destructive/85 px-2 text-[11px] text-white hover:bg-destructive"
                  onClick={endCall}
                >
                  <PhoneOff className="size-3.5" />
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
                onSendCallMessage={sendCallMessage}
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
            onSendCallMessage={sendCallMessage}
            onCloseMobile={() => setIsPanelSheetOpen(false)}
            renderAudioMeter={renderAudioMeter}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TeamCallPage;
