import type { SpaceRoom, TeamCallWidgetState } from "./types";

export type ParsedJamShareMessage = {
  jamId: string;
  route: string;
  title: string;
  note: string;
};

const JAM_ROUTE_PATTERN = /\/jams\?jam=([a-zA-Z0-9_-]+)/i;
const JAM_CANVAS_ROUTE_PATTERN = /\/jams\/([a-zA-Z0-9_-]+)/i;

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
      (typeof parsed.roomKind === "undefined" ||
        parsed.roomKind === "direct" ||
        parsed.roomKind === "group" ||
        parsed.roomKind === "project" ||
        parsed.roomKind === "task") &&
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

export const parseJamShareMessage = (
  value: string,
): ParsedJamShareMessage | null => {
  const content = String(value || "").trim();
  if (!content) {
    return null;
  }

  const routeMatch = content.match(JAM_ROUTE_PATTERN);
  const canvasRouteMatch = content.match(JAM_CANVAS_ROUTE_PATTERN);
  const jamIdCandidate = routeMatch?.[1] || canvasRouteMatch?.[1] || "";

  if (!jamIdCandidate) {
    return null;
  }

  const jamId = decodeURIComponent(String(jamIdCandidate || "").trim());
  if (!jamId) {
    return null;
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const routeLineIndex = lines.findIndex(
    (line) =>
      JAM_ROUTE_PATTERN.test(line) || JAM_CANVAS_ROUTE_PATTERN.test(line),
  );
  const headerLine = lines[0] || "";
  const headerTitleSplit = headerLine.split("shared a jam:");
  const hasShareHeader = headerTitleSplit.length > 1;
  const parsedHeaderTitle = hasShareHeader
    ? String(headerTitleSplit.slice(1).join("shared a jam:") || "").trim()
    : "";
  const firstMeaningfulLine =
    routeLineIndex === 0 ? lines[1] || "" : lines[0] || "";
  const title = parsedHeaderTitle || firstMeaningfulLine || "Shared jam";

  const note = lines
    .filter((line, index) => {
      if (!line) {
        return false;
      }
      if (
        JAM_ROUTE_PATTERN.test(line) ||
        JAM_CANVAS_ROUTE_PATTERN.test(line)
      ) {
        return false;
      }
      if (index === 0 && hasShareHeader) {
        return false;
      }
      if (line === title) {
        return false;
      }
      return true;
    })
    .join("\n");

  return {
    jamId,
    route: `/jams/${encodeURIComponent(jamId)}`,
    title,
    note,
  };
};
