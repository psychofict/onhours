import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHousehold, saveHousehold, forgetHousehold, parseHousehold, KEY } from "../public/store.js";

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, _m: m };
}
const GOOD = {
  notice: "Group 2 – Riverside East: 05:00-09:00",
  areas: [{ name: "Riverside East", off: [{ start: "05:00", end: "09:00" }] }],
  area: "Riverside East", backupMinutes: 60, day: "tomorrow",
  jobs: [{ name: "Iron", minutes: 45, must: true, backup: false }],
};

test("a household saves and loads back the same", () => {
  const s = fakeStorage();
  assert.equal(saveHousehold(GOOD, s), true);
  assert.deepEqual(loadHousehold(s), GOOD);
});

test("nothing saved, or a bad or old record, is a first visit", () => {
  const s = fakeStorage();
  assert.equal(loadHousehold(s), null);
  s.setItem(KEY, "{not json");
  assert.equal(loadHousehold(s), null);
  s.setItem(KEY, JSON.stringify({ v: 1, jobs: [] }));
  assert.equal(loadHousehold(s), null);
  s.setItem(KEY, JSON.stringify({ v: 2, jobs: "no" }));
  assert.equal(loadHousehold(s), null);
});

test("values are cleaned on the way in", () => {
  const h = parseHousehold(JSON.stringify({ v: 2, backupMinutes: 99999, day: "never", jobs: [{ name: "x".repeat(200), minutes: -5, must: 1 }], areas: [{ name: "A", off: [{ start: "5am", end: "09:00" }] }] }));
  assert.equal(h.backupMinutes, 720);
  assert.equal(h.day, "today");
  assert.equal(h.jobs[0].name.length, 60);
  assert.equal(h.jobs[0].minutes, 0);
  assert.equal(h.jobs[0].must, true);
  assert.deepEqual(h.areas[0].off, []);
});

test("forgetting removes the record, and blocked storage is survived", () => {
  const s = fakeStorage();
  saveHousehold(GOOD, s);
  assert.equal(forgetHousehold(s), true);
  assert.equal(loadHousehold(s), null);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(saveHousehold(GOOD, blocked), false);
  assert.equal(loadHousehold(blocked), null);
  assert.equal(forgetHousehold(blocked), false);
});
