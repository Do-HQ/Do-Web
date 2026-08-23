"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** A single label/value line in the tooltip body. */
export type TimelineTooltipFact = {
  label: string;
  value: string;
};

export type TimelineBarTooltipProps = {
  title: string;
  /** Small line under the title — project, workflow, or similar. */
  subtitle?: string;
  facts?: (TimelineTooltipFact | null | undefined | false)[];
  /** Extra note shown at the bottom, e.g. "Dates are estimated". */
  note?: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

/**
 * Detail popover for timeline bars and calendar chips.
 *
 * These surfaces size themselves by duration, so a one-day task or a 20-minute
 * meeting ends up a few pixels wide with nowhere to put a label. Rather than
 * shrinking the type until it's unreadable, the bar stays a bar and the detail
 * moves here.
 *
 * The trigger is a wrapper rather than the bar itself so the hit area can be
 * padded out past the visible bar — see `TimelineBarHitArea`.
 */
export function TimelineBarTooltip({
  title,
  subtitle,
  facts = [],
  note,
  children,
  side = "top",
  className,
}: TimelineBarTooltipProps) {
  const visibleFacts = facts.filter(
    (fact): fact is TimelineTooltipFact =>
      Boolean(fact) && Boolean(fact && String(fact.value || "").trim()),
  );

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        showArrow={false}
        collisionPadding={12}
        className={cn(
          "bg-popover text-popover-foreground border-border max-w-[19rem] rounded-md border px-3 py-2.5 shadow-lg",
          className,
        )}
      >
        <p className="text-[12.5px] leading-5 font-semibold">{title}</p>

        {subtitle ? (
          <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-4">
            {subtitle}
          </p>
        ) : null}

        {visibleFacts.length ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {visibleFacts.map((fact) => (
              <React.Fragment key={fact.label}>
                <dt className="text-muted-foreground text-[11px] leading-4">
                  {fact.label}
                </dt>
                <dd className="text-right text-[11px] leading-4 font-medium tabular-nums">
                  {fact.value}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        ) : null}

        {note ? (
          <p className="text-muted-foreground/85 border-border/60 mt-2 border-t pt-2 text-[11px] leading-4">
            {note}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export type TimelineBarHitAreaProps = {
  left: number;
  width: number;
  /** Pixels of invisible padding added either side of the bar. */
  pad?: number;
  children: React.ReactNode;
};

/**
 * Positions a bar and gives it a hoverable area wider than itself.
 *
 * A bar can legitimately be 3px wide, which is not a pointer target. This
 * stretches the trigger to the full row height and pads it horizontally, while
 * the visible bar inside keeps its true width so the chart stays accurate.
 *
 * Clicks pass through to the surrounding row button, so opening the task from
 * a bar keeps working.
 */
export const TimelineBarHitArea = React.forwardRef<
  HTMLDivElement,
  TimelineBarHitAreaProps & React.HTMLAttributes<HTMLDivElement>
>(function TimelineBarHitArea(
  { left, width, pad = 8, children, className, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("absolute inset-y-0 z-10", className)}
      style={{ left: left - pad, width: width + pad * 2, ...style }}
      {...props}
    >
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ left: pad, width }}
      >
        {children}
      </div>
    </div>
  );
});
