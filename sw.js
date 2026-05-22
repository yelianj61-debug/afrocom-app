// RIVO Service Worker v1
const CACHE = 'rivo-v1';
const SHELL = [
  './rivo.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Passer les requêtes non-GET sans modification
  if (e.request.method !== 'GET') return;
  // Pour les requêtes Supabase/FedaPay/CDN → réseau uniquement
  const url = e.request.url;
  if (url.includes('supabase.co') || url.includes('fedapay.com') ||
      url.includes('cloudinary.com') || url.includes('cdn.') ||
      url.includes('fonts.googleapis') || url.includes('unpkg.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  // Pour les fichiers locaux → cache d'abord, réseau en fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./rivo.html'));
    })
  );
});
