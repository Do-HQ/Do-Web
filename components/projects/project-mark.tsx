import { FolderKanban } from "lucide-react";

import { cn } from "@/lib/utils";

type ProjectMarkProps = {
  name: string;
  size?: "sm" | "md";
  className?: string;
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "PR";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProjectMark({ name, size = "md", className }: ProjectMarkProps) {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-border/25 bg-gradient-to-br from-muted/80 via-muted/45 to-background text-foreground shadow-xs",
        size === "sm" ? "size-7 text-[10px] font-semibold" : "size-9 text-[11px] font-semibold",
        className,
      )}
      aria-hidden="true"
    >
      <FolderKanban className={cn("absolute opacity-15", size === "sm" ? "size-4" : "size-5")} />
      <span className="relative z-10 tracking-[0.08em]">{initials}</span>
    </div>
  );
}
