// OnHours service worker: keeps the page's own files so it opens with no network.
// It answers from the store first and refreshes the store in the background. It never touches /api/.
const VERSION = "onhours-v2-1";
const SHELL = [
  "/", "/index.html", "/styles.css",
  "/app.js", "/draw.js", "/jobs.js", "/jobtext.js", "/now.js", "/planner.js", "/rules.js",
  "/photo.js", "/share.js", "/card.js", "/ics.js", "/store.js", "/sample.js",
  "/manifest.webmanifest",
  "/icons/icon.svg", "/icons/icon-180.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png",
  "/fonts/Newsreader-DisplayLight.woff2", "/fonts/Newsreader-Display.woff2", "/fonts/Newsreader-DisplayItalic.woff2",
  "/fonts/Geist-400.woff2", "/fonts/Geist-500.woff2", "/fonts/Geist-600.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(answer(req, url));
});

async function answer(req, url) {
  const cache = await caches.open(VERSION);
  // The page is the same file whatever follows the address ("/?now=14:20").
  const key = req.mode === "navigate" ? "/" : req;
  const hit = await cache.match(key, { ignoreSearch: true });
  const refresh = fetch(req).then((res) => {
    if (res.ok && res.type === "basic") cache.put(key === "/" ? "/" : req, res.clone());
    return res;
  });
  if (hit) { refresh.catch(() => {}); return hit; }
  try { return await refresh; } catch {
    if (req.mode === "navigate") { const home = await cache.match("/"); if (home) return home; }
    return new Response("Offline", { status: 503, statusText: "Offline", headers: { "Content-Type": "text/plain" } });
  }
}
