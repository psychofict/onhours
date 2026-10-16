import { test } from "node:test";
import assert from "node:assert/strict";
import { planDay, planToText, toClock } from "../public/planner.js";
import { SAMPLE_JOBS } from "../public/sample.js";

const RIVERSIDE_EAST = [
  { start: "05:00", end: "09:00" },
  { start: "13:00", end: "15:00" },
  { start: "20:00", end: "23:00" },
];

const clock = (plan) => plan.placed.map((p) => `${toClock(p.start)}-${toClock(p.end)} ${p.job.name}`);

test("sample day for Riverside East places jobs in unbroken powered stretches", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS });
  assert.deepEqual(clock(plan), [
    "09:00-12:00 Sew the choir order",
    "12:00-13:00 Pump water to the tank",
    "15:00-17:00 Charge phones and the power bank",
    "17:00-17:45 Iron school uniforms",
    "17:45-19:15 Bake bread for the stall",
  ]);
  assert.equal(plan.unplaced.length, 1);
  assert.equal(plan.unplaced[0].job.name, "Slow-cook the beans");
  assert.equal(plan.unplaced[0].reason, "Needs 5 h 30 min in one go; the longest powered stretch left is 2 h 15 min.");
});

test("no placed job overlaps an outage or another job", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS });
  for (const p of plan.placed) {
    for (const o of plan.off) assert.ok(p.end <= o.start || p.start >= o.end, `${p.job.name} crosses an outage`);
    assert.ok(plan.powered.some((s) => p.start >= s.start && p.end <= s.end));
  }
  for (let i = 1; i < plan.placed.length; i++) assert.ok(plan.placed[i].start >= plan.placed[i - 1].end);
});

test("no outages means the whole day is powered", () => {
  const plan = planDay({ outages: [], jobs: [{ name: "Long job", minutes: 600 }] });
  assert.deepEqual(plan.powered, [{ start: 300, end: 1380 }]);
  assert.equal(plan.placed[0].start, 300);
});

test("overlapping and out-of-day outages are merged and clipped", () => {
  const plan = planDay({ outages: [{ start: "02:00", end: "06:00" }, { start: "05:30", end: "07:00" }, { start: "22:00", end: "00:00" }], jobs: [] });
  assert.deepEqual(plan.off, [{ start: 300, end: 420 }, { start: 1320, end: 1380 }]);
});

test("jobs without a name or a time are skipped with a note", () => {
  const plan = planDay({ outages: [], jobs: [{ name: "", minutes: 30 }, { name: "Kettle", minutes: 0 }] });
  assert.equal(plan.skipped.length, 2);
  assert.equal(plan.placed.length, 0);
});

test("the copied message lists the plan in time order", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS });
  const text = planToText(plan, "Riverside East");
  assert.ok(text.startsWith("Power plan for Riverside East\nPower off: 05:00–09:00, 13:00–15:00, 20:00–23:00"));
  assert.match(text, /09:00–12:00 {2}Sew the choir order/);
  assert.match(text, /Didn't fit today:\n- Slow-cook the beans: Needs 5 h 30 min/);
});
