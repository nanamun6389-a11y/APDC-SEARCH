const CACHE_NAME='apdc-search-playeredit4-loginfix3';
const APP_SHELL = [
  "./analytics.js",
  "./app.js",
  "./event-settings.json",
  "./firebase-config.js",
  "./i18n.js",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./judge.js",
  "./manifest.webmanifest",
  "./players.json",
  "./script.js",
  "./search-admin.html",
  "./search-admin.js",
  "./entry-admin.html",
  "./entry-admin.js",
  "./version-history.html",
  "./version-history.js",
  "./data-common.js",
  "./style.css"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML, JS and JSON: network first so competition updates appear immediately.
  if (event.request.mode === 'navigate' || /\.(?:js|json|html)$/.test(url.pathname)) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
    return;
  }

  // CSS and icons: cache first, then refresh from network.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
