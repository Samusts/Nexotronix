// Nexotronix Service Worker — v3.0
// Handles: caching, offline, background push notifications

const CACHE_NAME = 'nexotronix-v4';
const OFFLINE_URL = '/Nexotronix/';
const STATIC_URLS = [
  '/Nexotronix/',
  '/Nexotronix/index.html',
  '/Nexotronix/manifest.json',
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — network first, cache fallback ────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('workers.dev')) return;  // never cache API
  if (e.request.url.includes('api.anthropic.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(r => r || caches.match(OFFLINE_URL))
      )
  );
});

// ── Push Notification Received ───────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Nexotronix', body: 'You have a new update!', icon: '/Nexotronix/icon.png', url: '/Nexotronix/' };

  if (e.data) {
    try { Object.assign(data, e.data.json()); } 
    catch { data.body = e.data.text(); }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/Nexotronix/icon.png',
    badge: data.badge || '/Nexotronix/icon.png',
    tag: data.tag || 'nexotronix-notif',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/Nexotronix/' },
    actions: [
      { action: 'view', title: '👀 View Now' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const targetUrl = e.notification.data?.url || '/Nexotronix/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes('Nexotronix') && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'PUSH_NAV', url: targetUrl });
            return;
          }
        }
        // Otherwise open new tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

// ── Push Subscription Change ──────────────────────────────────
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(
    self.registration.pushManager.subscribe(e.oldSubscription.options)
      .then(sub => {
        // Re-save new subscription
        return fetch('https://nexotronix-proxy.samuelphilip002.workers.dev/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() })
        });
      })
  );
});
