self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('pwa-cache-v1').then((cache) => {
      return cache.addAll([
        './index.html',
        './manifest.json'
        // Add other core CSS/JS files here if needed
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
