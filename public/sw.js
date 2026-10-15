// Nexus Ledger service worker: makes the app installable and shows a friendly page when offline.
// Financial data is never cached: /api/ requests always go to the server, so nobody ever sees stale balances.
const VERSION = 'nexus-v1';
const SHELL = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Pages: always from the network; the offline page only when there is no connection.
  if (req.mode === 'navigate') { event.respondWith(fetch(req).catch(() => caches.match('/offline.html'))); return; }
  // Build files have unique names per version, so a cached copy is always correct and makes the app open fast.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })));
  }
});
