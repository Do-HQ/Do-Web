"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import LoaderComponent from "@/components/shared/loader";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/logo";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [checkedToken, setCheckedToken] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const accessToken = localStorage.getItem(LOCAL_KEYS.TOKEN);
      const nextHasToken = Boolean(accessToken);
      setHasToken(nextHasToken);
      setCheckedToken(true);

      if (nextHasToken) {
        router.replace(ROUTES.DASHBOARD);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  if (!checkedToken) {
    return <LoaderComponent />;
  }

  if (hasToken) {
    return <LoaderComponent />;
  }

  return (
    <main className="bg-background text-foreground relative flex min-h-[100dvh] w-full overflow-hidden">
      <div className="bg-background/35 absolute inset-0" />

      <div className="relative z-10 flex w-full flex-col">
        <header className="px-4 py-4 sm:px-10 flex items-center justify-center">
          <Logo isFull />
        </header>

        <section className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 pb-12 sm:px-10">
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
                  &quot;let&apos;s squircle after standup and close this before
                  lunch&quot;
                </p>
              </li>
              <li>
                <p>
                  a compact working loop where alignment and execution happen in
                  one flow.
                </p>
                <p className="text-muted-foreground mt-0.5 text-[12px]">
                  &quot;we&apos;ll squircle this later, then ship by EOD&quot;
                </p>
              </li>
            </ol>

            <div className="pt-2">
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
