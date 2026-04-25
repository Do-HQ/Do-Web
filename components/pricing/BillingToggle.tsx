"use client";

interface BillingToggleProps {
  yearly: boolean;
  onToggle: () => void;
}

export function BillingToggle({ yearly, onToggle }: BillingToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => yearly && onToggle()}
        className={`text-sm font-medium transition-colors duration-150 ${!yearly ? "text-foreground" : "text-muted-foreground"
          }`}
      >
        Monthly
      </button>

      <button
        onClick={onToggle}
        className="relative h-6 w-11 rounded-full border border-border bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        role="switch"
        aria-checked={yearly}
      >
        <span
          className="absolute top-0.5 left-0.5 size-4.5 rounded-full bg-foreground shadow-sm transition-transform duration-200"
          style={{ transform: yearly ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>

      <button
        onClick={() => !yearly && onToggle()}
        className={`text-sm font-medium transition-colors duration-150 ${yearly ? "text-foreground" : "text-muted-foreground"
          }`}
      >
        Yearly
      </button>

      <span
        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-opacity duration-200"
        style={{
          background: "color-mix(in oklch, var(--ring) 12%, transparent)",
          color: "var(--ring)",
          border: "1px solid color-mix(in oklch, var(--ring) 25%, transparent)",
          opacity: yearly ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        Save 35%
      </span>
    </div>
  );
}
