import {
  Clock3,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonalCallState } from "../types";

type PersonalCallWidgetProps = {
  personalCall: PersonalCallState;
  personalCallInitials: string;
  callDurationSeconds: number;
  formatCallDuration: (totalSeconds: number) => string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
};

const PersonalCallWidget = ({
  personalCall,
  personalCallInitials,
  callDurationSeconds,
  formatCallDuration,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onEndCall,
}: PersonalCallWidgetProps) => {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-20 w-[17rem] max-w-[calc(100%-1rem)]">
      <div className="bg-background/95 border-border pointer-events-auto rounded-md border p-2.5 shadow-md backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <Avatar
            size="sm"
            userCard={{
              name: personalCall.contactName,
              role: personalCall.mode === "video" ? "Video call" : "Voice call",
              status: personalCall.isMuted ? "Muted" : "Live",
            }}
          >
            <AvatarFallback className="text-[11px]">
              {personalCallInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">
              {personalCall.contactName}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock3 className="size-3.5" />
              {formatCallDuration(callDurationSeconds)}
            </p>
          </div>
          <Badge variant="outline" className="text-[11px]">
            {personalCall.mode === "video" ? "Video" : "Voice"}
          </Badge>
        </div>

        {personalCall.mode === "video" && (
          <div className="mt-2 relative h-20 overflow-hidden rounded-md border bg-black/90">
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar
                size="lg"
                userCard={{
                  name: personalCall.contactName,
                  role: personalCall.mode === "video" ? "Video call" : "Voice call",
                  status: personalCall.isVideoOn ? "Video on" : "Video off",
                }}
              >
                <AvatarFallback className="text-[12px]">
                  {personalCallInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-sm bg-black/55 px-1.5 py-0.5 text-[11px] text-white">
              {personalCall.isVideoOn ? (
                <Video className="size-3.5" />
              ) : (
                <VideoOff className="size-3.5" />
              )}
              {personalCall.isVideoOn ? "Video on" : "Video off"}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7"
            onClick={onToggleMute}
          >
            {personalCall.isMuted ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>

          {personalCall.mode === "video" && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-7"
              onClick={onToggleVideo}
            >
              {personalCall.isVideoOn ? (
                <Video className="size-4" />
              ) : (
                <VideoOff className="size-4" />
              )}
            </Button>
          )}

          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7"
            onClick={onToggleSpeaker}
          >
            {personalCall.isSpeakerOn ? (
              <Volume2 className="size-4" />
            ) : (
              <VolumeX className="size-4" />
            )}
          </Button>

          <Button
            size="icon-sm"
            className="ml-auto size-7 bg-destructive/75 text-white hover:bg-destructive"
            onClick={onEndCall}
          >
            <PhoneOff className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalCallWidget;
