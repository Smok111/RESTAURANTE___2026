// Service Worker de Sabor Chugurano (PWA)
// Estrategia conservadora: nunca cachea la API para mantener los datos
// siempre frescos; solo guarda imágenes/íconos y fuentes en caché.

const STATIC_CACHE = "sc-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // La API siempre va a la red (datos en vivo del restaurante).
  if (url.pathname.startsWith("/api/")) return;

  const isCacheable = /\.(png|jpe?g|svg|webp|ico|gif|woff2?)$/.test(url.pathname);
  if (!isCacheable) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
