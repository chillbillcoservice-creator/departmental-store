// ChillBill Retail POS - Offline Service Worker
// Provides 100% offline continuity for billing, receipt printing, scanning, and store ERP

const CACHE_NAME = 'chillbill-pos-v6';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/chillbill-app-icon-1024.png',
  '/chillbill-app-icon-4k.png',
];

// Install Event - Pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Non-critical asset cache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up previous caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Evicting legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event - Support instant update triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - Network-First for navigation & API, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for non-GET and non-http schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls & dynamic data: Network First, fallback to offline response
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, error: 'Offline mode active' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // HTML Page Navigation requests: Network First, fallback to cached offline shell
  // Ensures store staff always gets the latest deployed code when online
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Manifest and icons: Network first to ensure immediate icon updates, falling back to cache
  if (url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('.json') || url.pathname.includes('icon')) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (CSS, JS chunks, images): Cache First, background revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network unavailable - ignore, cachedResponse handles it
      });

      return cachedResponse || fetchPromise;
    })
  );
});
