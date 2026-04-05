const CACHE_NAME = 'calabouco-media-v1';
const MAX_CACHE_SIZE_MB = 500;

// Cache-first for media assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only cache cinematics media files
  if (url.pathname.startsWith('/cinematics/') && 
      (url.pathname.endsWith('.mp4') || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.png'))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
              trimCache(cache);
            });
          }
          return response;
        });
      })
    );
  }
});

// LRU cache trimming
async function trimCache(cache) {
  const keys = await cache.keys();
  // Simple trim: if more than 200 entries, remove oldest 50
  if (keys.length > 200) {
    for (let i = 0; i < 50; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    )
  );
});

self.addEventListener('install', () => self.skipWaiting());
