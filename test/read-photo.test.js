import { test } from "node:test";
import assert from "node:assert/strict";
import { readNoticeImage, visionConfigured, isImageDataUrl, cleanTranscript } from "../server/read-notice.js";

const ENV = { LLM_BASE_URL: "http://127.0.0.1:9/v1", LLM_API_KEY: "test-placeholder", LLM_MODEL: "text-model", LLM_VISION_MODEL: "eyes" };
const IMG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";
const reply = (content, seen) => async (url, init) => {
  if (seen) seen.push({ url, init });
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
};

test("photo reading is on only with the AI reader and a vision setting", () => {
  assert.equal(visionConfigured({}), false);
  assert.equal(visionConfigured({ ...ENV, LLM_VISION_MODEL: "" }), false);
  assert.equal(visionConfigured(ENV), true);
  assert.equal(visionConfigured({ ...ENV, LLM_VISION_MODEL: "", LLM_VISION: "1" }), true);
  assert.equal(visionConfigured({ LLM_VISION_MODEL: "eyes" }), false);
});

test("a good reply gives the areas and the transcript, and the request carries the picture", async () => {
  const seen = [];
  const content = '```json\n{"transcript":"POWER SUPPLY NOTICE\\n2 Riverside East 05:00 - 09:00","areas":[{"name":"Riverside East","off":[{"start":"05:00","end":"09:00"},{"start":"13:00","end":"15:00"}]}]}\n```';
  const r = await readNoticeImage(IMG, ENV, reply(content, seen));
  assert.equal(r.reader, "ai");
  assert.equal(r.from, "photo");
  assert.equal(r.areas[0].name, "Riverside East");
  assert.equal(r.transcript.startsWith("POWER SUPPLY NOTICE"), true);
  const body = JSON.parse(seen[0].init.body);
  assert.equal(body.model, "eyes");
  assert.equal(body.temperature, 0);
  const parts = body.messages[1].content;
  assert.equal(parts.find((p) => p.type === "image_url").image_url.url, IMG);
  assert.equal(seen[0].init.headers.Authorization, "Bearer test-placeholder");
});

test("the text model is used for photos when LLM_VISION=1", async () => {
  const seen = [];
  const env = { ...ENV, LLM_VISION_MODEL: "", LLM_VISION: "1" };
  await readNoticeImage(IMG, env, reply('{"transcript":"","areas":[]}', seen));
  assert.equal(JSON.parse(seen[0].init.body).model, "text-model");
});

test("a reply that fails the check but has a transcript is read by the rules", async () => {
  const bad = JSON.stringify({ transcript: "Group 2 – Riverside East: 05:00-09:00 / 13:00-15:00", areas: [{ name: "Riverside East", off: [{ start: "5am", end: "9am" }] }] });
  const r = await readNoticeImage(IMG, ENV, reply(bad));
  assert.equal(r.reader, "rules");
  assert.equal(r.areas[0].name, "Riverside East");
  assert.deepEqual(r.areas[0].off, [{ start: "05:00", end: "09:00" }, { start: "13:00", end: "15:00" }]);
  assert.match(r.note, /built-in rules found the times/);
});

test("a reply with no usable areas and no transcript is an error, not a guess", async () => {
  const r = await readNoticeImage(IMG, ENV, reply("Sure, here you go!"));
  assert.match(r.error, /couldn't read that photo/);
  assert.equal(r.code, "unreadable");
  const down = await readNoticeImage(IMG, ENV, async () => { throw new TypeError("fetch failed"); });
  assert.equal(down.code, "unreadable");
});

test("a picture with no outage times says so without an error", async () => {
  const r = await readNoticeImage(IMG, ENV, reply('{"transcript":"Happy birthday!","areas":[]}'));
  assert.deepEqual(r.areas, []);
  assert.equal(r.error, undefined);
  assert.equal(r.transcript, "Happy birthday!");
});

test("with photo reading off the answer says so and the model is never called", async () => {
  let called = false;
  const r = await readNoticeImage(IMG, { ...ENV, LLM_VISION_MODEL: "" }, async () => { called = true; });
  assert.equal(r.code, "off");
  assert.equal(called, false);
});

test("only small JPEG, PNG or WebP data URLs are accepted", () => {
  assert.equal(isImageDataUrl(IMG), true);
  assert.equal(isImageDataUrl("data:image/gif;base64,AAAA"), false);
  assert.equal(isImageDataUrl("data:text/html;base64,AAAA"), false);
  assert.equal(isImageDataUrl("http://example.com/a.jpg"), false);
  assert.equal(isImageDataUrl(`data:image/png;base64,${"A".repeat(2_600_000)}`), false);
  assert.equal(isImageDataUrl(42), false);
});

test("the transcript is tidied", () => {
  assert.equal(cleanTranscript("A  B \t\t C\u0000\n\n\n\nD"), "A B C\n\nD");
  assert.equal(cleanTranscript(null), "");
});

test("a reply cut off inside its transcript still gives the finished areas", async () => {
  const { salvageAreas } = await import("../server/read-notice.js");
  const cut = '{"areas":[{"name":"Riverside East","off":[{"start":"05:00","end":"09:00"}]}],"transcript":"POWER SUPPLY NOTICE\\n1 \\u00a0 \\u00a0 \\u00a0 \\u00a0';
  assert.deepEqual(salvageAreas(cut), { areas: [{ name: "Riverside East", off: [{ start: "05:00", end: "09:00" }] }] });
  const r = await readNoticeImage(IMG, ENV, reply(cut));
  assert.equal(r.reader, "ai");
  assert.equal(r.areas[0].name, "Riverside East");
  assert.equal(salvageAreas("no json here"), null);
  assert.equal(salvageAreas('{"areas":[{"name":"A \\"quoted\\" [name]"'), null);
});

test("a picture the model says holds no outage times is not read again by the rules", async () => {
  const content = JSON.stringify({ areas: [], transcript: "Plan your day 09:00-11:00 Sew the choir order" });
  const r = await readNoticeImage(IMG, ENV, reply(content));
  assert.deepEqual(r.areas, []);
  assert.equal(r.reader, "ai");
  assert.equal(r.error, undefined);
});
