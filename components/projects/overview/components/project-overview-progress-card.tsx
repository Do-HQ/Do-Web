import { cn } from "@/lib/utils";

type ProjectOverviewProgressCardProps = {
  progress: number;
  riskHint?: string;
  label?: string;
  className?: string;
};

export function ProjectOverviewProgressCard({
  progress,
  riskHint,
  label = "Progress",
  className,
}: ProjectOverviewProgressCardProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 100));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
        <span className="text-[14px] font-semibold">{normalizedProgress}%</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      <p className="text-muted-foreground line-clamp-1 text-[12px] leading-5">
        {riskHint ?? "The current plan is holding steady in this view."}
      </p>
    </div>
  );
}
