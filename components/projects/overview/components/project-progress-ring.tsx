import { cn } from "@/lib/utils";

type ProgressTone = "good" | "warning" | "danger" | "info";

type ProjectProgressRingProps = {
  value: number;
  tone?: ProgressTone;
  size?: number;
  strokeWidth?: number;
  className?: string;
  textClassName?: string;
};

const TONE_STYLES: Record<
  ProgressTone,
  { stroke: string; text: string; track: string }
> = {
  good: {
    stroke: "stroke-emerald-500",
    text: "text-emerald-600 dark:text-emerald-300",
    track: "stroke-emerald-500/20",
  },
  warning: {
    stroke: "stroke-amber-500",
    text: "text-amber-600 dark:text-amber-300",
    track: "stroke-amber-500/20",
  },
  danger: {
    stroke: "stroke-destructive",
    text: "text-destructive",
    track: "stroke-destructive/20",
  },
  info: {
    stroke: "stroke-primary",
    text: "text-primary",
    track: "stroke-primary/20",
  },
};

export function ProjectProgressRing({
  value,
  tone = "info",
  size = 34,
  strokeWidth = 3.5,
  className,
  textClassName,
}: ProjectProgressRingProps) {
  const clampedValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const center = size / 2;
  const radius = Math.max(1, center - strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - clampedValue / 100);
  const toneStyle = TONE_STYLES[tone];

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clampedValue}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn("transition-colors", toneStyle.track)}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          className={cn("transition-all duration-300 ease-out", toneStyle.stroke)}
        />
      </svg>
      <span
        className={cn(
          "pointer-events-none absolute text-[10px] font-semibold tracking-tight",
          toneStyle.text,
          textClassName,
        )}
      >
        {clampedValue}
      </span>
    </div>
  );
}
