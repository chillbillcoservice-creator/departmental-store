// ChillBill Retail POS - Offline Service Worker
// Provides 100% offline continuity for billing, receipt printing, scanning, and store ERP

const CACHE_NAME = 'chillbill-pos-v5';

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

// Fetch Event - Stale-while-revalidate for critical shell & network-first for live data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for non-GET and chrome-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls & dynamic routes: Network First, fallback to offline response
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

  // App shell & static assets: Cache First, update cache in background (Stale While Revalidate)
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
