import { test } from "node:test";
import assert from "node:assert/strict";
import { readNotice, validateAreas } from "../server/read-notice.js";
import { SAMPLE_NOTICE } from "../public/sample.js";

const ENV = { LLM_BASE_URL: "http://127.0.0.1:9/v1", LLM_API_KEY: "test-placeholder", LLM_MODEL: "any" };
const reply = (content) => async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });

test("validateAreas accepts the agreed shape and splits midnight crossings", () => {
  assert.deepEqual(validateAreas({ areas: [{ name: "Hillside Extension", off: [{ start: "16:00", end: "20:00" }, { start: "22:00", end: "02:00" }] }] }), [
    { name: "Hillside Extension", off: [{ start: "00:00", end: "02:00" }, { start: "16:00", end: "20:00" }, { start: "22:00", end: "24:00" }] },
  ]);
});

test("validateAreas refuses a wrong shape", () => {
  assert.equal(validateAreas({ zones: [] }), null);
  assert.equal(validateAreas({ areas: [{ name: "X", off: [{ start: "4pm", end: "8pm" }] }] }), null);
  assert.equal(validateAreas({ areas: [{ off: [] }] }), null);
});

test("with no model configured the rules read the notice", async () => {
  const r = await readNotice(SAMPLE_NOTICE, {});
  assert.equal(r.reader, "rules");
  assert.equal(r.note, undefined);
});

test("an unreachable model falls back to the rules with a note", async () => {
  const r = await readNotice(SAMPLE_NOTICE, ENV, async () => { throw new TypeError("fetch failed"); });
  assert.equal(r.reader, "rules");
  assert.match(r.note, /AI reader was unavailable/);
  assert.ok(r.areas.some((a) => a.name === "Riverside East"));
});

test("a bad model reply falls back to the rules", async () => {
  const r = await readNotice(SAMPLE_NOTICE, ENV, reply("Sure! Here are the areas: ..."));
  assert.equal(r.reader, "rules");
});

test("a good model reply is used, including fenced JSON", async () => {
  const content = '```json\n{"areas":[{"name":"Hillside Extension","off":[{"start":"16:00","end":"20:00"},{"start":"02:00","end":"06:00"}]}]}\n```';
  const r = await readNotice(SAMPLE_NOTICE, ENV, reply(content));
  assert.equal(r.reader, "ai");
  assert.deepEqual(r.areas[0].off, [{ start: "02:00", end: "06:00" }, { start: "16:00", end: "20:00" }]);
});
