"use client";

import * as React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname, useSearchParams } from "next/navigation";

import useAuthStore from "@/stores/auth";
import { useAppStore } from "@/stores";
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
  projectTab: string,
  showSettings: boolean,
): WalkthroughSection | null => {
  if (showSettings) {
    return "settings";
  }

  if (pathname === ROUTES.DASHBOARD) {
    return "dashboard";
  }

  if (pathname === ROUTES.SPACES) {
    return "spaces";
  }

  if (pathname === ROUTES.SUPPORT) {
    return "support";
  }

  if (pathname === ROUTES.SUPPORT_ADMIN) {
    return "support-admin";
  }

  if (pathname.startsWith(`${ROUTES.SUPPORT}/tickets/`)) {
    return "support-thread";
  }

  if (pathname.startsWith(`${ROUTES.SUPPORT_ADMIN}/tickets/`)) {
    return "support-admin-thread";
  }

  if (pathname.startsWith("/projects/")) {
    switch (String(projectTab || "").trim().toLowerCase()) {
      case "workflows":
        return "projects-workflows";
      case "dos":
        return "projects-dos";
      case "files-assets":
        return "projects-files-assets";
      case "risks-issues":
        return "projects-risks-issues";
      case "secrets":
        return "projects-secrets";
      case "agents-automation":
        return "projects-agents-automation";
      default:
        return "projects-overview";
    }
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

  if (pathname === ROUTES.DOCS) {
    return "docs-index";
  }

  if (pathname.startsWith(`${ROUTES.DOCS}/`)) {
    return "docs-editor";
  }

  if (pathname === ROUTES.KNOWLEDGE_BASE) {
    return "knowledge-base";
  }

  if (pathname === ROUTES.PORTFOLIO) {
    return "portfolio";
  }

  if (pathname === ROUTES.TEMPLATES) {
    return "templates";
  }

  if (pathname === ROUTES.ARCHIVE) {
    return "archive";
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

const cleanupWalkthroughArtifacts = () => {
  if (typeof document === "undefined") {
    return;
  }

  const classNames = ["driver-active", "driver-fade", "driver-no-interaction"];

  [document.body, document.documentElement].forEach((node) => {
    if (!node) {
      return;
    }

    classNames.forEach((className) => node.classList.remove(className));
    node.style.removeProperty("overflow");
    node.style.removeProperty("pointer-events");
  });

  document
    .querySelectorAll(".driver-active, .driver-active-element, .driver-no-interaction")
    .forEach((node) => {
      classNames.forEach((className) => node.classList.remove(className));
      if (node instanceof HTMLElement) {
        node.style.removeProperty("overflow");
        node.style.removeProperty("pointer-events");
      }
    });

  document
    .querySelectorAll(".driver-popover, .driver-overlay")
    .forEach((node) => node.remove());
};

const RouteWalkthrough = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showSettings } = useAppStore();
  const { user } = useAuthStore();
  const driverRef = React.useRef<ReturnType<typeof driver> | null>(null);
  const startedRef = React.useRef(false);

  const userId = String(user?._id || "").trim();
  const projectTab = String(searchParams?.get("tab") || "overview");
  const section = React.useMemo(
    () =>
      getWalkthroughSection(
        pathname,
        projectTab,
        Boolean(showSettings),
      ),
    [pathname, projectTab, showSettings],
  );

  React.useEffect(() => {
    if (!section || !userId || typeof window === "undefined") {
      cleanupWalkthroughArtifacts();
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
      cleanupWalkthroughArtifacts();
      driverRef.current = driver({
        steps: availableSteps,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.5,
        stagePadding: 6,
        stageRadius: 10,
        popoverOffset: 12,
        showProgress: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        popoverClass: "sq-walkthrough-popover",
        onDestroyed: () => {
          cleanupWalkthroughArtifacts();
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
      cleanupWalkthroughArtifacts();
    };
  }, [section, userId]);

  return null;
};

export default RouteWalkthrough;
