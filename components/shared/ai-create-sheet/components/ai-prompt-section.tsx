import { ChevronRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AiPromptSectionProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerateDraft: () => void | Promise<void>;
  canGenerate: boolean;
  disabledReason?: string;
  isGenerating?: boolean;
  helperExamples?: string[];
  estimatedTokenCost?: number;
  tokenBalance?: number;
  onOpenBilling?: () => void;
};

export function AiPromptSection({
  prompt,
  onPromptChange,
  onGenerateDraft,
  canGenerate,
  disabledReason = "",
  isGenerating = false,
  helperExamples = [],
  estimatedTokenCost = 0,
  tokenBalance = 0,
  onOpenBilling,
}: AiPromptSectionProps) {
  const showEstimate = estimatedTokenCost > 0;
  const hasBalance = tokenBalance > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <div className="space-y-1">
        <div className="text-[13px] font-semibold">
          Describe what you want to create
        </div>
        <div className="text-muted-foreground text-[12px] leading-5">
          Write naturally. We generate a draft, then you review and edit before
          creating.
        </div>
      </div>

      <Textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Create a design workflow for onboarding over the next two weeks"
        className="min-h-28"
      />

      {disabledReason ? (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[11.5px] text-amber-700 dark:text-amber-300 space-y-2">
          <p>{disabledReason}</p>
          {typeof onOpenBilling === "function" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-amber-500/45 bg-transparent text-[11px] text-amber-700 hover:bg-amber-500/15 dark:text-amber-200"
              onClick={onOpenBilling}
            >
              Open billing
            </Button>
          ) : null}
        </div>
      ) : null}

      {showEstimate ? (
        <div className="text-muted-foreground text-[11px]">
          Est. {estimatedTokenCost.toLocaleString()} tokens
          {hasBalance ? ` · ${tokenBalance.toLocaleString()} left` : ""}
        </div>
      ) : null}

      {helperExamples.length ? (
        <div className="flex flex-wrap gap-2">
          {helperExamples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPromptChange(example)}
              className="text-muted-foreground hover:text-foreground hover:border-border/60 rounded-lg border border-transparent bg-muted/35 px-2.5 py-1 text-left text-[11px] transition-colors flex items-center gap-1"
            >
              <ChevronRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <span>{example}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={() => {
          void onGenerateDraft();
        }}
        disabled={!canGenerate || isGenerating || Boolean(disabledReason)}
      >
        <Star />
        Generate draft
      </Button>
    </div>
  );
}
