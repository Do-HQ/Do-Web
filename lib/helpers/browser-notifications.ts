"use client";

type BrowserNotificationPayload = {
  id: string;
  title?: string;
  summary?: string;
  route?: string;
  tagPrefix?: string;
  requireInteraction?: boolean;
};

const SERVICE_WORKER_PATH = "/spaces-notifications-sw.js";
const DEFAULT_NOTIFICATION_ROUTE = "/";

let notificationServiceWorkerPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;
let permissionRequestArmed = false;

const canUseNotifications = () =>
  typeof window !== "undefined" && "Notification" in window;

const canUseServiceWorkerNotifications = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator;

const normalizeRoute = (value = "") => {
  const trimmed = String(value || "").trim();
  return trimmed || DEFAULT_NOTIFICATION_ROUTE;
};

const normalizeTitle = (value = "") =>
  String(value || "").trim() || "Notification";

const normalizeBody = (value = "") => String(value || "").trim();

const registerNotificationServiceWorker = async () => {
  if (!canUseServiceWorkerNotifications()) {
    return null;
  }

  if (!notificationServiceWorkerPromise) {
    notificationServiceWorkerPromise = (async () => {
      try {
        const existing = await navigator.serviceWorker
          .getRegistration()
          .catch(() => null);
        if (existing) {
          return existing;
        }

        return await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      } catch {
        return null;
      }
    })();
  }

  return notificationServiceWorkerPromise;
};

const resolveNotificationPermission = async ({
  allowPrompt = false,
}: {
  allowPrompt?: boolean;
} = {}) => {
  if (!canUseNotifications()) {
    return "denied" as NotificationPermission;
  }

  const currentPermission = Notification.permission;
  if (currentPermission !== "default" || !allowPrompt) {
    return currentPermission;
  }

  try {
    const requested = await Notification.requestPermission();
    return requested;
  } catch {
    return Notification.permission;
  }
};

export const armBrowserNotificationPermission = () => {
  if (
    !canUseNotifications() ||
    permissionRequestArmed ||
    Notification.permission !== "default"
  ) {
    return () => {};
  }

  permissionRequestArmed = true;

  const requestPermission = () => {
    window.removeEventListener("pointerdown", requestPermission);
    window.removeEventListener("keydown", requestPermission);

    void registerNotificationServiceWorker();
    void resolveNotificationPermission({ allowPrompt: true }).finally(() => {
      if (Notification.permission === "default") {
        permissionRequestArmed = false;
      }
    });
  };

  window.addEventListener("pointerdown", requestPermission, {
    passive: true,
    once: true,
  });
  window.addEventListener("keydown", requestPermission, {
    once: true,
  });

  return () => {
    window.removeEventListener("pointerdown", requestPermission);
    window.removeEventListener("keydown", requestPermission);
    if (Notification.permission === "default") {
      permissionRequestArmed = false;
    }
  };
};

export const showBrowserNotification = async ({
  id,
  title,
  summary,
  route,
  tagPrefix = "workspace-notification",
  requireInteraction = false,
}: BrowserNotificationPayload) => {
  if (!canUseNotifications() || !id) {
    return false;
  }

  const permission = await resolveNotificationPermission({
    allowPrompt: false,
  });
  if (permission !== "granted") {
    return false;
  }

  const normalizedTitle = normalizeTitle(title);
  const normalizedBody = normalizeBody(summary);
  const normalizedRoute = normalizeRoute(route);
  const tag = `${tagPrefix}-${id}`;

  const registration = await registerNotificationServiceWorker();
  if (registration?.showNotification) {
    await registration.showNotification(normalizedTitle, {
      body: normalizedBody,
      tag,
      data: {
        route: normalizedRoute,
      },
      requireInteraction,
    });
    return true;
  }

  const notification = new Notification(normalizedTitle, {
    body: normalizedBody,
    tag,
    data: {
      route: normalizedRoute,
    },
    requireInteraction,
  });

  notification.onclick = () => {
    window.focus();
    window.location.assign(normalizedRoute);
    notification.close();
  };

  return true;
};
