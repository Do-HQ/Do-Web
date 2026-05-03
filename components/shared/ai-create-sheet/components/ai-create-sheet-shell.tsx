import { ReactNode } from "react";
import { useRouter } from "next/navigation";

import useWorkspaceBilling from "@/hooks/use-workspace-billing";
import {
  estimateAiTokenCost,
  AI_DEFAULT_ESTIMATED_COSTS,
} from "@/lib/helpers/ai-token-cost";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
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
  aiDisabledReason,
  isGeneratingDraft,
  isDraftReady,
  helperExamples,
  children,
  footer,
}: Props) {
  const router = useRouter();
  const { workspaceId } = useWorkspaceStore();
  const workspaceBilling = useWorkspaceBilling();
  const normalizedWorkspaceId = String(workspaceId || "").trim();

  const billingSummaryQuery = workspaceBilling.useWorkspaceBillingSummary(
    normalizedWorkspaceId,
    undefined,
    {
      enabled: Boolean(
        open && normalizedWorkspaceId && mode === "ai",
      ),
    },
  );

  const tokenBalance = Number(
    billingSummaryQuery.data?.data?.workspace?.tokens?.balance || 0,
  );
  const estimatedTokenCost = estimateAiTokenCost({
    feature: "AI_DRAFT",
    prompt,
    contextMessages: 0,
    payloadSize: String(prompt || "").length,
  });
  const safeEstimatedTokenCost = Math.max(
    AI_DEFAULT_ESTIMATED_COSTS.aiDraft,
    estimatedTokenCost,
  );
  const hasTokenSnapshot = billingSummaryQuery.isSuccess;
  const hasInsufficientTokens =
    hasTokenSnapshot && tokenBalance < safeEstimatedTokenCost;
  const tokenGuardReason = hasInsufficientTokens
    ? `This draft needs about ${safeEstimatedTokenCost.toLocaleString()} tokens, but your workspace has ${tokenBalance.toLocaleString()}.`
    : "";
  const resolvedDisabledReason = aiDisabledReason || tokenGuardReason;
  const canGenerateWithTokenGuard = canGenerate && !hasInsufficientTokens;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-border/50 sm:max-w-[30rem] lg:max-w-[33rem]"
      >
        <SheetHeader className="gap-3 border-b border-border/35 bg-card/60 pb-4 pr-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-[15px] font-semibold">{title}</SheetTitle>
              {isDraftReady ? (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Draft ready
                </span>
              ) : null}
            </div>
            <SheetDescription className="text-[12px] leading-5">
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
                  canGenerate={canGenerateWithTokenGuard}
                  disabledReason={resolvedDisabledReason}
                  isGenerating={Boolean(isGeneratingDraft)}
                  helperExamples={helperExamples}
                  estimatedTokenCost={safeEstimatedTokenCost}
                  tokenBalance={tokenBalance}
                  onOpenBilling={() => router.push(ROUTES.SETTINGS_BILLING)}
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
