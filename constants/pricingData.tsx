import { FeatureGroup, Plan } from "@/types/pricing";

export const plans: Plan[] = [
  {
    index: 1,
    key: "starter",
    name: "Starter",
    tagline: "For solo creators & small teams",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Get started free",
    ctaHref: "/signup",
    highlighted: false,
  },
  {
    index: 2,
    key: "pro",
    name: "Pro",
    tagline: "For teams that need to scale",
    monthlyPrice: 29,
    yearlyPrice: 19,
    cta: "Start 14-day trial",
    ctaHref: "/signup?plan=pro",
    highlighted: true,
  },
  {
    index: 3,
    key: "enterprise",
    name: "Enterprise",
    tagline: "For organizations that need control",
    monthlyPrice: null,
    yearlyPrice: null,
    cta: "Talk to sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

export const featureGroups: FeatureGroup[] = [
  {
    group: "Core",
    features: [
      { label: "Users", starter: "Up to 3", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Storage", starter: "5 GB", pro: "100 GB", enterprise: "Unlimited" },
      { label: "Projects", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "API access", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    group: "Collaboration",
    features: [
      { label: "Team workspaces", starter: false, pro: true, enterprise: true },
      { label: "Comments & approvals", starter: false, pro: true, enterprise: true },
      { label: "Role management", starter: false, pro: true, enterprise: true },
      { label: "SSO / SAML", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    group: "Support",
    features: [
      { label: "Support channel", starter: "Email", pro: "Priority email", enterprise: "Dedicated" },
      { label: "SLA guarantee", starter: false, pro: false, enterprise: true },
      { label: "Onboarding call", starter: false, pro: false, enterprise: true },
    ],
  },
];
