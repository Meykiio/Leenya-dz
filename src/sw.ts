/// <reference lib="webworker" />
/// <reference types="vite/client" />

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.hostname.includes("supabase.co"),
  new NetworkFirst({
    cacheName: "supabase-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.hostname === "fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 604800 }),
    ],
  }),
);

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const { title, body, icon, badge, url } = data;

  const options: NotificationOptions = {
    body,
    icon: icon || "/pwa-icon-192.png",
    badge: badge || "/pwa-icon-192.png",
    data: { url },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title || "Leenya", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
