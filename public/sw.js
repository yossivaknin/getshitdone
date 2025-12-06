// Service Worker for SitRep PWA
const CACHE_NAME = 'sitrep-v1';
const STATIC_CACHE = 'sitrep-static-v1';
const DYNAMIC_CACHE = 'sitrep-dynamic-v1';

// Assets to cache on install (only actual static files, not dynamic routes)
const STATIC_ASSETS = [
  '/manifest.json',
  // Note: Not caching '/' or '/settings' as they are dynamic Next.js routes
  // Icons are cached on-demand when fetched
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      // Use addAll with error handling - if one fails, others still cache
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err);
            // Don't throw - allow other assets to cache
            return null;
          })
        )
      ).then(results => {
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          console.warn(`[SW] ${failed} asset(s) failed to cache, but continuing...`);
        } else {
          console.log('[SW] ✅ All static assets cached successfully');
        }
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache dynamic content
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // If not in cache and offline, return offline page
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

