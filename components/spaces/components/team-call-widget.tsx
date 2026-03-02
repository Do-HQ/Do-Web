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
            <Users className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">
              {teamCallWidget.roomName}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Clock3 className="size-3" />
              {formatCallDuration(teamCallDurationSeconds)}
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {teamCallWidget.roomScope}
          </Badge>
        </div>

        <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1">
            {teamCallWidget.isMuted ? (
              <MicOff className="size-3" />
            ) : (
              <Mic className="size-3" />
            )}
            {teamCallWidget.isMuted ? "Muted" : "Mic"}
          </span>
          <span className="inline-flex items-center gap-1">
            {teamCallWidget.isVideoOn ? (
              <Video className="size-3" />
            ) : (
              <VideoOff className="size-3" />
            )}
            {teamCallWidget.isVideoOn ? "Video" : "No video"}
          </span>
          {teamCallWidget.isScreenSharing && (
            <span className="inline-flex items-center gap-1">
              <MonitorUp className="size-3" />
              Share on
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={onRejoin}
          >
            <Video className="size-3.5" />
            Rejoin
          </Button>
          <Button
            size="icon-sm"
            className="ml-auto size-7 bg-destructive/75 text-white hover:bg-destructive"
            onClick={onClear}
          >
            <PhoneOff className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamCallWidget;
