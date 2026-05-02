/**
 * FIDELYS — Service Worker
 * Gestion des notifications push et cache PWA
 */

const CACHE_NAME = 'fidelys-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Gestion des requêtes réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers d'autres origines
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Mettre à jour le cache si la réponse est valide
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Retourner la version cachée en cas d'erreur
        return cachedResponse;
      });

      // Retourner le cache en premier, puis mettre à jour
      return cachedResponse || fetchPromise;
    })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Fidelys',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'Nouvelle notification';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification',
    icon: '/icons.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.data?.url || '/',
      type: data.data?.type,
      shop_id: data.data?.shop_id,
      customer_id: data.data?.customer_id,
      dateOfCreation: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Voir',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestion du clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Vérifier si une fenêtre de la même boutique est déjà ouverte
      const matchingClient = windowClients.find((client) => {
        return client.url.includes(urlToOpen);
      });

      if (matchingClient) {
        // Focus sur la fenêtre existante
        return matchingClient.focus();
      }

      // Ouvrir une nouvelle fenêtre
      return clients.openWindow(urlToOpen);
    })
  );
});
