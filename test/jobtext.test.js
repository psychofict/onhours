import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJobs } from "../public/jobtext.js";

const pick = (r) => r.jobs.map((j) => `${j.name}|${j.minutes}`);

test("the example from the PRD adds three jobs", () => {
  const r = parseJobs("iron 45 min, pump water 1 h, charge phones 2 hours");
  assert.deepEqual(pick(r), ["Iron|45", "Pump water|60", "Charge phones|120"]);
  assert.deepEqual(r.unread, []);
});

test("spoken durations", () => {
  assert.deepEqual(pick(parseJobs("run the pump for an hour")), ["Run the pump|60"]);
  assert.deepEqual(pick(parseJobs("bake bread half an hour")), ["Bake bread|30"]);
  assert.deepEqual(pick(parseJobs("slow cook an hour and a half")), ["Slow cook|90"]);
  assert.deepEqual(pick(parseJobs("sew 2h30")), ["Sew|150"]);
  assert.deepEqual(pick(parseJobs("sew 1 h 15 min")), ["Sew|75"]);
  assert.deepEqual(pick(parseJobs("wash two hours")), ["Wash|120"]);
  assert.deepEqual(pick(parseJobs("iron for 45 minutes")), ["Iron|45"]);
});

test("an and inside one name does not split it, but two durations do", () => {
  assert.deepEqual(pick(parseJobs("charge phones and the power bank 2 hours")), ["Charge phones and the power bank|120"]);
  assert.deepEqual(pick(parseJobs("iron 45 min and pump 1 h")), ["Iron|45", "Pump|60"]);
});

test("pieces with no duration, or an impossible one, come back unread", () => {
  const r = parseJobs("iron 45 min, fix the radio, sleep 30 hours");
  assert.deepEqual(pick(r), ["Iron|45"]);
  assert.deepEqual(r.unread, ["fix the radio", "sleep 30 hours"]);
});
