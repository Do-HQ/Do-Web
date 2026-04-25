"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import LoaderComponent from "@/components/shared/loader";
import { getUser } from "@/lib/services/user-service";
import { resolveUserStartRoute } from "@/lib/helpers/user-preferences";
import useAuthStore from "@/stores/auth";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn, IMAGES } from "@/lib/utils";
import Logo from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Check, ChevronDown, ExternalLink, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

const infoLinks = [
  {
    chapter: "01",
    title: "Plans & Pricing",
    description: "Compare plans for individuals, teams, and organizations.",
    targetId: "plans-pricing",
    label: "View Plans & Pricing",
  },
  {
    chapter: "02",
    title: "Features",
    description: "See the tools that keep work moving in one place.",
    targetId: "features",
    label: "View Features",
  },
  {
    chapter: "03",
    title: "How it works",
    description: "Understand the flow from idea to shipped work.",
    targetId: "how-it-works",
    label: "View How it works",
  },
  {
    chapter: "04",
    title: "FAQs",
    description: "Answers for setup, teams, security, and billing.",
    targetId: "faqs",
    label: "View FAQs",
  },
  {
    chapter: "05",
    title: "Contact / Support",
    description: "Get help choosing a plan or setting up your workspace.",
    targetId: "contact-support",
    label: "View Contact / Support",
  },
];

const PLAN_LIMITS = {
  free: {
    members: 5,
    projects: 3,
    storageGb: 0.5,
    aiCredits: 0,
    hasAiProjectManager: false,
    hasAdvancedAutomation: false,
    hasAuditLogs: false,
    hasSso: false,
  },
  pro: {
    members: "unlimited",
    projects: "unlimited",
    storageGb: 10,
    aiCredits: 500,
    hasAiProjectManager: false,
    hasAdvancedAutomation: false,
    hasAuditLogs: false,
    hasSso: false,
  },
  business: {
    members: "unlimited",
    projects: "unlimited",
    storageGb: 50,
    aiCredits: 5000,
    hasAiProjectManager: true,
    hasAdvancedAutomation: true,
    hasAuditLogs: true,
    hasSso: false,
  },
  enterprise: {
    members: "custom",
    projects: "custom",
    storageGb: "custom",
    aiCredits: "custom",
    hasAiProjectManager: true,
    hasAdvancedAutomation: true,
    hasAuditLogs: true,
    hasSso: true,
  },
} as const;

type PricingPlan = {
  key: keyof typeof PLAN_LIMITS;
  name: string;
  description: string;
  price: string;
  suffix?: string;
  cta: string;
  recommended: boolean;
  features: string[];
};

const pricingPlans: PricingPlan[] = [
  {
    key: "free",
    name: "Free",
    description: "For individuals and small teams getting started.",
    price: "$0",
    cta: "Start free",
    recommended: false,
    features: [
      "Projects: limited",
      "Workflows: basic",
      "Jams: limited",
      "Security: basic",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    description:
      "For teams running projects, docs, spaces, and workflows together",
    price: "$12",
    suffix: "/ member / month",
    cta: "Start with Pro",
    recommended: true,
    features: [
      "Projects: full access",
      "AI Agent: limited",
      "Automation: basic",
      "Security: standard",
    ],
  },
  {
    key: "business",
    name: "Business",
    description:
      "For growing organizations that need controls, integrations, and support.",
    price: "$29",
    suffix: "/ member / month",
    cta: "Start with Business",
    recommended: false,
    features: [
      "AI Agent and advanced automation",
      "Analytics and audit logs",
      "Advanced permissions",
      "Security: advanced",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description:
      "For enterprise-scale deployment, governance, and security requirements.",
    price: "Custom",
    cta: "Talk to sales",
    recommended: false,
    features: [
      "Custom limits and contract terms",
      "Enterprise-grade security",
      "SSO and governance controls",
      "Dedicated implementation path",
    ],
  },
];

const featureCategories = [
  {
    title: "Planning and delivery",
    points: [
      "Projects, workflows, tasks, and subtasks",
      "Dependencies, due dates, and workflow timelines",
      "Template-based project and task setup",
      "Calendar views for execution planning",
    ],
  },
  {
    title: "Collaboration and communication",
    points: [
      "Spaces for direct, group, project, and task conversations",
      "Mentions, threads, reactions, and pinned context",
      "Voice calls and screen sharing in workspace flow",
      "Message-linked activity across workstreams",
    ],
  },
  {
    title: "Docs, knowledge, and onboarding",
    points: [
      "Collaborative docs with controlled sharing",
      "Workspace knowledge base and curated content",
      "Searchable internal knowledge surfaces",
      "Onboarding guidance for new members",
    ],
  },
  {
    title: "Visual collaboration",
    points: [
      "Jams for planning, ideation, and visual alignment",
      "Pinned Jam comments with threaded discussion",
      "Mentions and notifications inside Jam threads",
      "Canvas-first collaboration with persistent context",
    ],
  },
  {
    title: "Portfolio and governance",
    points: [
      "Portfolio rollups across projects and teams",
      "OKR tracking and progress visibility",
      "Resource utilization and capacity planning",
      "Approvals, risk workflows, and auditability",
    ],
  },
  {
    title: "Automation, AI, and operations",
    points: [
      "AI-assisted planning and execution support",
      "Automation policies and workflow triggers",
      "Support center with ticket operations",
      "Archive, notifications, and admin controls",
    ],
  },
  {
    title: "Security and access control",
    points: [
      "Workspace-scoped roles and permissions",
      "Secrets policy and protected mutations",
      "Approval and access governance",
      "Enterprise SSO and advanced controls on higher tiers",
    ],
  },
] as const;

const howItWorksSteps = [
  {
    step: "01",
    title: "Set up your workspace",
    detail: "Create your workspace, invite teammates, and define roles.",
    outcome: "Team structure and access are live.",
  },
  {
    step: "02",
    title: "Plan and align",
    detail: "Break goals into projects, tasks, docs, and priorities.",
    outcome: "Execution scope and ownership are clear.",
  },
  {
    step: "03",
    title: "Collaborate in flow",
    detail: "Work in spaces and threads while keeping context attached.",
    outcome: "Decisions, updates, and delivery stay connected.",
  },
  {
    step: "04",
    title: "Review and improve",
    detail: "Use portfolio insights and reports to tighten execution.",
    outcome: "Continuous improvement and predictable delivery.",
  },
];

const faqGroups = [
  {
    id: "getting-started",
    label: "Getting started",
    items: [
      {
        question: "Can I start for free?",
        answer:
          "Yes. The Free plan is available and supports core workspace workflows.",
      },
      {
        question: "How quickly can a team onboard?",
        answer:
          "Most teams get configured in under an hour with workspace setup, members, and initial projects.",
      },
      {
        question: "Can I migrate existing project data?",
        answer:
          "Yes. Import support is available for workspace setup and phased migrations.",
      },
      {
        question: "Can we run a pilot before full rollout?",
        answer:
          "Yes. Many teams start with one workspace and expand after validating process fit.",
      },
    ],
  },
  {
    id: "plans-billing",
    label: "Plans & billing",
    items: [
      {
        question: "Can I upgrade later?",
        answer:
          "Yes. You can move between plans as your team and governance needs grow.",
      },
      {
        question: "Do you support annual billing?",
        answer:
          "Yes. Annual plans are available for teams that want simpler procurement cycles.",
      },
      {
        question: "What happens if we exceed limits?",
        answer:
          "You’ll be prompted in product to upgrade or adjust usage before limits block new actions.",
      },
      {
        question: "Do you provide enterprise contracts?",
        answer:
          "Yes. Enterprise includes custom terms, governance controls, and dedicated onboarding.",
      },
    ],
  },
  {
    id: "security-access",
    label: "Security & access",
    items: [
      {
        question: "Do you support role-based access control?",
        answer:
          "Yes. Workspace roles and permissions define who can view, edit, and manage data.",
      },
      {
        question: "Are approvals configurable?",
        answer:
          "Yes. Approval policies can be configured for sensitive actions and operational controls.",
      },
      {
        question: "Do you support SSO?",
        answer:
          "SSO is available on Enterprise with advanced identity and access requirements.",
      },
      {
        question: "Are actions auditable?",
        answer:
          "Business and Enterprise plans include stronger auditability for governance-critical actions.",
      },
    ],
  },
  {
    id: "adoption-support",
    label: "Adoption & support",
    items: [
      {
        question: "How do we get support?",
        answer:
          "You can use in-app support, docs, and direct support channels based on plan level.",
      },
      {
        question: "Do you help with implementation?",
        answer:
          "Yes. Business and Enterprise include structured onboarding and rollout guidance.",
      },
      {
        question: "Can we train team leads and admins?",
        answer:
          "Yes. We support admin enablement and team lead setup patterns as part of onboarding.",
      },
      {
        question: "Do you offer best-practice playbooks?",
        answer:
          "Yes. Implementation guidance covers project structures, approvals, and team operating cadence.",
      },
    ],
  },
] as const;

const supportChannels = [
  {
    title: "Sales",
    detail: "Plan selection, pricing guidance, and rollout help.",
    cta: "Talk to sales",
    response: "Typical response: 1 business day",
  },
  {
    title: "Support",
    detail: "Troubleshooting, configuration help, and workspace setup.",
    cta: "Contact support",
    response: "Priority queues available on higher tiers",
  },
  {
    title: "Help Center",
    detail: "Self-serve documentation and walkthroughs for your team.",
    cta: "View docs",
    response: "Available anytime",
  },
];

type ComparisonValue = "yes" | "no" | string;

type PlanComparisonRow = {
  capability: string;
  free: ComparisonValue;
  pro: ComparisonValue;
  business: ComparisonValue;
  enterprise: ComparisonValue;
};

const planComparisonRows: PlanComparisonRow[] = [
  {
    capability: "Projects",
    free: "Limited",
    pro: "yes",
    business: "yes",
    enterprise: "yes",
  },
  {
    capability: "Workflows",
    free: "Basic",
    pro: "yes",
    business: "Advanced",
    enterprise: "Advanced",
  },
  {
    capability: "Spaces (chat)",
    free: "yes",
    pro: "yes",
    business: "yes",
    enterprise: "yes",
  },
  {
    capability: "Jams",
    free: "Limited",
    pro: "yes",
    business: "yes",
    enterprise: "yes",
  },
  {
    capability: "AI Agent",
    free: "no",
    pro: "Limited",
    business: "yes",
    enterprise: "yes",
  },
  {
    capability: "Automation",
    free: "no",
    pro: "Basic",
    business: "Advanced",
    enterprise: "Advanced",
  },
  {
    capability: "Permissions",
    free: "Basic",
    pro: "Basic",
    business: "Advanced",
    enterprise: "Advanced",
  },
  {
    capability: "Analytics",
    free: "no",
    pro: "no",
    business: "yes",
    enterprise: "yes",
  },
  {
    capability: "Security",
    free: "Basic",
    pro: "Standard",
    business: "Advanced",
    enterprise: "Enterprise-grade",
  },
];

type IllustrationPlaceholderProps = {
  title: string;
  subtitle: string;
  className?: string;
};

function IllustrationPlaceholder({
  title,
  subtitle,
  className,
}: IllustrationPlaceholderProps) {
  return (
    <div
      className={cn(
        "bg-muted/45 border-border/70 flex w-full flex-col justify-between rounded-lg border border-dashed p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px]">
          Image placeholder
        </Badge>
      </div>
      <p className="text-muted-foreground max-w-md text-xs leading-5">
        {subtitle}
      </p>
    </div>
  );
}

function formatLimitValue(value: string | number, suffix?: string) {
  if (typeof value === "number") {
    return `${value}${suffix ? ` ${suffix}` : ""}`;
  }
  return value;
}

function renderComparisonValue(value: ComparisonValue) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <Check className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    );
  }

  if (value === "no") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }

  return <span>{value}</span>;
}

export default function Home() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [checkedToken, setCheckedToken] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isHeroLocked, setIsHeroLocked] = useState(true);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const findOutMoreRef = useRef<HTMLElement | null>(null);
  const previousScrollTopRef = useRef(0);
  const relockTimeoutRef = useRef<number | null>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const container = scrollContainerRef.current;
    const target =
      container?.querySelector<HTMLElement>(`#${sectionId}`) ?? null;
    if (!container || !target) {
      return;
    }

    setIsHeroLocked(false);

    window.requestAnimationFrame(() => {
      container.scrollTo({
        top: target.offsetTop,
        behavior: "smooth",
      });
    });
  }, []);

  const scrollToFindOutMore = useCallback(() => {
    scrollToSection("find-out-more");
  }, [scrollToSection]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    container.scrollTop = 0;
    window.scrollTo(0, 0);

    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      const accessToken = localStorage.getItem(LOCAL_KEYS.TOKEN);
      const nextHasToken = Boolean(accessToken);
      setHasToken(nextHasToken);

      if (nextHasToken) {
        try {
          const response = await getUser();
          const authenticatedUser = response?.data?.user;
          setUser(authenticatedUser);

          router.replace(
            resolveUserStartRoute({
              user: authenticatedUser,
              workspaceId: authenticatedUser?.currentWorkspaceId?._id,
            }),
          );
          setCheckedToken(true);
          return;
        } catch {
          localStorage.removeItem(LOCAL_KEYS.TOKEN);
          localStorage.removeItem(LOCAL_KEYS.REFRESH_TOKEN);
          setUser(null);
          setHasToken(false);
        }
      }

      setCheckedToken(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router, setUser]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    if (isHeroLocked) {
      container.scrollTop = 0;
      previousScrollTopRef.current = 0;
      return;
    }

    previousScrollTopRef.current = container.scrollTop;

    const onScroll = () => {
      const currentTop = container.scrollTop;
      const isScrollingUp = currentTop < previousScrollTopRef.current;
      previousScrollTopRef.current = currentTop;

      if (isScrollingUp && currentTop <= 16) {
        container.scrollTo({ top: 0, behavior: "smooth" });

        if (relockTimeoutRef.current) {
          window.clearTimeout(relockTimeoutRef.current);
        }

        relockTimeoutRef.current = window.setTimeout(() => {
          setIsHeroLocked(true);
        }, 220);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (relockTimeoutRef.current) {
        window.clearTimeout(relockTimeoutRef.current);
      }
    };
  }, [isHeroLocked]);

  if (!checkedToken) {
    return <LoaderComponent />;
  }

  if (hasToken) {
    return <LoaderComponent />;
  }

  return (
    <main
      ref={scrollContainerRef}
      className={cn(
        "bg-background text-foreground h-[100dvh] w-full overflow-x-hidden",
        isHeroLocked
          ? "overflow-y-hidden"
          : "overflow-y-auto snap-y snap-mandatory",
      )}
    >
      <section className="relative flex min-h-[100dvh] w-full snap-start overflow-hidden">
        <div className="bg-background/35 absolute inset-0" />

        <div className="relative z-10 flex w-full flex-col">
          <header className="px-4 py-4 sm:px-10 flex items-center justify-center">
            <Logo isFull />
          </header>

          <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 pb-12 sm:px-10">
            <div className="w-full space-y-3">
              <h1 className="text-primary text-2xl leading-none font-semibold tracking-tight sm:text-8">
                squircle
                <sup className="text-foreground/90 ml-0.5 text-[11px]">1</sup>
              </h1>

              <div className="text-muted-foreground space-y-1">
                <p className="text-sm font-medium font-sans leading-none italic">
                  /ˈskwɝː.kəl/
                </p>
                <p className="text-sm font-medium font-sans leading-none italic">
                  noun, verb (workplace slang)
                </p>
              </div>

              <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6">
                <li>
                  <p>
                    to quickly square up a task, then circle back with updates.
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[12px]">
                    &quot;let&apos;s squircle after standup and close this
                    before lunch&quot;
                  </p>
                </li>
                <li>
                  <p>
                    a compact working loop where alignment and execution happen
                    in one flow.
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[12px]">
                    &quot;we&apos;ll squircle this later, then ship by EOD&quot;
                  </p>
                </li>
              </ol>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
                <Link
                  href={ROUTES.SIGN_IN}
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "h-9 rounded-md px-4 text-[13px]",
                  )}
                >
                  Start squircling
                  <ArrowRight />
                </Link>
                <button
                  type="button"
                  aria-controls="find-out-more"
                  aria-label="Find out more"
                  onClick={scrollToFindOutMore}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "default" }),
                    "h-9 rounded-md px-4 text-[13px]",
                  )}
                >
                  Find out more
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={findOutMoreRef}
        id="find-out-more"
        aria-labelledby="find-out-more-heading"
        className="relative z-10 min-h-[100dvh] w-full snap-start"
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl space-y-2">
            <h2
              id="find-out-more-heading"
              className="text-xl font-semibold leading-tight"
            >
              Find out more
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Use this index to jump through the landing content.
            </p>
          </div>

          <nav aria-label="Landing page table of contents" className="w-full">
            <ol className="divide-border/70 border-border/70 divide-y border-y">
              {infoLinks.map((item) => (
                <li key={item.title}>
                  <button
                    type="button"
                    aria-label={item.label}
                    onClick={() => scrollToSection(item.targetId)}
                    className="group w-full py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground min-w-9 text-xs font-medium tracking-[0.16em] uppercase">
                        {item.chapter}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-medium">{item.title}</h3>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors group-hover:text-foreground">
                        Open
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Image
              src={IMAGES.TABLE_OF_CONTENT}
              alt="Table of Content"
              height={176}
              width={200}
              className="w-full h-full max-h-100"
            />

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Reading guide</CardTitle>
                <CardDescription>
                  Start with pricing, then jump to features and workflow. Use
                  FAQs and support when you need detail or implementation help.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="text-muted-foreground list-decimal space-y-1 pl-4 text-sm leading-6">
                  <li>Pick the plan that matches your team stage.</li>
                  <li>Review feature and process fit.</li>
                  <li>Reach out for onboarding support.</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        id="plans-pricing"
        aria-labelledby="plans-pricing-heading"
        className="w-full min-h-[100dvh] snap-start scroll-mt-8"
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-5 max-w-2xl space-y-2">
            <Badge variant="outline">Plans & Pricing</Badge>
            <h2
              id="plans-pricing-heading"
              className="text-xl font-semibold leading-tight"
            >
              Choose the plan that fits your flow
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Start small, then grow into shared projects, docs, integrations,
              and controls when your team needs them.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "shadow-none",
                  plan.recommended &&
                    "border-primary/45 ring-primary/10 ring-1",
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>
                      <h3 className="text-base">{plan.name}</h3>
                    </CardTitle>
                    {plan.recommended ? (
                      <Badge variant="outline">Recommended</Badge>
                    ) : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-semibold leading-none">
                        {plan.price}
                      </span>
                      {plan.suffix ? (
                        <span className="text-muted-foreground text-[12px] leading-none">
                          {plan.suffix}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2 text-sm leading-5"
                      >
                        <Check
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="bg-muted/45 rounded-md p-3">
                    <p className="mb-2 text-xs font-medium uppercase">
                      Plan limits
                    </p>
                    <div className="text-muted-foreground space-y-1 text-xs">
                      <p>
                        Members:{" "}
                        {formatLimitValue(PLAN_LIMITS[plan.key].members)}
                      </p>
                      <p>
                        Projects:{" "}
                        {formatLimitValue(PLAN_LIMITS[plan.key].projects)}
                      </p>
                      <p>
                        Storage:{" "}
                        {formatLimitValue(
                          PLAN_LIMITS[plan.key].storageGb,
                          "GB",
                        )}
                      </p>
                      <p>
                        AI Credits:{" "}
                        {formatLimitValue(PLAN_LIMITS[plan.key].aiCredits)}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Link
                    href={ROUTES.SIGN_IN}
                    aria-label={plan.cta}
                    className={cn(
                      buttonVariants({
                        variant: plan.recommended ? "default" : "outline",
                        size: "default",
                      }),
                      "h-9 w-full rounded-md px-4 text-[13px]",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <Image
              src={IMAGES.PLAN_AND_PRICING}
              alt="Plan and Pricing"
              height={176}
              width={200}
              className="w-full h-full max-h-100"
            />

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Plan comparison</CardTitle>
                <CardDescription>
                  Free, Pro, Business, and Enterprise capability matrix.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-xs">
                  <thead>
                    <tr>
                      <th className="text-foreground border-border/70 border-b px-2 py-2 font-medium">
                        Feature
                      </th>
                      <th className="text-foreground border-border/70 border-b px-2 py-2 font-medium">
                        Free
                      </th>
                      <th className="text-foreground border-border/70 border-b px-2 py-2 font-medium">
                        Pro
                      </th>
                      <th className="text-foreground border-border/70 border-b px-2 py-2 font-medium">
                        Business
                      </th>
                      <th className="text-foreground border-border/70 border-b px-2 py-2 font-medium">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {planComparisonRows.map((row) => (
                      <tr key={row.capability}>
                        <td className="border-border/60 border-b px-2 py-2 font-medium">
                          {row.capability}
                        </td>
                        <td className="text-muted-foreground border-border/60 border-b px-2 py-2">
                          {renderComparisonValue(row.free)}
                        </td>
                        <td className="text-muted-foreground border-border/60 border-b px-2 py-2">
                          {renderComparisonValue(row.pro)}
                        </td>
                        <td className="text-muted-foreground border-border/60 border-b px-2 py-2">
                          {renderComparisonValue(row.business)}
                        </td>
                        <td className="text-muted-foreground border-border/60 border-b px-2 py-2">
                          {renderComparisonValue(row.enterprise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        id="features"
        aria-labelledby="features-heading"
        className="w-full min-h-[100dvh] snap-start scroll-mt-8"
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-2xl space-y-2">
            <Badge variant="outline">Features</Badge>
            <h2
              id="features-heading"
              className="text-xl font-semibold leading-tight"
            >
              Full product capability map
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Squircle combines planning, collaboration, documentation, insight,
              security, and support in one connected workspace.
            </p>
          </div>

          <div className="mb-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            {/* <IllustrationPlaceholder
              title="Feature system placeholder"
              subtitle="Drop a full product feature map visual, UI collage, or illustrated overview here."
              className="min-h-52 md:min-h-60"
            /> */}
            <Image
              src={IMAGES.FEATURES}
              alt="Plan and Pricing"
              height={150}
              width={200}
              className="w-full h-full max-h-80"
            />

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">What teams get</CardTitle>
                <CardDescription>
                  One place for execution, context, governance, and visibility.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <div className="bg-muted/45 rounded-md p-3">
                  <p className="text-lg font-semibold">Execution</p>
                  <p className="text-muted-foreground text-xs">
                    Projects, workflows, and tasks
                  </p>
                </div>
                <div className="bg-muted/45 rounded-md p-3">
                  <p className="text-lg font-semibold">Collaboration</p>
                  <p className="text-muted-foreground text-xs">
                    Spaces, calls, and mentions
                  </p>
                </div>
                <div className="bg-muted/45 rounded-md p-3">
                  <p className="text-lg font-semibold">Knowledge</p>
                  <p className="text-muted-foreground text-xs">
                    Docs and knowledge base
                  </p>
                </div>
                <div className="bg-muted/45 rounded-md p-3">
                  <p className="text-lg font-semibold">Governance</p>
                  <p className="text-muted-foreground text-xs">
                    Approvals, permissions, auditability
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featureCategories.map((category) => (
              <Card key={category.title} className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1 text-sm leading-6">
                    {category.points.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="w-full min-h-[100dvh] snap-start scroll-mt-8"
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-2xl space-y-2">
            <Badge variant="outline">How it works</Badge>
            <h2
              id="how-it-works-heading"
              className="text-xl font-semibold leading-tight"
            >
              From setup to delivery in four steps
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              A compact operating loop your team can adopt quickly.
            </p>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <div className="bg-muted/45 rounded-md p-3">
              <p className="text-base font-semibold">Week 1</p>
              <p className="text-muted-foreground text-xs">
                Workspace setup and team alignment
              </p>
            </div>
            <div className="bg-muted/45 rounded-md p-3">
              <p className="text-base font-semibold">Week 2+</p>
              <p className="text-muted-foreground text-xs">
                Execution cadence and dependency flow
              </p>
            </div>
            <div className="bg-muted/45 rounded-md p-3">
              <p className="text-base font-semibold">Continuous</p>
              <p className="text-muted-foreground text-xs">
                Risk control, reporting, and iteration
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <ol className="space-y-2">
              {howItWorksSteps.map((item) => (
                <li key={item.step}>
                  <Card className="shadow-none">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <span className="text-muted-foreground min-w-9 pt-0.5 text-xs font-medium tracking-[0.16em] uppercase">
                          {item.step}
                        </span>
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            {item.title}
                          </CardTitle>
                          <CardDescription>{item.detail}</CardDescription>
                          <p className="text-foreground/85 text-xs font-medium">
                            Outcome: {item.outcome}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              ))}

              <Image
                src={IMAGES.HOW_IT_WORKS_2}
                alt="How it works"
                height={150}
                width={200}
                className="w-full h-full max-h-80"
              />
            </ol>

            <div className="space-y-3">
              <Image
                src={IMAGES.HOW_IT_WORKS}
                alt="How it works"
                height={150}
                width={200}
                className="w-full h-full max-h-80"
              />
              <Card className="shadow-none">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Operating cadence</CardTitle>
                  <CardDescription>
                    A weekly rhythm that keeps work visible and accountable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm leading-6">
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      Monday
                    </p>
                    <p>Planning, assignment, and scope confirmation.</p>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      Midweek
                    </p>
                    <p>Delivery execution and blocker resolution.</p>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      Friday
                    </p>
                    <p>Review outcomes, log risks, and prep next loop.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Core artifacts</CardTitle>
                  <CardDescription>
                    Each cycle keeps these artifacts current.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1 text-sm leading-6">
                    <li>• Project scope and owners</li>
                    <li>• Workflow status and task updates</li>
                    <li>• Risks, decisions, and approvals</li>
                    <li>• Portfolio summary and next priorities</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section
        id="faqs"
        aria-labelledby="faqs-heading"
        className="w-full min-h-[100dvh] snap-start scroll-mt-8"
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-2xl space-y-2">
            <Badge variant="outline">FAQs</Badge>
            <h2
              id="faqs-heading"
              className="text-xl font-semibold leading-tight"
            >
              Common questions
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Fast answers to setup, pricing, and governance questions.
            </p>
          </div>

          <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_1.2fr] items-center">
            <Card className="shadow-none border-none">
              <CardHeader>
                <CardTitle className="text-base">Popular topics</CardTitle>
                <CardDescription>
                  Browse by topic tab to find answers faster.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {faqGroups.map((group) => (
                  <Badge key={group.id} variant="outline">
                    {group.label}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Image
              src={IMAGES.FAQ}
              alt="How it works"
              height={150}
              width={200}
              className="w-full h-full max-h-80"
            />
          </div>

          <Tabs defaultValue={faqGroups[0].id} className="gap-3">
            <TabsList className="bg-muted/45 h-8 w-full justify-start overflow-x-auto rounded-md p-0.5 max-w-150 ">
              {faqGroups.map((group) => (
                <TabsTrigger
                  key={group.id}
                  value={group.id}
                  className="h-7 min-w-max px-2.5 text-[12px]"
                >
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {faqGroups.map((group) => (
              <TabsContent
                key={group.id}
                value={group.id}
                className="space-y-2"
              >
                {group.items.map((item) => (
                  <details
                    key={`${group.id}-${item.question}`}
                    className="border-border/70 bg-card group rounded-lg border px-4 py-3"
                  >
                    <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                      {item.question}
                      <ChevronDown
                        className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="text-muted-foreground pt-3 pr-6 text-sm leading-6">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      <section
        id="contact-support"
        aria-labelledby="contact-support-heading"
        className="w-full min-h-[100dvh] snap-start scroll-mt-8"
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-2xl space-y-2">
            <Badge variant="outline">Contact / Support</Badge>
            <h2
              id="contact-support-heading"
              className="text-xl font-semibold leading-tight"
            >
              We can help you get set up
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Pick the path that matches your current stage.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">
                  Choose a support lane
                </CardTitle>
                <CardDescription>
                  Route requests quickly based on your need.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {supportChannels.map((item) => (
                  <div
                    key={item.title}
                    className="border-border/70 rounded-md border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-sm leading-5">
                          {item.detail}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {item.response}
                        </p>
                      </div>
                      <Link
                        href={ROUTES.SIGN_IN}
                        className={cn(
                          buttonVariants({
                            variant: "outline",
                            size: "default",
                          }),
                          "h-8 rounded-md px-3 text-[12px]",
                        )}
                      >
                        {item.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Image
              src={IMAGES.CONTACT}
              alt="How it works"
              height={150}
              width={200}
              className="w-full h-full max-h-80"
            />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">
                  Response expectations
                </CardTitle>
                <CardDescription>
                  Typical reply windows by channel and plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm leading-6">
                <div className="border-border/70 flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Starter</span>
                  <span>Community and docs</span>
                </div>
                <div className="border-border/70 flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Pro</span>
                  <span>Priority support queue</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Business</span>
                  <span>Dedicated onboarding path</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">
                  Implementation support
                </CardTitle>
                <CardDescription>
                  What we can help with during rollout.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-1 text-sm leading-6">
                <p>• Workspace structure and role setup</p>
                <p>• Approval and security policy tuning</p>
                <p>• Templates, workflows, and portfolio adoption</p>
                <p>• Team enablement and operating cadence</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
