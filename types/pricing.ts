export type PlanKey = "starter" | "pro" | "enterprise";

export type Feature = {
  label: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
};

export type FeatureGroup = {
  group: string;
  features: Feature[];
};

export type Plan = {
  index: number;
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  cta: string;
  ctaHref: string;
  highlighted: boolean;
};