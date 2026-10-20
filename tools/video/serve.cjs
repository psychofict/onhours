// A tiny static server for the video scenes: / is tools/video/scenes, /app/ is the app's public folder (fonts, images).
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  const file = p.startsWith("/app/") ? path.join(ROOT, "public", p.slice(5))
    : p.startsWith("/work/") ? path.join(ROOT, "submission", "work", p.slice(6))
    : p.startsWith("/gallery/") ? path.join(ROOT, "tools", "gallery", p.slice(9))
    : path.join(__dirname, "scenes", p === "/" ? "index.html" : p);
  if (!path.resolve(file).startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  });
});
server.listen(Number(process.env.SCENES_PORT) || 5192, "127.0.0.1", () => console.log("scenes on", server.address().port));
