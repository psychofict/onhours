// OnHours server: serves the page and the notice reader. No packages, Node 20+.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readNotice, aiConfigured } from "./read-notice.js";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const PORT = Number(process.env.PORT) || 5174;
const HOST = process.env.HOST || "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...SECURITY_HEADERS });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (path === "/") path = "/index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) return send(res, 404, { error: "Not found" });
  try {
    const body = await readFile(file);
    send(res, 200, body, TYPES[extname(file)] || "application/octet-stream");
  } catch {
    send(res, 404, { error: "Not found" });
  }
}

const MAX_BODY = 16 * 1024;
const MAX_TEXT = 8000;

/** Read a JSON body, counting bytes as they arrive; null when it is too large or not JSON. */
function readJson(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    let tooBig = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { tooBig = true; return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooBig) return resolve({ tooBig: true });
      try { resolve({ body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }); } catch { resolve({ body: null }); }
    });
    req.on("error", () => resolve({ body: null }));
  });
}

export const routes = {
  "GET /api/status": async (req, res) => send(res, 200, { ai: aiConfigured(process.env) }),
  "POST /api/read-notice": async (req, res) => {
    const { tooBig, body } = await readJson(req);
    if (tooBig) return send(res, 413, { error: "That notice is too long. Paste up to 8,000 characters." });
    const text = typeof body?.text === "string" ? body.text : "";
    if (!text.trim()) return send(res, 400, { error: "Paste a notice first." });
    if (text.length > MAX_TEXT) return send(res, 400, { error: "That notice is too long. Paste up to 8,000 characters." });
    const result = await readNotice(text, process.env);
    send(res, 200, result);
  },
};

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      const handler = routes[`${req.method} ${pathname}`];
      if (handler) return await handler(req, res, send);
      if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res);
      send(res, 405, { error: "Method not allowed" });
    } catch {
      send(res, 500, { error: "Something went wrong. Please try again." });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  createServer().listen(PORT, HOST, () => {
    console.log(`OnHours is running at http://localhost:${PORT}`);
  });
}
