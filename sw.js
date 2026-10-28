/* sw.js — service worker for CV Builder
   - Same-site files: network first (so a new upload shows up right away), cached copy when offline.
   - Google Fonts: cached after first load.
   - Payment / AI / Apps Script calls are never touched.
   When you add or rename a file, add it to PRECACHE and bump CACHE ("cv-builder-v2", ...). */
const CACHE = 'cv-builder-v1';
const PRECACHE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/preview.css', 'css/templates-en.css', 'css/templates-kh.css', 'css/responsive.css', 'css/components.css',
  'js/cv-photo.js', 'js/config.js', 'js/core.js', 'js/ai.js', 'js/inputs.js', 'js/photo.js', 'js/pickers.js', 'js/entries.js',
  'js/letter.js', 'js/render.js', 'js/storage.js', 'js/unlock.js', 'js/download.js', 'js/khqr.js', 'js/layout.js', 'js/main.js', 'js/pwa.js',
  'assets/logo.png',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-64.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))   // one missing file must not break the install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) {                       // fonts: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  if (url.origin !== self.location.origin) return;               // everything else cross-site (Worker, Apps Script...) goes straight to the network

  e.respondWith(                                                 // our own files: network first, cache as the offline fallback
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
