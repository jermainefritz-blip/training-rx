/* ════════════════════════════════════════════════════════════════════
   sw.js — service worker for offline support + instant loading.

   Strategy:
   - App's own files (same origin): CACHE-FIRST. The app opens instantly
     and works with no connection. On a new deploy, bump CACHE_VERSION →
     the new worker precaches fresh files and deletes the old cache.
   - Fonts (cross-origin): stale-while-revalidate, so styling survives
     offline after the first online load.

   All paths are RELATIVE so this works under any GitHub Pages sub-path.
   ════════════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'trx-v8-2026-07-05';   // ← bump on every deploy to ship updates
const CACHE = CACHE_VERSION;

/* The app shell — everything needed to boot with no network. */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './js/app.js',
  './js/state.js',
  './js/storage.js',
  './js/week.js',
  './js/data.js',
  './js/util.js',
  './js/progression.js',
  './js/nutrition.js',
  './js/body.js',
  './js/custom.js',
  './js/activity.js',
  './js/timer.js',
  './js/fx.js',
  './js/ui-workout.js',
  './js/ui-dashboard.js',
  './js/ui-activity.js',
  './js/ui-insights.js',
  './js/ui-core.js',
  './js/ui-export.js'
];

self.addEventListener('install', e => {
  // precache the shell, then activate immediately
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // drop any old-version caches, then take control of open pages
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // App shell → cache-first (instant, offline-proof)
    e.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
      )
    );
  } else {
    // Fonts / other cross-origin → stale-while-revalidate
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
