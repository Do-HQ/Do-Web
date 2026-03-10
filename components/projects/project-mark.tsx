import { cn } from "@/lib/utils";

type ProjectMarkProps = {
  name: string;
  size?: "sm" | "md";
  className?: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (!parts.length) {
    return "PR";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProjectMark({
  name,
  size = "md",
  className,
}: ProjectMarkProps) {
  const initials = getInitials(name);
  const accentClasses = [
    "from-emerald-500/20 via-emerald-500/10 to-background border-emerald-500/25",
    "from-sky-500/20 via-sky-500/10 to-background border-sky-500/25",
    "from-amber-500/20 via-amber-500/10 to-background border-amber-500/25",
    "from-rose-500/20 via-rose-500/10 to-background border-rose-500/25",
  ];
  const accentIndex =
    name.split("").reduce((total, char) => total + char.charCodeAt(0), 0) %
    accentClasses.length;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-linear-to-br text-foreground shadow-xs",
        accentClasses[accentIndex],
        size === "sm"
          ? "size-7 text-[10px] font-semibold"
          : "size-9 text-[11px] font-semibold",
        className,
      )}
      aria-hidden="true"
    >
      <span className="relative z-10 tracking-[0.08em]">{initials}</span>
      <span className="absolute bottom-0.5 right-0.5 size-1.5 rounded-full bg-primary/85" />
    </div>
  );
}
