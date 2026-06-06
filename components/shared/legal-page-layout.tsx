"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/shared/logo";
import { ROUTES } from "@/utils/constants";

type LegalPageLayoutProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href={ROUTES.BASE_URL}>
            <Logo isFull />
          </Link>
          <Link
            href={ROUTES.BASE_URL}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 pb-24">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm leading-7 text-foreground/90">
          {children}
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Squircle. All rights reserved.{" "}
          <Link href={ROUTES.PRIVACY} className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href={ROUTES.TERMS} className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>
        </p>
      </footer>
    </div>
  );
}
