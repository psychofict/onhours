import { test } from "node:test";
import assert from "node:assert/strict";
import { planDay } from "../public/planner.js";
import { buildIcs, escapeText, fold, icsFileName } from "../public/ics.js";
import { SAMPLE_JOBS } from "../public/sample.js";

const OFF = [{ start: "05:00", end: "09:00" }, { start: "13:00", end: "15:00" }, { start: "20:00", end: "23:00" }];
const plan = planDay({ outages: OFF, jobs: SAMPLE_JOBS, backupMinutes: 60 });
const date = new Date(2026, 9, 22); // Thursday 22 October 2026, local time
const now = new Date(Date.UTC(2026, 9, 20, 12, 0, 0));
const ics = buildIcs(plan, { areaName: "Riverside East", date, now });
const unfolded = ics.replace(/\r\n /g, "");
const events = unfolded.split("BEGIN:VEVENT").slice(1);

test("the file is a calendar with one event per cut and per placed job", () => {
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(events.length, plan.off.length + plan.placed.length);
  assert.equal(ics.includes("\n") && !ics.replace(/\r\n/g, "").includes("\n"), true, "every line ends with CRLF");
});

test("times are floating local times on the chosen day", () => {
  assert.match(ics, /DTSTART:20261022T090000\r\nDTEND:20261022T110000\r\nSUMMARY:Sew the choir order/);
  assert.match(ics, /DTSTART:20261022T154500\r\nDTEND:20261022T204500\r\nSUMMARY:Slow-cook the beans/);
  assert.match(ics, /DTSTART:20261022T130000\r\nDTEND:20261022T150000\r\nSUMMARY:Power off · Riverside East/);
  assert.equal(/DTSTART;TZID|DTSTART:[0-9T]+Z/.test(ics), false, "no time zone, so the clock time travels with the phone");
});

test("every event carries a ten-minute reminder, and a backup job says when to switch", () => {
  for (const e of events) assert.match(e, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:[^\r]+\r\nTRIGGER:-PT10M\r\nEND:VALARM/);
  assert.match(unfolded, /Power goes off in 10 minutes/);
  assert.match(unfolded, /Switch to backup at 20:00\./);
});

test("each event has its own id and the stamp is in UTC", () => {
  const uids = [...ics.matchAll(/UID:(\S+)/g)].map((m) => m[1]);
  assert.equal(new Set(uids).size, uids.length);
  assert.match(ics, /DTSTAMP:20261020T120000Z/);
});

test("text is escaped and long lines are folded", () => {
  assert.equal(escapeText("a, b; c\\d\ne"), "a\\, b\; c\\\\d\\ne");
  const folded = fold(`SUMMARY:${"é".repeat(60)}`);
  for (const line of folded.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), `SUMMARY:${"é".repeat(60)}`);
});

test("the file is named for the day", () => {
  assert.equal(icsFileName(date), "onhours-plan-2026-10-22.ics");
});
