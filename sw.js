/* STREET BLITZ — offline service worker (cache-first) */
const CACHE = 'street-blitz-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/audio.js',
  './js/art.js',
  './js/game.js',
  './js/spriteframes.js',
  './js/sprites.png',
  './js/bg-slum.png',
  './js/bg-habor.png',
  './js/bg-factory.png',
  './js/bg-river.png',
  './js/bg-bay.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        // stale-while-revalidate
        fetch(e.request).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(e.request, res));
        }).catch(() => {});
        return hit;
      }
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
