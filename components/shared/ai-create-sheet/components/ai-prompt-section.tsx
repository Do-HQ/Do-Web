import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AiPromptSectionProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerateDraft: () => void;
  canGenerate: boolean;
  helperExamples?: string[];
};

export function AiPromptSection({
  prompt,
  onPromptChange,
  onGenerateDraft,
  canGenerate,
  helperExamples = [],
}: AiPromptSectionProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/35 bg-muted/20 p-3">
      <div className="space-y-1">
        <div className="text-[13px] font-medium">Describe what you want to create</div>
        <div className="text-muted-foreground text-[12px] leading-5">
          Use natural language. The draft is generated locally for now, then you review and submit.
        </div>
      </div>

      <Textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Create a design workflow for onboarding over the next two weeks"
        className="min-h-28"
      />

      {helperExamples.length ? (
        <div className="flex flex-wrap gap-2">
          {helperExamples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPromptChange(example)}
              className="text-muted-foreground hover:text-foreground rounded-md bg-background/70 px-2 py-1 text-left text-[11px] transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={onGenerateDraft}
        disabled={!canGenerate}
      >
        <Sparkles />
        Generate draft
      </Button>
    </div>
  );
}
