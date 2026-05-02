/**
 * FIDELYS — Service Worker
 * Stratégie : Network First pour les données, Cache First pour les assets statiques
 */

const CACHE_NAME = 'fidelys-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// ── Installation ──────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activation ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Ignorer les requêtes cross-origin non-Supabase
  if (!url.startsWith(self.location.origin) && !url.includes('supabase.co')) return;

  // Requêtes API Supabase → Network First, fallback cache
  if (url.includes('supabase.co') || url.includes('/rest/v1/') || url.includes('/auth/v1/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Assets statiques (JS, CSS, fonts, images) → Cache First
  const dest = event.request.destination;
  if (dest === 'script' || dest === 'style' || dest === 'image' || dest === 'font') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Navigation (HTML) → Network First, fallback vers /index.html pour SPA
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstSPA(event.request));
    return;
  }

  // Tout le reste → Network First
  event.respondWith(networkFirst(event.request));
});

// ── Stratégies de cache ───────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}

async function networkFirstSPA(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback vers index.html pour les routes SPA en mode hors-ligne
    const cached = await caches.match(request) || await caches.match('/');
    return cached || new Response('Hors ligne', { status: 503 });
  }
}

// ── Notifications push ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Fidelys', body: event.data.text() };
    }
  }

  const title = data.title || 'Nouvelle notification';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.data?.url || '/',
      type: data.data?.type,
      shop_id: data.data?.shop_id,
      customer_id: data.data?.customer_id,
    },
    actions: [{ action: 'open', title: 'Voir' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic notification ─────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const match = windowClients.find((c) => c.url.includes(urlToOpen));
      return match ? match.focus() : clients.openWindow(urlToOpen);
    })
  );
});
