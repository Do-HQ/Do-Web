import type React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MentionSuggestionKind = "user" | "team" | "project" | "task";

const stripMentionPrefix = (value: string) =>
  String(value || "")
    .replace(/^(team|project)\s*:/i, "")
    .trim();

const deriveInitials = (value: string, fallback = "U") => {
  const normalized = stripMentionPrefix(value);
  if (!normalized) {
    return fallback;
  }

  const letters = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return letters || fallback;
};

export type MentionSuggestionRowProps = {
  label: string;
  highlightedLabel?: React.ReactNode;
  kind?: MentionSuggestionKind;
  avatarUrl?: string;
  avatarFallback?: string;
  subtitle?: string;
  focused?: boolean;
  className?: string;
};

export const MentionSuggestionRow = ({
  label,
  highlightedLabel,
  kind,
  avatarUrl,
  avatarFallback,
  subtitle,
  focused = false,
  className,
}: MentionSuggestionRowProps) => {
  const kindLabel =
    kind === "project"
      ? "Project"
      : kind === "task"
        ? "Task"
        : kind === "team"
          ? "Team"
          : "Member";
  const fallback =
    avatarFallback ||
    deriveInitials(
      label,
      kind === "project"
        ? "PR"
        : kind === "task"
          ? "TK"
          : kind === "team"
            ? "TM"
            : "U",
    );

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-1 py-1",
        focused && "bg-accent/60",
        className,
      )}
    >
      <Avatar className="size-5">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={label} /> : null}
        <AvatarFallback className="text-[10px]">{fallback}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-tight">
          {highlightedLabel || label}
        </p>
        <p className="text-muted-foreground truncate text-[10px] leading-tight">
          {subtitle || kindLabel}
        </p>
      </div>
    </div>
  );
};
