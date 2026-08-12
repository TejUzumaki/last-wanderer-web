const cacheName = 'wanderer-v4';
const filesToCache = [
  '/', '/index.html', '/main.js', '/manifest.json', '/sw.js',
  '/assets/ui/joystick_base.svg', '/assets/ui/joystick_knob.svg',
  '/assets/ui/btn_break.svg', '/assets/ui/btn_jump.svg',
  '/assets/ui/btn_craft.svg', '/assets/ui/btn_inventory.svg',
  '/assets/ui/ui_window.svg', '/assets/ui/ui_main_menu_frame.svg',
  '/assets/ui/recipe_row.svg', '/assets/ui/inventory_slot.svg',
  '/assets/ui/hotbar_slot.svg', '/assets/ui/hotbar_selector.svg',
  '/assets/ui/menu_button_start.svg',
  '/assets/ui/item_wood.svg', '/assets/ui/item_stone.svg', '/assets/ui/item_metal.svg',
  '/assets/ui/item_fiber.svg', '/assets/ui/item_axe.svg', '/assets/ui/item_pickaxe.svg',
  '/assets/ui/item_torch.svg', '/assets/ui/item_campfire.svg', '/assets/ui/feedback_banner.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(k => {
        if (k !== cacheName) return caches.delete(k);
      }));
    })
  );
});

// Fetch from cache first, then network. Cache new requests dynamically.
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request).then(fetchRes => {
        // Check if we received a valid response
        if(!fetchRes || fetchRes.status !== 200 || fetchRes.type !== 'basic') {
          return fetchRes;
        }
        // Clone the response because it's a stream
        var responseToCache = fetchRes.clone();
        caches.open(cacheName).then(cache => {
          cache.put(e.request, responseToCache);
        });
        return fetchRes;
      }).catch(() => caches.match('/index.html')); // Offline fallback
    })
  );
});
