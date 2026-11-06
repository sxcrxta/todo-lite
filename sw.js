// autobuild PWA — 한 번 열면 오프라인에서도 열림. 새 버전이 있으면 다음에 열 때 바뀜.
const CACHE = 'ab-53db2fac8d';
const FILES = ["./", "./css/style.css", "./index.html", "./js/app.js", "./js/core.js", "./js/store.js", "./js/theme-boot.js", "./js/view.js", "./manifest.webmanifest", "./pwa/apple-touch-icon.png", "./pwa/icon-192.png", "./pwa/icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match('./index.html'))));
});
