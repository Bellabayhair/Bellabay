/* Bella Bay — service worker minimal.
   Aucune mise en cache : il laisse passer toutes les requetes.
   Il rend simplement la boutique installable comme application (PWA)
   sans jamais servir de contenu perime. */
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) { /* passthrough : on ne met rien en cache */ });
