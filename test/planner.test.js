import { test } from "node:test";
import assert from "node:assert/strict";
import { planDay, planToText, toClock, outageMinutes } from "../public/planner.js";
import { SAMPLE_JOBS } from "../public/sample.js";

const RIVERSIDE_EAST = [
  { start: "05:00", end: "09:00" },
  { start: "13:00", end: "15:00" },
  { start: "20:00", end: "23:00" },
];

const clock = (plan) => plan.placed.map((p) => `${toClock(p.start)}-${toClock(p.end)} ${p.job.name}`);

test("sample day for Riverside East with no backup places four jobs and misses the beans", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS });
  assert.deepEqual(clock(plan), [
    "09:00-10:30 Sew the choir order",
    "10:30-11:30 Pump water to the tank",
    "11:30-12:30 Charge phones and the power bank",
    "15:00-15:45 Iron school uniforms",
  ]);
  assert.equal(plan.unplaced.length, 1);
  assert.equal(plan.unplaced[0].job.name, "Slow-cook the beans");
  assert.equal(
    plan.unplaced[0].reason,
    "Needs 5 h in one go; the longest powered stretch left is 4 h 15 min. This job can run on backup. Set your backup hours to try it.",
  );
  assert.deepEqual(plan.backup, { total: 0, used: 0 });
});

test("with one hour of backup the beans run across the evening cut", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS, backupMinutes: 60 });
  assert.equal(plan.unplaced.length, 0);
  const beans = plan.placed.find((p) => p.job.name === "Slow-cook the beans");
  assert.equal(`${toClock(beans.start)}-${toClock(beans.end)}`, "15:45-20:45");
  assert.deepEqual(beans.onBackup, [{ start: 20 * 60, end: 20 * 60 + 45 }]);
  assert.deepEqual(plan.backup, { total: 60, used: 45 });
  // the other four jobs sit exactly where they did without backup
  assert.deepEqual(clock(plan).filter((c) => !c.includes("beans")), clock(planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS })));
});

test("30 minutes of backup is not enough and the reason says how far it gets", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS, backupMinutes: 30 });
  assert.equal(plan.unplaced.length, 1);
  assert.equal(plan.unplaced[0].reason, "Needs 5 h in one go. Even with 30 min of backup left, the longest run you can cover is 4 h 45 min.");
});

test("a job that is not marked Runs on backup never uses the backup", () => {
  const jobs = SAMPLE_JOBS.map((j) => ({ ...j, backup: false }));
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs, backupMinutes: 240 });
  assert.equal(plan.backup.used, 0);
  assert.match(plan.unplaced[0].reason, /Turn on Runs on backup for this job/);
});

test("backup goes to must-do jobs first", () => {
  const outages = [{ start: "09:00", end: "10:00" }];
  const jobs = [
    { name: "Optional", minutes: 120, must: false, backup: true },
    { name: "Needed", minutes: 120, must: true, backup: true },
  ];
  // 05:00-09:00 is 4 h of mains, so both fit without backup; shrink the day to force a choice
  const plan = planDay({ outages, jobs, backupMinutes: 60, dayStart: "08:00", dayEnd: "11:00" });
  const needed = plan.placed.find((p) => p.job.name === "Needed");
  assert.ok(needed, "the must-do job is placed");
  assert.equal(needed.start, 8 * 60);
  assert.equal(needed.onBackup.length, 1);
  assert.equal(plan.unplaced[0].job.name, "Optional");
});

test("no placed job overlaps another job, and only backup time overlaps an outage", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS, backupMinutes: 120 });
  for (const p of plan.placed) {
    const inOutage = outageMinutes(plan.off, p.start, p.end);
    const backupMin = p.onBackup.reduce((n, b) => n + (b.end - b.start), 0);
    assert.equal(inOutage, backupMin, `${p.job.name}: every outage minute is marked as backup`);
  }
  for (let i = 1; i < plan.placed.length; i++) assert.ok(plan.placed[i].start >= plan.placed[i - 1].end);
  assert.ok(plan.backup.used <= plan.backup.total);
});

test("the same inputs always give the same plan", () => {
  const a = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS, backupMinutes: 90 });
  const b = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS, backupMinutes: 90 });
  assert.deepEqual(a, b);
});

test("random days keep every promise: no overlap, no mains job in an outage, backup within budget", () => {
  let seed = 20261020;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let round = 0; round < 300; round++) {
    const outages = [];
    for (let i = 0, n = Math.floor(rnd() * 4); i < n; i++) {
      const s = 5 * 60 + Math.floor(rnd() * 16 * 12) * 5;
      outages.push({ start: toClock(s), end: toClock(Math.min(s + 30 + Math.floor(rnd() * 24) * 10, 24 * 60)) });
    }
    const jobs = Array.from({ length: 1 + Math.floor(rnd() * 7) }, (_, i) => ({
      name: `Job ${i}`, minutes: 15 + Math.floor(rnd() * 40) * 5, must: rnd() < 0.4, backup: rnd() < 0.5,
    }));
    const backupMinutes = Math.floor(rnd() * 9) * 30;
    const plan = planDay({ outages, jobs, backupMinutes });
    let used = 0;
    for (const p of plan.placed) {
      assert.ok(p.start >= plan.dayStart && p.end <= plan.dayEnd);
      const inOutage = outageMinutes(plan.off, p.start, p.end);
      assert.equal(inOutage, p.onBackup.reduce((n, b) => n + (b.end - b.start), 0));
      if (inOutage) assert.ok(p.job.backup, "only a job marked Runs on backup may cross an outage");
      used += inOutage;
    }
    assert.ok(used <= backupMinutes);
    assert.equal(used, plan.backup.used);
    const sorted = [...plan.placed].sort((x, y) => x.start - y.start);
    for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].start >= sorted[i - 1].end);
    assert.equal(plan.placed.length + plan.unplaced.length + plan.skipped.length, jobs.length);
  }
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

test("the copied message lists the plan in time order and names the backup", () => {
  const plan = planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS, backupMinutes: 60 });
  const text = planToText(plan, "Riverside East", "Thursday 22 October");
  assert.ok(text.startsWith("Power plan for Riverside East, Thursday 22 October\nPower off: 05:00–09:00, 13:00–15:00, 20:00–23:00\nBackup: 1 h"));
  assert.match(text, /09:00–10:30 {2}Sew the choir order/);
  assert.match(text, /15:45–20:45 {2}Slow-cook the beans \(on backup 20:00–20:45\)/);
  const noBackup = planToText(planDay({ outages: RIVERSIDE_EAST, jobs: SAMPLE_JOBS }), "Riverside East");
  assert.match(noBackup, /Didn't fit:\n- Slow-cook the beans: Needs 5 h in one go/);
});

test("a short job fits the gap before the afternoon cut, with or without backup", () => {
  const jobs = [...SAMPLE_JOBS, { name: "Charge the radio", minutes: 30, must: false, backup: false }];
  for (const backupMinutes of [0, 60]) {
    const plan = planDay({ outages: RIVERSIDE_EAST, jobs, backupMinutes });
    const radio = plan.placed.find((p) => p.job.name === "Charge the radio");
    assert.equal(`${toClock(radio.start)}-${toClock(radio.end)}`, "12:30-13:00");
  }
  assert.equal(planDay({ outages: RIVERSIDE_EAST, jobs, backupMinutes: 60 }).unplaced.length, 0);
});
