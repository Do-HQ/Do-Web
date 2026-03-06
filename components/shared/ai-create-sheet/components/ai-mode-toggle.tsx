import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AiCreateMode } from "../types";

type AiModeToggleProps = {
  value: AiCreateMode;
  onValueChange: (mode: AiCreateMode) => void;
};

export function AiModeToggle({ value, onValueChange }: AiModeToggleProps) {
  return (
    <div className="inline-flex rounded-md bg-muted/70 p-0.5">
      {(["ai", "manual"] as const).map((mode) => (
        <Button
          key={mode}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onValueChange(mode)}
          className={cn(
            "h-8 px-3 text-[12px] capitalize",
            value === mode
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode === "ai" ? "AI draft" : "Manual"}
        </Button>
      ))}
    </div>
  );
}
