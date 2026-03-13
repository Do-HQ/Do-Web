"use client";

import * as React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname } from "next/navigation";

import useAuthStore from "@/stores/auth";
import { ROUTES } from "@/utils/constants";

import {
  WALKTHROUGH_STEPS,
  type WalkthroughSection,
} from "./steps";
import {
  isWalkthroughCompleted,
  markWalkthroughCompleted,
} from "./storage";
import "./walkthrough.css";

const getWalkthroughSection = (
  pathname: string,
): WalkthroughSection | null => {
  if (pathname === ROUTES.DASHBOARD) {
    return "dashboard";
  }

  if (pathname === ROUTES.SPACES) {
    return "spaces";
  }

  if (pathname.startsWith("/projects/")) {
    return "projects";
  }

  if (pathname === ROUTES.CALENDAR) {
    return "calendar";
  }

  if (pathname === ROUTES.JAMS) {
    return "jams";
  }

  if (pathname.startsWith(`${ROUTES.JAMS}/`)) {
    return "jam-canvas";
  }

  return null;
};

const resolveStepElement = (step: DriveStep) => {
  if (!step.element) {
    return true;
  }

  if (typeof step.element === "string") {
    return Boolean(document.querySelector(step.element));
  }

  if (typeof step.element === "function") {
    return Boolean(step.element());
  }

  return Boolean(step.element);
};

const RouteWalkthrough = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const driverRef = React.useRef<ReturnType<typeof driver> | null>(null);
  const startedRef = React.useRef(false);

  const userId = String(user?._id || "").trim();
  const section = React.useMemo(
    () => getWalkthroughSection(pathname),
    [pathname],
  );

  React.useEffect(() => {
    if (!section || !userId || typeof window === "undefined") {
      return;
    }

    if (isWalkthroughCompleted(userId, section)) {
      return;
    }

    let attempts = 0;

    const startIfReady = () => {
      if (startedRef.current) {
        return;
      }

      const availableSteps = (WALKTHROUGH_STEPS[section] || []).filter(
        (step) => resolveStepElement(step),
      );

      if (!availableSteps.length) {
        attempts += 1;
        return;
      }

      startedRef.current = true;

      driverRef.current?.destroy();
      driverRef.current = driver({
        steps: availableSteps,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.5,
        stagePadding: 6,
        stageRadius: 10,
        showProgress: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        popoverClass: "sq-walkthrough-popover",
        onDestroyed: () => {
          if (!startedRef.current) {
            return;
          }
          markWalkthroughCompleted(userId, section);
          startedRef.current = false;
        },
      });

      driverRef.current.drive();
    };

    const initialTimer = window.setTimeout(startIfReady, 500);
    const retryTimer = window.setInterval(() => {
      if (startedRef.current || attempts > 15) {
        window.clearInterval(retryTimer);
        return;
      }
      startIfReady();
    }, 350);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(retryTimer);
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
    };
  }, [section, userId]);

  return null;
};

export default RouteWalkthrough;
