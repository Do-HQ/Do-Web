"use client";

import { useState } from "react";
import { Check, ArrowRight, Zap } from "lucide-react";
import type { Plan, PlanKey, FeatureGroup } from "@/types/pricing";

interface PlanCardProps {
  plan: Plan;
  yearly: boolean;
  featureGroups: FeatureGroup[];
}

export function PlanCard({ plan, yearly, featureGroups }: PlanCardProps) {
  const [hovered, setHovered] = useState(false);
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const hl = plan.highlighted;

  const includedFeatures = featureGroups
    .flatMap((g) => g.features)
    .filter((f) => f[plan.key as PlanKey] !== false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col gap-6 rounded-2xl p-7 transition-all duration-200 ${hl
        ? "bg-foreground text-background shadow-xl"
        : "border border-border bg-card hover:border-foreground/20"
        }`}
    >
      {hl && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground shadow-sm">
            <Zap className="size-2.5" />
            Most popular
          </span>
        </div>
      )}

      <div>
        <span
          className={`font-mono text-[10px] font-semibold tracking-widest uppercase transition-colors duration-200 ${hl ? "text-background/40" : hovered ? "" : "text-muted-foreground"
            }`}
          style={!hl && hovered ? { color: "var(--ring)" } : undefined}
        >
          {String(plan.index).padStart(2, "0")}
        </span>
        <h3
          className={`mt-0.5 text-xl font-bold tracking-tight ${hl ? "text-background" : "text-foreground"
            }`}
        >
          {plan.name}
        </h3>
        <p className={`mt-1 text-xs ${hl ? "text-background/50" : "text-muted-foreground"}`}>
          {plan.tagline}
        </p>
      </div>

      <div>
        {price === null ? (
          <span className="text-3xl font-bold tracking-tight">Custom</span>
        ) : price === 0 ? (
          <span className="text-4xl font-bold tracking-tight">Free</span>
        ) : (
          <div className="flex items-end gap-0.5">
            <span className={`mb-1 text-sm font-medium ${hl ? "text-background/60" : "text-muted-foreground"}`}>
              $
            </span>
            <span className="text-4xl font-bold tracking-tight leading-none">{price}</span>
            <span className={`mb-1 ml-0.5 text-xs font-medium ${hl ? "text-background/60" : "text-muted-foreground"}`}>
              /mo
            </span>
          </div>
        )}
        {yearly && price !== null && price > 0 && (
          <p className={`mt-1 text-[11px] ${hl ? "text-background/40" : "text-muted-foreground/60"}`}>
            Billed ${price * 12}/year
          </p>
        )}
      </div>

      <a
        href={plan.ctaHref}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${hl
          ? "bg-background text-foreground hover:bg-background/90"
          : "border border-border bg-transparent hover:bg-muted"
          }`}
      >
        {plan.cta}
        <ArrowRight className="size-3.5" />
      </a>

      <div className={`h-px w-full ${hl ? "bg-background/10" : "bg-border"}`} />

      <ul className="flex flex-col gap-3">
        {includedFeatures.map((f) => {
          const val = f[plan.key as PlanKey];
          return (
            <li key={f.label} className="flex items-center gap-2.5">
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full ${hl ? "bg-background/15" : "bg-muted"
                  }`}
              >
                <Check
                  className={`size-2.5 ${hl ? "text-background" : "text-foreground"}`}
                  strokeWidth={3}
                />
              </span>
              <span className={`text-xs ${hl ? "text-background/75" : "text-muted-foreground"}`}>
                {typeof val === "string" ? (
                  <>
                    <span className={`font-semibold ${hl ? "text-background" : "text-foreground"}`}>
                      {val}
                    </span>{" "}
                    {f.label.toLowerCase()}
                  </>
                ) : (
                  f.label
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
