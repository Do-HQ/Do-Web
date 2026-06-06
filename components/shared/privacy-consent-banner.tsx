"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constants";

const CONSENT_KEY = "squircle-privacy-consent";

export function PrivacyConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const decline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "declined");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy notice"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 px-4 py-4 shadow-lg backdrop-blur-sm md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:rounded-xl md:border"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] leading-5 text-foreground/80">
          We use essential cookies to keep you signed in securely. By continuing,
          you agree to our{" "}
          <Link
            href={ROUTES.PRIVACY}
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href={ROUTES.TERMS}
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </Link>
          .
        </p>
        <button
          onClick={decline}
          aria-label="Dismiss"
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={accept} className="flex-1">
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={decline} className="flex-1">
          Decline
        </Button>
      </div>
    </div>
  );
}
