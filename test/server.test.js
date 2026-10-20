import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "../server/index.js";

const KEY = "sk-test-do-not-leak-0123456789";
let stub, stubUrl, app, base;
const modelCalls = [];
let nextReply = '{"areas":[{"name":"Riverside East","off":[{"start":"05:00","end":"09:00"}]}]}';

before(async () => {
  stub = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      modelCalls.push({ auth: req.headers.authorization, body: JSON.parse(raw) });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ choices: [{ message: { content: nextReply } }] }));
    });
  });
  await new Promise((r) => stub.listen(0, "127.0.0.1", r));
  stubUrl = `http://127.0.0.1:${stub.address().port}/v1`;
  app = createServer();
  await new Promise((r) => app.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${app.address().port}`;
});
after(() => { stub.close(); app.close(); app.closeAllConnections?.(); });

const post = (body, raw = false) => fetch(`${base}/api/read-notice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: raw ? body : JSON.stringify(body) });
const setEnv = (on) => {
  for (const k of ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "LLM_VISION_MODEL"]) delete process.env[k];
  if (on) Object.assign(process.env, { LLM_BASE_URL: stubUrl, LLM_API_KEY: KEY, LLM_MODEL: "t", LLM_VISION_MODEL: on === "vision" ? "v" : "" });
};

test("status says what is switched on", async () => {
  setEnv(false);
  assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { ai: false, vision: false });
  setEnv(true);
  assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { ai: true, vision: false });
  setEnv("vision");
  assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { ai: true, vision: true });
});

test("a text notice is read by the rules when no model is set", async () => {
  setEnv(false);
  const r = await post({ text: "Group 2 – Riverside East: 05:00-09:00" });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.reader, "rules");
  assert.equal(j.areas[0].name, "Riverside East");
});

test("a photo goes to the vision model and the key never comes back", async () => {
  setEnv("vision");
  modelCalls.length = 0;
  nextReply = JSON.stringify({ transcript: "Riverside East 05:00 - 09:00", areas: [{ name: "Riverside East", off: [{ start: "05:00", end: "09:00" }] }] });
  const r = await post({ image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ" });
  const text = await r.text();
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(text).from, "photo");
  assert.equal(modelCalls.length, 1);
  assert.equal(modelCalls[0].body.model, "v");
  assert.equal(modelCalls[0].auth, `Bearer ${KEY}`);
  assert.equal(text.includes(KEY), false);
  assert.equal([...r.headers.values()].some((v) => v.includes(KEY)), false);
});

test("a photo with photo reading switched off is refused plainly", async () => {
  setEnv(true);
  const r = await post({ image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ" });
  assert.equal(r.status, 501);
  assert.match((await r.json()).error, /switched off/);
});

test("a model that cannot read the photo gives a 502 with a plain message", async () => {
  setEnv("vision");
  nextReply = "I cannot help with that.";
  const r = await post({ image: "data:image/png;base64,iVBORw0KGgo" });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /couldn't read that photo/);
});

test("bad input is refused without echoing it", async () => {
  setEnv(false);
  const notImage = await post({ image: "data:text/html;base64,PHNjcmlwdD4=" });
  assert.equal(notImage.status, 400);
  assert.equal((await notImage.text()).includes("script"), false);
  assert.equal((await post({ text: "   " })).status, 400);
  assert.equal((await post({ text: "x".repeat(8001) })).status, 400);
  assert.equal((await post("not json", true)).status, 400);
});

test("text bodies over 16 KB and photo bodies over 3 MB are refused with 413", async () => {
  setEnv(false);
  assert.equal((await post({ text: "x".repeat(20 * 1024) })).status, 413);
  let status;
  try { status = (await post({ image: `data:image/jpeg;base64,${"A".repeat(3.2 * 1024 * 1024)}` })).status; } catch { status = 413; }
  assert.equal(status, 413);
});

test("pages and the sample photo are served, with security headers, and paths cannot escape", async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("cache-control"), "no-cache");
  assert.equal((await fetch(`${base}/sample-notice.jpg`)).headers.get("content-type"), "image/jpeg");
  assert.equal((await fetch(`${base}/..%2fserver%2findex.js`)).status, 404);
  assert.equal((await fetch(`${base}/api/status`, { method: "POST" })).status, 405);
});
