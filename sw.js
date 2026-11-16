importScripts('./clear-push.js');

// CLEAR service worker
const CACHE = "clear-v10";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./clear-push.js",
  "./clear-192.png",
  "./clear-512.png",
  "./clear-badge.png"
];

self.addEventListener("install", event => {
  // Cache each file separately so one missing file can't stop the worker from installing
  // (cache.addAll rejects everything if a single file 404s, which also blocks push).
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => cached || caches.match("./index.html"))
      )
  );
});
