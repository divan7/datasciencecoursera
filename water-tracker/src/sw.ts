/// <reference lib="WebWorker" />
import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkOnly, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: serve index.html for all navigation requests (except Supabase API)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^https:\/\/[a-z0-9-]+\.supabase\.co\//i],
  }),
);

// Supabase API — never cache
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkOnly(),
);

// Google Fonts — cache aggressively
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// ── Notification tap: open app and auto-log the drink ─────────────────────────
interface NotifData {
  amountMl?: number;
  slot?: string;
  autoLog?: boolean;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data as NotifData | undefined;
  const action = event.action;

  // "Después" button or no autoLog → just focus the app
  if (action === 'dismiss' || !data?.autoLog || !data?.amountMl) {
    event.waitUntil(focusOrOpen('/'));
    return;
  }

  // "✅ Tomé" button or tap on notification body → open with log params
  const url = `/?log=${data.amountMl}&slot=${encodeURIComponent(data.slot ?? '')}`;
  event.waitUntil(focusOrOpen(url));
});

async function focusOrOpen(url: string): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length > 0) {
    const client = clients[0] as WindowClient;
    try {
      if (url !== '/') await client.navigate(url);
    } catch { /* ignore navigation errors */ }
    await client.focus();
    return;
  }
  await self.clients.openWindow(url);
}
