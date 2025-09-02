// Simple offline-first service worker
const CACHE_NAME = "hiragana-rush-v2";
self.addEventListener("install", () => self.skipWaiting());
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./main.js",
  "./manifest.webmanifest",
  "./data/hiragana.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GET
  if (req.method !== "GET" || url.origin !== location.origin) return;

  // For navigation, try network then cache fallback
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // For assets, cache-first
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy));
      return res;
    }).catch(() => hit))
  );
});
