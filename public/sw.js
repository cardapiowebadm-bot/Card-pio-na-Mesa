const CACHE_NAME = 'cardapio-mesa-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.jpg',
  '/icon-512.jpg'
];

// Install Event - cache the core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] caching app shell');
      // Use catch-all to prevent install failure if any single asset fails
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.error('[Service Worker] failed to cache some assets on install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // We only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CRITICAL BYPASS: Never cache or intercept any Firebase/Google Auth/Firestore, hot-reload, or local development ports
  if (
    url.hostname.endsWith('googleapis.com') ||
    url.hostname.endsWith('firebaseio.com') ||
    url.hostname.endsWith('firebase.app') ||
    url.hostname.endsWith('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken') ||
    (url.hostname === 'localhost' && url.port !== '3000') ||
    url.pathname.startsWith('/api/') // Do not intercept backend Express API calls
  ) {
    return;
  }

  // 1. Navigation Requests (HTML / Page routing): Network-First
  // This guarantees that if the user is online, they get the freshest code, preventing stale index.html.
  // If offline, they gracefully fall back to the cached page.
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fall back to cached index.html or root
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Images, Fonts): Stale-While-Revalidate
  // Loads instantly from cache, but fetches in the background to update the cache for next time.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silently ignore background fetch errors (e.g. offline)
          });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache newly discovered static files on-the-fly
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.destination === 'script' ||
           event.request.destination === 'style' ||
           event.request.destination === 'image' ||
           event.request.destination === 'font')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
