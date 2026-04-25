"use client";

import React, { useState } from "react";
import { plans, featureGroups } from "@/constants/pricingData";
import { BillingToggle } from "./BillingToggle";
import { PlanCard } from "./PlanCard";

export function PricingClient() {
  const [yearly, setYearly] = useState(true);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, honest pricing.
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            No hidden fees. No surprise bills. Pick the plan that fits today —
            upgrade any time.
          </p>
        </div>
        <div className="shrink-0">
          <BillingToggle
            yearly={yearly}
            onToggle={() => setYearly((y) => !y)}
          />
        </div>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            yearly={yearly}
            featureGroups={featureGroups}
          />
        ))}
      </div>
    </>
  );
}
