// Golden Global Expo — Service Worker (Release v5.0.0)
const CACHE_NAME = 'gge-pwa-v5.0.1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/tracking.html',
  '/verify.html',
  '/login.html',
  '/download.html',
  '/manifest.json',
  '/css/main.css',
  '/css/manifest.css',
  '/css/mobile.css',
  '/css/tablet.css',
  '/css/desk.css',
  '/css/tracking.css',
  '/css/download.css',
  '/js/main.js',
  '/js/desk.js',
  '/js/tracking.js',
  '/js/download.js',
  '/js/data/products.js',
  '/js/data/translations.js',
  '/js/data/tracking-data.js',
  '/js/modules/currency.js',
  '/js/modules/i18n.js',
  '/js/modules/pwa.js',
  '/js/modules/qr.js',
  '/js/modules/qr-payment.js',
  '/js/modules/pdf-generator.js',
  '/js/modules/toast.js',
  '/js/modules/storage.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/logo_emblem.png',
  '/images/six_lady_farmers_logo.png',
  '/images/six_lady_farmers_transparent.png',
  '/images/sf_logo_luxury_transparent.png'
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
  // Only cache GET requests; mutating requests (POST, PUT, DELETE) pass directly to network
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. Bypass Server-Sent Events (SSE), Auth endpoints, and Administrative Desk route gate completely
  if (url.pathname.includes('/api/stream/events') || url.pathname.includes('/api/auth/') || url.pathname === '/desk' || url.pathname === '/desk.html') {
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

  // 2b. HTML Navigation requests: Network-First with Cache fallback (Guarantees fresh pages)
  if (event.request.mode === 'navigate') {
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
            return cached || caches.match('/tracking.html') || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 3. Static Assets & Resources: Cache-First with MIME verification & Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidate in background
        fetch(event.request).then((freshResponse) => {
          if (!freshResponse || freshResponse.status !== 200 || freshResponse.type !== 'basic') {
            return;
          }
          const cType = freshResponse.headers.get('content-type') || '';
          const dest = event.request.destination;
          if (dest === 'style' && !cType.includes('text/css')) return;
          if (dest === 'script' && !cType.includes('javascript') && !cType.includes('ecmascript')) return;
          const clone = freshResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const cType = response.headers.get('content-type') || '';
        const dest = event.request.destination;

        // Never cache HTML/text error or proxy interstitial pages as CSS/JS
        if (dest === 'style' && !cType.includes('text/css')) {
          console.warn('[PWA SW] Blocked invalid CSS MIME from caching:', cType, event.request.url);
          return caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match(url.pathname, { ignoreSearch: true }) || response);
        }
        if (dest === 'script' && !cType.includes('javascript') && !cType.includes('ecmascript')) {
          console.warn('[PWA SW] Blocked invalid JS MIME from caching:', cType, event.request.url);
          return caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match(url.pathname, { ignoreSearch: true }) || response);
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      }).catch(() => {
        return caches.match(event.request, { ignoreSearch: true }).then((fallback) => {
          if (fallback) return fallback;
          return caches.match(url.pathname, { ignoreSearch: true }).then((pathFallback) => {
            if (pathFallback) return pathFallback;
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
        });
      });
    })
  );
});
