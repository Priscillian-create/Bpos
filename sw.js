self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (c) => {
      await Promise.all(
        ASSETS.map((p) =>
          c.add(p).catch(() => null)
        )
      );
    })
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('/index.html');
  const isManifest = url.pathname.endsWith('/manifest.json');
  if (isHTML || isManifest) {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html'))
    );
    return;
  }
  if (ASSETS.includes(url.pathname.replace(/^\//,''))) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return resp;
      })).catch(() => caches.match(req))
    );
    return;
  }
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
const CACHE_NAME = 'buisness-pos-v3';
const ASSETS = ['styles.css','script.js','icon.svg'];
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('/index.html');
  const isManifest = url.pathname.endsWith('/manifest.json');
  if (isHTML || isManifest) {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html'))
    );
    return;
  }
  if (ASSETS.includes(url.pathname.replace(/^\//,''))) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return resp;
      }))
    );
    return;
  }
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
