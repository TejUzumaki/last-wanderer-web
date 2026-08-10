const cacheName = 'wanderer-v1';
const filesToCache = ['/', '/index.html', '/main.js', '/manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
