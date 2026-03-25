"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function WithSidebarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-6">
      <Empty className="max-w-xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle className="size-5 text-amber-500" />
          </EmptyMedia>
          <EmptyTitle>We hit an unexpected screen error</EmptyTitle>
          <EmptyDescription>
            This view ran into incomplete or unexpected data. We&apos;ve stopped the crash,
            and you can retry safely from here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="sm:max-w-none">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={reset}>
              <RefreshCcw className="size-4" />
              Try again
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
