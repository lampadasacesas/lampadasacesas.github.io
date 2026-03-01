// =============================================================================
// SERVICE WORKER — Lâmpadas Acesas
// Estratégia: Cache-first para assets estáticos, network-first para páginas HTML
// Fase 3.1 — PWA
// =============================================================================

const CACHE_NAME    = 'lampadas-v3.1.0';
const CACHE_STATIC  = 'lampadas-static-v3.1.0';

// Assets estáticos sempre em cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/style.css',
  '/manifest.json'
];

// ── INSTALL: pré-cache dos assets estáticos ───────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())  // ativa imediatamente sem esperar aba fechar
  );
});

// ── ACTIVATE: limpa caches antigas ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_STATIC)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estratégia híbrida ──────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requisições externas (YouTube API, Analytics, CDN)
  if (url.origin !== location.origin) return;

  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  const isHTML    = event.request.headers.get('accept')?.includes('text/html');
  const isStatic  = /\.(css|js|png|jpg|jpeg|ico|woff2?)$/.test(url.pathname);

  if (isStatic) {
    // Cache-first: assets estáticos → cache prioritário, fallback rede
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  } else if (isHTML) {
    // Network-first: páginas HTML → sempre tenta rede (conteúdo atualizado),
    // fallback para cache se offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Demais requisições: comportamento padrão do browser (sem interceptar)
});
