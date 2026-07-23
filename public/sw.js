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

  // Cross-origin requests (Supabase's REST/auth API, chiefly) are never
  // cached — only ever a plain passthrough fetch, no cache read or write.
  // The Cache API keys purely on request URL, not on the Authorization
  // header, so caching an API response here would risk serving one user's
  // data to the next user signed in on the same device if the network ever
  // failed at just the wrong moment. Same-origin requests (the app shell,
  // JS/CSS bundles) carry no user-specific data, so they're unaffected.
  if (new URL(event.request.url).origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

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

// Second layer of the same defense: on sign-out, the app asks the active
// worker to drop every cache outright, in case any same-origin response
// ever ends up carrying user-specific data. Nothing here needs preserving
// across a sign-out — the app shell just re-fetches and re-caches on the
// next request.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
    );
  }
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
