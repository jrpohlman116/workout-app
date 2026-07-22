// Bump on breaking cache-shape changes only — routine deploys are picked up
// automatically because navigations are network-first (see below).
const CACHE_NAME = 'ironform-v4';
const urlsToCache = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Navigation requests (page refresh/direct URL) are NETWORK-FIRST: a fresh
  // index.html references the newly deployed hashed bundles, so users pick up
  // updates on their next online visit. The cached shell is only an offline
  // fallback — serving it cache-first left users stranded on stale bundles
  // until they manually cleared site data (which also wiped their login).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch('/index.html')
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((r) => r || Response.error());
        })
    );
    return;
  }

  // Assets: network-first, cache on success, fall back to cache offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((r) => r || Response.error());
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});
