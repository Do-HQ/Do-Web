"use client";

import { useEffect, useRef } from "react";
import { Bookmark, Gem, X, BookmarkX, Lock, Unlock } from "lucide-react";
import { usePathname } from "next/navigation";

import AskSquirclePage from "@/components/ask-squircle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { ROUTES } from "@/utils/constants";
import { PiCalendarStarBold } from "react-icons/pi";

const ScribeWidget = () => {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    showScribeWidget,
    setShowScribeWidget,
    scribeWidgetPinned,
    setScribeWidgetPinned,
  } = useAppStore();

  const isScribePage = pathname === ROUTES.ASK_SQUIRCLE;

  useEffect(() => {
    if (!showScribeWidget || scribeWidgetPinned) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setShowScribeWidget(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowScribeWidget(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showScribeWidget, scribeWidgetPinned, setShowScribeWidget]);

  if (isScribePage) {
    return null;
  }

  return (
    <>
      {/* Floating companion panel — no overlay, background stays interactive */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label="Squircle Intelligence AI assistant"
        className={cn(
          "fixed inset-y-3 right-3 z-60 flex w-[min(92vw,32rem)] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl shadow-black/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          showScribeWidget
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[calc(100%+24px)] opacity-0",
        )}
      >
        {/* Panel header */}
        <div className="flex h-12.5 shrink-0 items-center gap-2.5 border-b border-border/40 px-3.5">
          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50">
            <Gem className="size-3.75 text-foreground/65" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-none text-foreground">
              Squircle Intelligence
            </p>
            <p className="mt-0.75 text-[10.5px] leading-none text-muted-foreground">
              Workspace AI assistant
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant={scribeWidgetPinned ? "secondary" : "ghost"}
              className="size-7 rounded-lg"
              title={scribeWidgetPinned ? "Unpin" : "Keep open"}
              onClick={() => setScribeWidgetPinned(!scribeWidgetPinned)}
            >
              {scribeWidgetPinned ? (
                <Unlock className="size-3.5" />
              ) : (
                <Lock className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 rounded-lg"
              onClick={() => setShowScribeWidget(false)}
            >
              <X className="size-3.5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Panel body — only mount when visible to avoid running
            AI/billing hooks on every page regardless of whether Squircle Intelligence is open */}
        <div className="min-h-0 flex-1 overflow-hidden bg-background">
          {showScribeWidget ? <AskSquirclePage embedded /> : null}
        </div>
      </div>
    </>
  );
};

export default ScribeWidget;
