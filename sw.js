/*
 * Receipt Scanner - service worker
 * Caches only the small app shell so the app opens instantly and can show an
 * offline screen. All receipt data comes live from Google Apps Script and is
 * never cached here. Bump SHELL_VERSION when you change any file in this folder.
 */
var SHELL_VERSION = 'rs-shell-v2.0.0';
var ASSETS = [
  './',
  'index.html',
  'config.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL_VERSION).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL_VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Apps Script and fonts go straight to the network

  // Page and config: network first (picks up changes), cache as fallback when offline
  var fresh = req.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(url.pathname) || /config\.js$/.test(url.pathname);
  if (fresh) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL_VERSION).then(function (c) { c.put(req.mode === 'navigate' ? 'index.html' : req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true });
      })
    );
    return;
  }
  // Icons / manifest: cache first
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); }));
});
