// Golden Global Expo — Enterprise Service Worker (PWA v104.0)
const CACHE_NAME = 'gge-pwa-v104.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/tracking.html',
  '/desk.html',
  '/login.html',
  '/download.html',
  '/manifest.json',
  '/css/main.css',
  '/css/desk.css',
  '/css/tracking.css',
  '/js/main.js',
  '/js/desk.js',
  '/js/tracking.js',
  '/js/download.js',
  '/js/data/products.js',
  '/js/data/translations.js',
  '/js/data/tracking-data.js',
  '/js/modules/currency.js',
  '/js/modules/pdf-generator.js',
  '/js/modules/toast.js',
  '/js/modules/storage.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/logo_emblem.png'
];

// Install Event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching institutional trade assets...');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Purge outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[PWA SW] Purging legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Server-Sent Events (SSE) and Auth endpoints completely
  if (url.pathname.includes('/api/stream/events') || url.pathname.includes('/api/auth/')) {
    return;
  }

  // 2. Dynamic API endpoints: Network-First with Cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'Offline Mode: Cached API response not available.' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // 3. Static Assets & Pages: Cache-First with Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((freshResponse) => {
          if (freshResponse && freshResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, freshResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
