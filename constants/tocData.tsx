import {
  DollarSign,
  ShieldCheck,
  ScrollText,
  BookOpen,
  HelpCircle,
  Cookie,
  FileText,
  Gavel,
} from "lucide-react";
import { DocEntry } from "@/types/toc";

export const documents: DocEntry[] = [
  {
    index: 1,
    title: "Pricing",
    subtitle: "Plans & billing",
    description:
      "Transparent plans for individuals, growing teams, and enterprises. Find the right fit.",
    icon: <DollarSign className="size-4" />,
    tag: "Updated",
    href: "/pricing",
  },
  {
    index: 2,
    title: "Terms of Service",
    subtitle: "Usage & agreements",
    description:
      "The legal agreement between you and us. Covers rights, restrictions, and responsibilities.",
    icon: <ScrollText className="size-4" />,
    href: "/terms",
  },
  {
    index: 3,
    title: "Privacy Policy",
    subtitle: "Data & protection",
    description:
      "How we collect, store, and safeguard your personal data. We take privacy seriously.",
    icon: <ShieldCheck className="size-4" />,
    tag: "GDPR",
    href: "/privacy",
  },
  {
    index: 4,
    title: "Cookie Policy",
    subtitle: "Tracking & preferences",
    description:
      "Details on the cookies we use, what they do, and how you can opt out.",
    icon: <Cookie className="size-4" />,
    href: "/cookies",
  },
  {
    index: 5,
    title: "Documentation",
    subtitle: "Guides & API reference",
    description:
      "Full developer docs, API references, integration guides, and usage examples.",
    icon: <BookOpen className="size-4" />,
    href: "/docs",
  },
  {
    index: 6,
    title: "FAQ",
    subtitle: "Common questions",
    description:
      "Answers to the most frequent questions from users, teams, and developers.",
    icon: <HelpCircle className="size-4" />,
    href: "/faq",
  },
  {
    index: 7,
    title: "Changelog",
    subtitle: "Releases & updates",
    description:
      "A running log of product updates, bug fixes, and new features shipped.",
    icon: <FileText className="size-4" />,
    tag: "New",
    href: "/changelog",
  },
  {
    index: 8,
    title: "Acceptable Use",
    subtitle: "Rules & conduct",
    description:
      "What is and isn't allowed on our platform. Keeps the community safe and fair.",
    icon: <Gavel className="size-4" />,
    href: "/acceptable-use",
  },
];