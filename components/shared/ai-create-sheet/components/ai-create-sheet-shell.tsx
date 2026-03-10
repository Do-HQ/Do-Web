import { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { AiModeToggle } from "./ai-mode-toggle";
import { AiPromptSection } from "./ai-prompt-section";
import { AiCreateSheetShellProps } from "../types";

type Props = AiCreateSheetShellProps & {
  footer: ReactNode;
};

export function AiCreateSheetShell({
  open,
  onOpenChange,
  title,
  description,
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  onGenerateDraft,
  canGenerate,
  isDraftReady,
  helperExamples,
  children,
  footer,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-border/50 sm:max-w-[28rem] lg:max-w-[31rem]"
      >
        <SheetHeader className="gap-3 border-b border-border/35 pb-4 pr-10">
          <div className="space-y-1.5">
            <SheetTitle className="text-[16px]">{title}</SheetTitle>
            <SheetDescription className="text-[12.5px] leading-5">
              {description}
            </SheetDescription>
          </div>
          <div className="flex justify-start">
            <AiModeToggle value={mode} onValueChange={onModeChange} />
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              {mode === "ai" ? (
                <AiPromptSection
                  prompt={prompt}
                  onPromptChange={onPromptChange}
                  onGenerateDraft={onGenerateDraft}
                  canGenerate={canGenerate}
                  helperExamples={helperExamples}
                />
              ) : null}

              {mode === "manual" || isDraftReady ? children : null}
            </div>
          </div>

          <SheetFooter className="border-t border-border/35 pt-3">{footer}</SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
