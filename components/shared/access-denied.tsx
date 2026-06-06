"use client";

import { ShieldOff } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type AccessDeniedProps = {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
};

export function AccessDenied({
  title = "Access restricted",
  description = "You don't have permission to view this content. Contact your workspace admin if you need access.",
  className,
  compact = false,
}: AccessDeniedProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 py-6",
        compact ? "min-h-[12rem]" : "h-full min-h-[calc(100dvh-8rem)]",
        className,
      )}
    >
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldOff className="size-5 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
