const STATIC_CACHE = "squircle-static-v1";
const IMAGE_CACHE = "squircle-images-v1";
const ALL_CACHES = [STATIC_CACHE, IMAGE_CACHE];

// ─── Lifecycle ───────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(["/offline.html"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete any caches from previous SW versions
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

// ─── Fetch strategy ──────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through: non-GET, API calls, auth routes, sockets, external origins
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("socket")
  ) {
    return;
  }

  // Cache-first: Next.js hashed static assets (immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Cache-first: images (local + CDN)
  if (request.destination === "image" || url.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(IMAGE_CACHE).then((c) => c.put(request, clone));
              }
              return res;
            })
            .catch(() => cached || new Response("", { status: 503 })),
      ),
    );
    return;
  }

  // Network-first: page navigations — fall back to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline.html")
          .then((cached) => cached || new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }

  // Everything else: network only
});

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const route =
    String(event?.notification?.data?.route || "").trim() || "/spaces";
  const destination = new URL(route, self.location.origin).toString();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
          }
          if ("navigate" in client) {
            return client.navigate(destination);
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(destination);
        }

        return Promise.resolve();
      }),
  );
});
