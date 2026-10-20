// The saved household: jobs, area, backup hours, the last notice. It lives in this browser only.
// Reading a bad or old record gives null, which the page treats as a first visit.

export const KEY = "onhours.v2";

const isTime = (t) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t);

function cleanJobs(list) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 40).map((j) => ({
    name: typeof j?.name === "string" ? j.name.slice(0, 60) : "",
    minutes: Number.isFinite(j?.minutes) ? Math.max(0, Math.min(18 * 60, Math.round(j.minutes))) : 0,
    must: Boolean(j?.must),
    backup: Boolean(j?.backup),
  }));
}

function cleanAreas(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const a of list.slice(0, 80)) {
    if (typeof a?.name !== "string" || !a.name || !Array.isArray(a.off)) return null;
    const off = a.off.filter((o) => isTime(o?.start) && isTime(o?.end)).map((o) => ({ start: o.start, end: o.end }));
    out.push({ name: a.name.slice(0, 80), off });
  }
  return out;
}

/** @returns {{notice:string, areas:object[], area:string, backupMinutes:number, day:"today"|"tomorrow", jobs:object[]} | null} */
export function parseHousehold(raw) {
  let v;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || v.v !== 2) return null;
  const jobs = cleanJobs(v.jobs);
  const areas = cleanAreas(v.areas ?? []);
  if (!jobs || !areas) return null;
  return {
    notice: typeof v.notice === "string" ? v.notice.slice(0, 8000) : "",
    areas,
    area: typeof v.area === "string" ? v.area : "",
    backupMinutes: Number.isFinite(v.backupMinutes) ? Math.max(0, Math.min(12 * 60, Math.round(v.backupMinutes))) : 0,
    day: v.day === "tomorrow" ? "tomorrow" : "today",
    jobs,
  };
}

export function loadHousehold(storage = globalThis.localStorage) {
  try { const raw = storage.getItem(KEY); return raw ? parseHousehold(raw) : null; } catch { return null; }
}

/** @returns {boolean} whether it was saved */
export function saveHousehold(state, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify({ v: 2, ...state })); return true; } catch { return false; }
}

export function forgetHousehold(storage = globalThis.localStorage) {
  try { storage.removeItem(KEY); return true; } catch { return false; }
}
