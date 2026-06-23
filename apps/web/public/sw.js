// Amdox ERP - Service Worker (F-12: Offline / PWA Support)
// Place this file in apps/web/public/sw.js

const CACHE_NAME = "amdox-erp-v1";
const OFFLINE_URL = "/offline.html";

// Critical read-only routes to cache for offline use
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/finance",
  "/hr",
  "/supply-chain",
  "/projects",
  "/offline.html",
];

// Install: precache critical routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache when offline, sync on reconnect
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Don't cache API mutation requests (POST/PUT/PATCH/DELETE)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return;
  }

  // For API GET requests: network-first, fallback to cache
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For page requests: cache-first, network fallback
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL))
    )
  );
});

// Background sync: replay queued mutations when back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(replaySyncQueue());
  }
});

async function replaySyncQueue() {
  // In production: read from IndexedDB queue, replay failed mutations
  console.log("[SW] Replaying sync queue on reconnect");
}
