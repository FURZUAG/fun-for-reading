// Guarda la app en la tablet para que funcione sin internet.
// Cambia VERSION cada vez que publiques cambios para que la tablet los descargue.
const VERSION = 'ffr-v4';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/main.js',
  'js/app.js',
  'js/mission.js',
  'js/parent.js',
  'js/store.js',
  'js/levels.js',
  'js/creatures.js',
  'js/prompt.js',
  'js/tts.js',
  'js/i18n.js',
  'js/ui.js',
  'js/sample.js',
  'js/warmup.js',
  'js/cloud.js',
  'js/cloudui.js',
  'js/firebase-config.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Red primero (para recibir actualizaciones); si no hay internet, usa la copia guardada.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const url = new URL(e.request.url);
        // También guarda las librerías de Firebase para poder abrir la app sin internet.
        if (res.ok && (url.origin === location.origin || url.hostname === 'www.gstatic.com')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
