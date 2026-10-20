import { test } from "node:test";
import assert from "node:assert/strict";
import { planDay } from "../public/planner.js";
import { nowStatus, nowLines } from "../public/now.js";
import { SAMPLE_JOBS } from "../public/sample.js";

const OFF = [
  { start: "05:00", end: "09:00" },
  { start: "13:00", end: "15:00" },
  { start: "20:00", end: "23:00" },
];
const plan = planDay({ outages: OFF, jobs: SAMPLE_JOBS, backupMinutes: 60 });
const at = (h, m = 0) => nowLines(nowStatus(plan, h * 60 + m), plan);

test("at 08:00 the power is off and the day's first job is next", () => {
  const l = at(8);
  assert.equal(l.headline, "Power is off until 09:00.");
  assert.equal(l.next, "Next: Sew the choir order at 09:00.");
  assert.equal(l.doing, null);
});

test("at 13:30 the power is off and the iron is next", () => {
  const l = at(13, 30);
  assert.equal(l.headline, "Power is off until 15:00.");
  assert.equal(l.next, "Next: Iron school uniforms at 15:00.");
});

test("at 20:30 the beans are running on backup and nothing else is left", () => {
  const l = at(20, 30);
  assert.equal(l.headline, "Power is off until 23:00.");
  assert.equal(l.doing, "On backup: Slow-cook the beans until 20:45.");
  assert.equal(l.next, "Nothing more is planned today.");
  assert.equal(l.mode, "backup");
});

test("at 18:00 the beans are running on mains and the switch time is announced", () => {
  const l = at(18);
  assert.equal(l.headline, "Power is on until 20:00.");
  assert.equal(l.doing, "Running: Slow-cook the beans until 20:45. Switch to backup at 20:00.");
});

test("before and after the planned day", () => {
  assert.equal(at(4).headline, "The planned day starts at 05:00.");
  assert.equal(at(23).headline, "The planned day is over.");
});

test("no outage left means the power is on for the rest of the day", () => {
  const p = planDay({ outages: [{ start: "05:00", end: "06:00" }], jobs: [] });
  assert.equal(nowLines(nowStatus(p, 10 * 60), p).headline, "Power is on for the rest of the day.");
});
