self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const route =
    String(event?.notification?.data?.route || "").trim() || "/spaces";
  const destination = new URL(route, self.location.origin).toString();

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
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
