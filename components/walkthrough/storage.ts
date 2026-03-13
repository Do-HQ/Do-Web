import { WALKTHROUGH_VERSION, type WalkthroughSection } from "./steps";

const WALKTHROUGH_PREFIX = `squircle:walkthrough:v${WALKTHROUGH_VERSION}`;

export const getWalkthroughStorageKey = (
  userId: string,
  section: WalkthroughSection,
) => `${WALKTHROUGH_PREFIX}:${userId}:${section}`;

export const isWalkthroughCompleted = (
  userId: string,
  section: WalkthroughSection,
) => {
  if (typeof window === "undefined" || !userId) {
    return false;
  }

  return (
    window.localStorage.getItem(getWalkthroughStorageKey(userId, section)) ===
    "done"
  );
};

export const markWalkthroughCompleted = (
  userId: string,
  section: WalkthroughSection,
) => {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  window.localStorage.setItem(getWalkthroughStorageKey(userId, section), "done");
};

export const resetWalkthroughForUser = (userId?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedUserId = String(userId || "").trim();
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }

    const isWalkthroughKey = key.startsWith("squircle:walkthrough:");
    if (!isWalkthroughKey) {
      continue;
    }

    if (!normalizedUserId || key.includes(`:${normalizedUserId}:`)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
};

