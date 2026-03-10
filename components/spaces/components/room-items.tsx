import { useMemo } from "react";
import { Hash, Lock, Phone, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores";
import { SCOPE_META } from "../constants";
import type { SpaceRoom } from "../types";
import { isDirectRoom } from "../utils";

type RoomItemsProps = {
  roomEntries: SpaceRoom[];
  activeRoomId: string;
  onPick: (roomId: string) => void;
};

const RoomItems = ({ roomEntries, activeRoomId, onPick }: RoomItemsProps) => {
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const favoriteKeys = useMemo(
    () => new Set(favorites.map((item) => item.key)),
    [favorites],
  );

  return roomEntries.map((room) => {
    const ScopeIcon = SCOPE_META[room.scope].icon;
    const isActive = room.id === activeRoomId;
    const isDirectChat = isDirectRoom(room);
    const favoriteKey = `chat:${room.id}`;
    const isFavorite = favoriteKeys.has(favoriteKey);

    return (
      <div
        key={room.id}
        role="button"
        tabIndex={0}
        onClick={() => onPick(room.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPick(room.id);
          }
        }}
        className={cn(
          "w-full cursor-pointer rounded-md border px-2.5 py-2 text-left transition-colors outline-none",
          isActive
            ? "bg-accent/55 border-border"
            : "border-transparent hover:bg-accent/35",
        )}
      >
        <div className="flex items-center gap-1.5">
          <ScopeIcon className="text-muted-foreground size-4" />
          <p className="truncate text-[13px] font-medium">{room.name}</p>
          <button
            type="button"
            className={cn(
              "text-muted-foreground hover:text-foreground ml-auto inline-flex size-6 items-center justify-center rounded-md transition-colors",
              isFavorite && "text-amber-500",
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite({
                key: favoriteKey,
                type: "chat",
                label: room.name,
                subtitle: `${SCOPE_META[room.scope].label} chat`,
                href: `/spaces?room=${encodeURIComponent(room.id)}`,
              });
            }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={
              isFavorite ? "Remove chat from favorites" : "Add chat to favorites"
            }
          >
            <Star className={cn("size-3.5", isFavorite && "fill-current")} />
          </button>
          {room.unread > 0 && (
            <Badge
              variant="secondary"
              className="rounded-full px-1.5 py-0 text-[11px]"
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
      </div>
    );
  });
};

export default RoomItems;
