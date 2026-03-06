import { Hash, Lock, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SCOPE_META } from "../constants";
import type { SpaceRoom } from "../types";
import { isDirectRoom } from "../utils";

type RoomItemsProps = {
  roomEntries: SpaceRoom[];
  activeRoomId: string;
  onPick: (roomId: string) => void;
};

const RoomItems = ({ roomEntries, activeRoomId, onPick }: RoomItemsProps) => {
  return roomEntries.map((room) => {
    const ScopeIcon = SCOPE_META[room.scope].icon;
    const isActive = room.id === activeRoomId;
    const isDirectChat = isDirectRoom(room);

    return (
      <button
        key={room.id}
        type="button"
        onClick={() => onPick(room.id)}
        className={cn(
          "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
          isActive
            ? "bg-accent/55 border-border"
            : "border-transparent hover:bg-accent/35",
        )}
      >
        <div className="flex items-center gap-1.5">
          <ScopeIcon className="text-muted-foreground size-4" />
          <p className="truncate text-[13px] font-medium">{room.name}</p>
          {room.unread > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto rounded-full px-1.5 py-0 text-[11px]"
            >
              {room.unread}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 line-clamp-1 text-[12px]">
          {room.topic}
        </p>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {room.members}
          </span>
          <span className="inline-flex items-center gap-1">
            {isDirectChat ? (
              <Phone className="size-3.5" />
            ) : room.visibility === "private" ? (
              <Lock className="size-3.5" />
            ) : (
              <Hash className="size-3.5" />
            )}
            {isDirectChat
              ? "Direct"
              : room.visibility === "private"
                ? "Private"
                : "Open"}
          </span>
        </div>
      </button>
    );
  });
};

export default RoomItems;
