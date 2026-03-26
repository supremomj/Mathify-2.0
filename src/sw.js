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

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls: network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone and cache successful API responses
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
