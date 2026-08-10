const cacheName = 'wanderer-v2';
const filesToCache = [
  '/', '/index.html', '/main.js', '/manifest.json', '/sw.js',
  '/assets/ui/joystick_base.png', '/assets/ui/joystick_knob.png',
  '/assets/ui/btn_break.png', '/assets/ui/btn_jump.png',
  '/assets/ui/btn_craft.png', '/assets/ui/btn_inventory.png',
  '/assets/ui/hotbar_slot.png', '/assets/ui/ui_window.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
