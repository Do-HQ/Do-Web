import type {
  StandupParticipantStatus,
  StandupSessionStatus,
} from "@/types/standup";
import dayjs from "dayjs";

export const formatStandupDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const formattedTime = dayjs(parsed).format("ddd DD MMMM, YYYY, HH:MM a");
  return formattedTime;
};

export const statusTone = (
  status?: StandupSessionStatus | StandupParticipantStatus | string,
) => {
  const normalized = String(status || "").toUpperCase();
  if (["OPEN", "SUBMITTED", "SUMMARIZED"].includes(normalized))
    return "success";
  if (["MISSED", "CLOSED"].includes(normalized)) return "danger";
  if (["IN_PROGRESS", "SCHEDULED"].includes(normalized)) return "warning";
  return "muted";
};

export const statusClassName = (status?: string) => {
  const tone = statusTone(status);
  if (tone === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-border bg-muted text-muted-foreground";
};

export const humanize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (part) => part.toUpperCase());
