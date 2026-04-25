import React from "react";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PricingClient } from "@/components/pricing/PricingClient";
import { ComparisonTable } from "@/components/pricing/ComparisonTable";

export const metadata: Metadata = {
  title: "Pricing — Simple, honest plans",
  description:
    "Transparent pricing for individuals, growing teams, and enterprises. Start free, upgrade any time. No hidden fees.",
  openGraph: {
    title: "Pricing — Simple, honest plans",
    description:
      "Transparent pricing for individuals, growing teams, and enterprises. Start free, upgrade any time.",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">

        <div className="mb-10 flex items-center gap-3">
          <span
            className="h-px w-8 opacity-80"
            style={{ background: "var(--ring)" }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </span>
        </div>

        <div className="mb-16 flex flex-col gap-5">
          <PricingClient />
        </div>

        <div className="mb-10 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span
              className="h-px w-8 opacity-80"
              style={{ background: "var(--ring)" }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Compare plans
            </span>
          </div>
          <ComparisonTable />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 px-7 py-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Need something custom?
            </span>
            <span className="text-xs text-muted-foreground">
              We&apos;ll craft a plan around your team&apos;s exact needs and scale.
            </span>
          </div>
          <a
            href="/contact"
            className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Talk to sales
            <ArrowRight className="size-3.5" />
          </a>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/40">
          All prices in USD · Taxes may apply ·{" "}
          <a
            href="/terms"
            className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
          >
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}