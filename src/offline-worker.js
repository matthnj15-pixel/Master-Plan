const scope = new URL(self.registration.scope);
const prefix = `master-plan-offline-shell:${scope.pathname}:`;
const cacheName = prefix + '/*BUILD_COMMIT*/';
const shell = new URL('./', scope);
const index = new URL('./index.html', scope);
const aiModule = new URL('./offline-ai.js', scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([shell.href, aiModule.href]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;

  if (request.mode === 'navigate' && [shell.pathname, index.pathname].includes(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(shell.href, { cacheName })));
  } else if (url.href === aiModule.href) {
    event.respondWith(fetch(request).catch(() => caches.match(aiModule.href, { cacheName })));
  }
});
