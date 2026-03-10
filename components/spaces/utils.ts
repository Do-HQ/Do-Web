import type { SpaceRoom, TeamCallWidgetState } from "./types";

export const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id_${Math.random().toString(36).slice(2, 10)}`;
};

export const getInitials = (
  firstName?: string,
  lastName?: string,
  email?: string,
) => {
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();

  if (fullName) {
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  return email?.slice(0, 2).toUpperCase() || "YO";
};

export const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

export const isDirectRoom = (room: SpaceRoom) => {
  return (
    room.id.startsWith("dm-") ||
    (room.visibility === "private" && room.members <= 2)
  );
};

export const parseTeamCallWidget = (
  raw: string | null,
): TeamCallWidgetState | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TeamCallWidgetState;
    if (
      (typeof parsed.roomId === "undefined" ||
        typeof parsed.roomId === "string") &&
      typeof parsed.roomName === "string" &&
      typeof parsed.roomScope === "string" &&
      (typeof parsed.callMode === "undefined" ||
        parsed.callMode === "voice" ||
        parsed.callMode === "video") &&
      typeof parsed.startedAt === "number" &&
      typeof parsed.isMuted === "boolean" &&
      typeof parsed.isVideoOn === "boolean" &&
      typeof parsed.isScreenSharing === "boolean"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};
