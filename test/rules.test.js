import { test } from "node:test";
import assert from "node:assert/strict";
import { rulesRead } from "../server/rules.js";
import { SAMPLE_NOTICE } from "../public/sample.js";

const find = (areas, name) => areas.find((a) => a.name === name);

test("the sample notice gives every tidy area with its outages", () => {
  const areas = rulesRead(SAMPLE_NOTICE);
  assert.deepEqual(find(areas, "Riverside East").off, [
    { start: "05:00", end: "09:00" },
    { start: "13:00", end: "15:00" },
    { start: "20:00", end: "23:00" },
  ]);
  assert.deepEqual(find(areas, "Siding Road").off, find(areas, "Riverside East").off);
  assert.deepEqual(find(areas, "Kopje Heights").off, [{ start: "06:00", end: "10:00" }, { start: "18:00", end: "22:00" }]);
  assert.deepEqual(find(areas, "Mbizi Park").off, find(areas, "Kopje Heights").off);
  assert.deepEqual(find(areas, "Market Square").off, [{ start: "10:00", end: "14:00" }]);
});

test("loose wording is only partly read by the rules", () => {
  const hillside = find(rulesRead(SAMPLE_NOTICE), "Hillside Extension");
  // "4 in the afternoon until 8pm" needs the AI reader; the rules only catch "2am to 6am".
  assert.deepEqual(hillside.off, [{ start: "02:00", end: "06:00" }]);
});

test("other common formats", () => {
  const areas = rulesRead("Zone B - Greendale: 17h00–21h00\nAvondale & Belgravia 5am to 9am, 10pm - 2am");
  assert.deepEqual(find(areas, "Greendale").off, [{ start: "17:00", end: "21:00" }]);
  assert.deepEqual(find(areas, "Belgravia").off, [
    { start: "00:00", end: "02:00" },
    { start: "05:00", end: "09:00" },
    { start: "22:00", end: "24:00" },
  ]);
});

test("text without times gives no areas", () => {
  assert.deepEqual(rulesRead("Supply will be restored soon."), []);
});
