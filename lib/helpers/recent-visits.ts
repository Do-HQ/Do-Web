export type RecentVisitKind = "project" | "space" | "jam";

export type RecentVisitEntry = {
  key: string;
  kind: RecentVisitKind;
  href: string;
  workspaceId: string;
  visitedAt: string;
};

const RECENT_VISITS_KEY = "squircle-recent-visits";
const RECENT_VISITS_EVENT = "squircle:recent-visits-updated";
const MAX_RECENT_VISITS = 60;

const isBrowser = () => typeof window !== "undefined";

const readRecentVisitsRaw = (): RecentVisitEntry[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_VISITS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const key = String((entry as { key?: string }).key || "").trim();
        const kind = String((entry as { kind?: string }).kind || "").trim();
        const href = String((entry as { href?: string }).href || "").trim();
        const workspaceId = String(
          (entry as { workspaceId?: string }).workspaceId || "",
        ).trim();
        const visitedAt = String(
          (entry as { visitedAt?: string }).visitedAt || "",
        ).trim();

        if (!key || !href || !workspaceId || !visitedAt) {
          return null;
        }

        if (kind !== "project" && kind !== "space" && kind !== "jam") {
          return null;
        }

        return {
          key,
          kind: kind as RecentVisitKind,
          href,
          workspaceId,
          visitedAt,
        } satisfies RecentVisitEntry;
      })
      .filter((entry): entry is RecentVisitEntry => Boolean(entry))
      .slice(0, MAX_RECENT_VISITS);
  } catch {
    return [];
  }
};

const writeRecentVisitsRaw = (entries: RecentVisitEntry[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    RECENT_VISITS_KEY,
    JSON.stringify(entries.slice(0, MAX_RECENT_VISITS)),
  );
  window.dispatchEvent(new Event(RECENT_VISITS_EVENT));
};

export const recordRecentVisit = (entry: Omit<RecentVisitEntry, "visitedAt">) => {
  if (!isBrowser()) {
    return;
  }

  const workspaceId = String(entry.workspaceId || "").trim();
  const key = String(entry.key || "").trim();
  const href = String(entry.href || "").trim();

  if (!workspaceId || !key || !href) {
    return;
  }

  const nowIso = new Date().toISOString();
  const current = readRecentVisitsRaw();
  const next: RecentVisitEntry[] = [
    {
      ...entry,
      key,
      href,
      workspaceId,
      visitedAt: nowIso,
    },
    ...current.filter(
      (item) => !(item.workspaceId === workspaceId && item.key === key),
    ),
  ];

  writeRecentVisitsRaw(next);
};

export const getRecentVisits = (workspaceId?: string, limit = 10) => {
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  if (!normalizedWorkspaceId) {
    return [];
  }

  return readRecentVisitsRaw()
    .filter((entry) => entry.workspaceId === normalizedWorkspaceId)
    .sort((left, right) => {
      const leftTime = new Date(left.visitedAt).getTime();
      const rightTime = new Date(right.visitedAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, limit);
};

export const subscribeRecentVisits = (listener: () => void) => {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(RECENT_VISITS_EVENT, listener);
  return () => {
    window.removeEventListener(RECENT_VISITS_EVENT, listener);
  };
};

