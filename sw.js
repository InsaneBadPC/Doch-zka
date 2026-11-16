// Service Worker pro Firemní Docházku s podporou okamžité aktualizace
const CACHE_NAME = 'dochazka-app-v101';

// Událost instalace
self.addEventListener('install', (event) => {
  // Okamžitě převzít kontrolu bez čekání na zavření oken
  self.skipWaiting();
});

// Událost aktivace a promazání starých verzí mezipaměti
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Zpráva pro okamžitou aktualizaci
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
