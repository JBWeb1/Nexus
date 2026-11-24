// Nexus Ledger demo: lets the demo install as an app and open without internet.
// The demo is one page with sample data kept in the browser, so caching it is safe. Pages come from the network
// first, so a newer demo shows up as soon as you are online; the saved copy is used when you are not.
const VERSION = 'nexus-demo-v1';
const FILES = ['./', './index.html', '../nexus-logo.png', '../favicon.png', '../icons/icon-192.png', '../icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== VERSION).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); const own = url.origin === self.location.origin;
  if (!own && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  e.respondWith(fetch(req).then((res) => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
