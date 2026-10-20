import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const sw = readFileSync(join(PUBLIC, "sw.js"), "utf8");
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]$/, "]"));

function walk(dir, base = "") {
  return readdirSync(dir).flatMap((n) => {
    const rel = `${base}/${n}`;
    return statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), rel) : [rel];
  });
}

test("every file the service worker stores exists", () => {
  for (const f of shell.filter((f) => f !== "/")) assert.ok(existsSync(join(PUBLIC, f)), `${f} is in the shell list but not in public/`);
});

test("every script, style, font and icon the page needs is in the shell list", () => {
  const stored = new Set(shell);
  const need = walk(PUBLIC).filter((f) => !["/sw.js", "/sample-notice.jpg"].includes(f) && !f.endsWith(".txt"));
  for (const f of need) assert.ok(stored.has(f), `${f} is missing from the service worker's shell list`);
});

test("the service worker never touches the API", () => {
  assert.match(sw, /startsWith\("\/api\/"\)/);
});

test("the manifest has what an installable page needs", () => {
  const m = JSON.parse(readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8"));
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "/");
  assert.ok(m.icons.some((i) => i.sizes === "192x192") && m.icons.some((i) => i.sizes === "512x512"));
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
  for (const i of m.icons) assert.ok(existsSync(join(PUBLIC, i.src)), `${i.src} exists`);
});
