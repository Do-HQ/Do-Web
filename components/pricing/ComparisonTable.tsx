import React from "react";
import { Check, Minus } from "lucide-react";
import { plans, featureGroups } from "@/constants/pricingData";
import { Feature, PlanKey } from "@/types/pricing";

function FeatureValue({ val }: { val: boolean | string }) {
  if (val === false)
    return (
      <span className="flex justify-center">
        <Minus className="size-3.5 text-border" />
      </span>
    );
  if (val === true)
    return (
      <span className="flex justify-center">
        <Check className="size-4 text-foreground" strokeWidth={2.5} />
      </span>
    );
  return (
    <span className="block text-center text-xs font-medium text-foreground">
      {val}
    </span>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Header row */}
      <div className="grid grid-cols-4 border-b border-border">
        <div className="p-5" />
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`flex flex-col gap-1 border-l border-border p-5 ${plan.highlighted ? "bg-foreground" : "bg-card"
              }`}
          >
            <span
              className={`text-xs font-bold ${plan.highlighted ? "text-background" : "text-foreground"
                }`}
            >
              {plan.name}
            </span>
            <span
              className={`text-[11px] ${plan.highlighted ? "text-background/50" : "text-muted-foreground"
                }`}
            >
              {plan.monthlyPrice === null
                ? "Custom"
                : plan.monthlyPrice === 0
                  ? "Free"
                  : `From $${plan.yearlyPrice}/mo`}
            </span>
          </div>
        ))}
      </div>

      {featureGroups.map((group, gi) => (
        <React.Fragment key={group.group}>
          <div className="grid grid-cols-4 border-b border-border bg-muted/50">
            <div className="col-span-4 px-5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.group}
              </span>
            </div>
          </div>

          {group.features.map((feature: Feature, fi: number) => {
            const isLast =
              gi === featureGroups.length - 1 &&
              fi === group.features.length - 1;
            return (
              <div
                key={feature.label}
                className={`grid grid-cols-4 transition-colors hover:bg-muted/30 ${!isLast ? "border-b border-border" : ""
                  }`}
              >
                <div className="flex items-center px-5 py-3.5">
                  <span className="text-xs text-muted-foreground">
                    {feature.label}
                  </span>
                </div>
                {plans.map((plan) => (
                  <div
                    key={plan.key}
                    className={`flex items-center justify-center border-l border-border px-5 py-3.5 ${plan.highlighted ? "bg-foreground/2.5" : ""
                      }`}
                  >
                    <FeatureValue val={feature[plan.key as PlanKey]} />
                  </div>
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
