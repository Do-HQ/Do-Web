"use client";

import { CircleHelp } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ProjectInfoTipProps = {
  content: string;
  className?: string;
  align?: "start" | "center" | "end";
};

export function ProjectInfoTip({
  content,
  className,
  align = "center",
}: ProjectInfoTipProps) {
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          className={cn(
            "text-muted-foreground/85 hover:text-foreground inline-flex size-4 items-center justify-center rounded-sm transition-colors",
            className,
          )}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        align={align}
        sideOffset={6}
        showArrow={false}
        className="bg-popover text-popover-foreground max-w-[18rem] rounded-sm border border-border px-2.5 py-2 text-[11.5px] leading-5 shadow-lg"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
