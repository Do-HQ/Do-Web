import {
  Clock3,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamCallWidgetState } from "../types";

type TeamCallWidgetProps = {
  teamCallWidget: TeamCallWidgetState;
  teamCallDurationSeconds: number;
  formatCallDuration: (totalSeconds: number) => string;
  className?: string;
  onRejoin: () => void;
  onClear: () => void;
};

const TeamCallWidget = ({
  teamCallWidget,
  teamCallDurationSeconds,
  formatCallDuration,
  className,
  onRejoin,
  onClear,
}: TeamCallWidgetProps) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-3 z-20 w-[17rem] max-w-[calc(100%-1rem)]",
        className,
      )}
    >
      <div className="bg-background/95 border-border pointer-events-auto rounded-md border p-2.5 shadow-md backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <div className="bg-muted text-muted-foreground inline-flex size-7 items-center justify-center rounded-sm border">
            <Users className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">
              {teamCallWidget.roomName}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock3 className="size-3.5" />
              {formatCallDuration(teamCallDurationSeconds)}
            </p>
          </div>
          <Badge variant="secondary" className="text-[11px] capitalize">
            {teamCallWidget.roomScope}
          </Badge>
        </div>

        <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1">
            {teamCallWidget.isMuted ? (
              <MicOff className="size-3.5" />
            ) : (
              <Mic className="size-3.5" />
            )}
            {teamCallWidget.isMuted ? "Muted" : "Mic"}
          </span>
          <span className="inline-flex items-center gap-1">
            {teamCallWidget.isVideoOn ? (
              <Video className="size-3.5" />
            ) : (
              <VideoOff className="size-3.5" />
            )}
            {teamCallWidget.isVideoOn ? "Video" : "No video"}
          </span>
          {teamCallWidget.isScreenSharing && (
            <span className="inline-flex items-center gap-1">
              <MonitorUp className="size-3.5" />
              Share on
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-[13px]"
            onClick={onRejoin}
          >
            <Video className="size-4" />
            Rejoin
          </Button>
          <Button
            size="icon-sm"
            className="ml-auto size-7 bg-destructive/75 text-white hover:bg-destructive"
            onClick={onClear}
          >
            <PhoneOff className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamCallWidget;
