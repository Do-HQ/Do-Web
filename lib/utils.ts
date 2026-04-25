export const IMAGES = Object.freeze({
  ANDROID_CHROME_192X192: "/images/android-chrome-192x192.png",
  ANDROID_CHROME_512X512: "/images/android-chrome-512x512.png",
  APPLE_TOUCH_ICON: "/images/apple-touch-icon.png",
  CONTACT: "/images/contact.svg",
  FAQ: "/images/faq.svg",
  FAVICON_16X16: "/images/favicon-16x16.png",
  FAVICON_32X32: "/images/favicon-32x32.png",
  FAVICON: "/images/favicon.ico",
  FEATURES: "/images/features.svg",
  HOW_IT_WORKS_2: "/images/how-it-works-2.svg",
  HOW_IT_WORKS: "/images/how-it-works.svg",
  LOGO: "/images/logo.svg",
  PLAN_AND_PRICING: "/images/plan-and-pricing.svg",
  TABLE_OF_CONTENT: "/images/table-of-content.svg",
});

// Imports
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Constants
export const LOCAL_USER_TOKEN_KEY = "do-user-token";

// Helpers
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
