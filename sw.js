self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("sh-cache-v1").then((cache) =>
      cache.addAll(["./", "./index.html", "./helper.mobile.js", "./manifest.webmanifest"])
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((resp) => resp || fetch(e.request))
  );
});
