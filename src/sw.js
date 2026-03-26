// Mathify Service Worker — Cache-first for static assets, network-first for API
const CACHE_NAME = 'mathify-v1';
const STATIC_ASSETS = [
  './',
  './landing.html',
  './auth.html',
  './student-dashboard.html',
  './admin-dashboard.html',
  './splash.html',
  './api.js',
  './student-dashboard.js',
  './student-dashboard.css',
  './style.css',
  './manifest.json',
  '../assets/Mathify Logo.png',
  '../assets/Mathify Logo with name.png',
  '../assets/Final.png',
  '../assets/Mathify Logo.ico',
  '../assets/loading.gif'
];

// Install — cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — skip cross-origin, cache same-origin assets only
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests entirely (e.g. localhost:3000 API, Google Fonts, CDN)
  // This prevents TypeError when trying to cache responses from other origins
  if (url.origin !== self.location.origin) {
    return; // Let browser handle it natively — no SW involvement
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Only cache valid same-origin responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
