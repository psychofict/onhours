// OnHours planner: places jobs into unbroken stretches of one day.
// Plain code, no model: the same outages, jobs and backup hours always give the same plan.
// Shared by the page (public/app.js) and the tests (test/planner.test.js).

export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) throw new Error(`Not a time: ${hhmm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) throw new Error(`Not a time: ${hhmm}`);
  return h * 60 + min;
}

export function toClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

// Merge overlapping outages and clip them to the day.
function mergeOutages(outages, dayStart, dayEnd) {
  const spans = outages
    .map((o) => {
      const start = toMinutes(o.start);
      let end = toMinutes(o.end);
      if (end === 0) end = 24 * 60;
      return { start, end };
    })
    .filter((s) => s.end > s.start)
    .map((s) => ({ start: Math.max(s.start, dayStart), end: Math.min(s.end, dayEnd) }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged;
}

function poweredStretches(off, dayStart, dayEnd) {
  const powered = [];
  let cursor = dayStart;
  for (const o of off) {
    if (o.start > cursor) powered.push({ start: cursor, end: o.start });
    cursor = Math.max(cursor, o.end);
  }
  if (cursor < dayEnd) powered.push({ start: cursor, end: dayEnd });
  return powered;
}

/** Minutes of the span [start, end) that fall inside an outage. */
export function outageMinutes(off, start, end) {
  let total = 0;
  for (const o of off) total += Math.max(0, Math.min(end, o.end) - Math.max(start, o.start));
  return total;
}

/** The parts of [start, end) that fall inside an outage, as spans. */
function outageSpans(off, start, end) {
  const spans = [];
  for (const o of off) {
    const s = Math.max(start, o.start);
    const e = Math.min(end, o.end);
    if (e > s) spans.push({ start: s, end: e });
  }
  return spans;
}

// Time no placed job holds, as spans in order.
function freeSegments(occupied, dayStart, dayEnd) {
  const free = [];
  let cursor = dayStart;
  for (const o of [...occupied].sort((a, b) => a.start - b.start)) {
    if (o.start > cursor) free.push({ start: cursor, end: o.start });
    cursor = Math.max(cursor, o.end);
  }
  if (cursor < dayEnd) free.push({ start: cursor, end: dayEnd });
  return free;
}

// The earliest start for a job of `minutes` that sits inside free time and has at most
// `maxOutage` minutes of outage inside it. Null when there is none.
function earliestStart(free, off, minutes, maxOutage) {
  for (const seg of free) {
    for (let s = seg.start; s + minutes <= seg.end; s++) {
      if (outageMinutes(off, s, s + minutes) <= maxOutage) return s;
    }
  }
  return null;
}

// The longest unbroken run inside free time with at most `maxOutage` minutes of outage in it.
function longestRun(free, off, maxOutage) {
  let best = 0;
  for (const seg of free) {
    for (let s = seg.start; s < seg.end; s++) {
      let used = 0;
      let e = s;
      while (e < seg.end) {
        const next = outageMinutes(off, e, e + 1);
        if (used + next > maxOutage) break;
        used += next;
        e++;
      }
      best = Math.max(best, e - s);
      if (e === seg.end) break; // later starts in this segment can only be shorter
    }
  }
  return best;
}

function missReason(job, free, off, backupTotal, backupLeft) {
  const need = formatDuration(job.minutes);
  const longestGrid = longestRun(free, off, 0);
  if (backupTotal <= 0) {
    const base = longestGrid > 0
      ? `Needs ${need} in one go; the longest powered stretch left is ${formatDuration(longestGrid)}.`
      : `Needs ${need} in one go; no powered time is left today.`;
    return job.backup ? `${base} This job can run on backup. Set your backup hours to try it.` : base;
  }
  if (!job.backup) {
    const base = longestGrid > 0
      ? `Needs ${need} in one go; the longest powered stretch left is ${formatDuration(longestGrid)}.`
      : `Needs ${need} in one go; no powered time is left today.`;
    return `${base} Turn on Runs on backup for this job to let it use your backup.`;
  }
  if (backupLeft <= 0) {
    return `Needs ${need} in one go. Your ${formatDuration(backupTotal)} of backup is already used by other jobs.`;
  }
  const covered = longestRun(free, off, backupLeft);
  return `Needs ${need} in one go. Even with ${formatDuration(backupLeft)} of backup left, the longest run you can cover is ${formatDuration(covered)}.`;
}

/**
 * Plan one day.
 * @param {{outages: {start:string,end:string}[], jobs: {id?:number,name:string,minutes:number,must?:boolean,backup?:boolean}[], backupMinutes?: number, dayStart?:string, dayEnd?:string}} input
 * @returns {{dayStart:number, dayEnd:number, off:{start:number,end:number}[], powered:{start:number,end:number}[], placed:{job:object,start:number,end:number,onBackup:{start:number,end:number}[]}[], unplaced:{job:object,reason:string}[], skipped:{job:object,reason:string}[], backup:{total:number,used:number}}}
 */
export function planDay({ outages = [], jobs = [], backupMinutes = 0, dayStart = "05:00", dayEnd = "23:00" }) {
  const start = toMinutes(dayStart);
  const end = toMinutes(dayEnd);
  const off = mergeOutages(outages, start, end);
  const powered = poweredStretches(off, start, end);
  const backupTotal = Math.max(0, Math.round(Number(backupMinutes) || 0));

  const skipped = [];
  const valid = [];
  jobs.forEach((job, index) => {
    const name = String(job.name ?? "").trim();
    const minutes = Math.round(Number(job.minutes));
    if (!name) skipped.push({ job, reason: "No name, so it was left out." });
    else if (!Number.isFinite(minutes) || minutes <= 0) skipped.push({ job, reason: "No time given, so it was left out." });
    else valid.push({ job: { ...job, name, minutes }, index });
  });

  // Must-do first, then longer first, then the order the user listed them.
  valid.sort((a, b) =>
    Number(Boolean(b.job.must)) - Number(Boolean(a.job.must)) ||
    b.job.minutes - a.job.minutes ||
    a.index - b.index);

  const occupied = [];
  const placed = [];
  const unplaced = [];
  let backupLeft = backupTotal;

  for (const { job } of valid) {
    const free = freeSegments(occupied, start, end);
    let at = earliestStart(free, off, job.minutes, 0);
    let onBackup = [];
    if (at === null && job.backup && backupLeft > 0) {
      at = earliestStart(free, off, job.minutes, backupLeft);
      if (at !== null) {
        onBackup = outageSpans(off, at, at + job.minutes);
        backupLeft -= outageMinutes(off, at, at + job.minutes);
      }
    }
    if (at === null) {
      unplaced.push({ job, reason: missReason(job, free, off, backupTotal, backupLeft) });
      continue;
    }
    occupied.push({ start: at, end: at + job.minutes });
    placed.push({ job, start: at, end: at + job.minutes, onBackup });
  }

  placed.sort((a, b) => a.start - b.start);
  return {
    dayStart: start, dayEnd: end, off, powered, placed, unplaced, skipped,
    backup: { total: backupTotal, used: backupTotal - backupLeft },
  };
}

const span = (s) => `${toClock(s.start)}–${toClock(s.end)}`;

/** The plan as a plain-text message for a family chat. */
export function planToText(plan, areaName, dayLabel = "") {
  const lines = [`Power plan for ${areaName}${dayLabel ? `, ${dayLabel}` : ""}`];
  if (plan.off.length) lines.push(`Power off: ${plan.off.map(span).join(", ")}`);
  else lines.push("No power cuts listed for the day.");
  if (plan.backup.total) lines.push(`Backup: ${formatDuration(plan.backup.total)}`);
  lines.push("");
  for (const p of plan.placed) {
    const note = p.onBackup.length ? ` (on backup ${p.onBackup.map(span).join(", ")})` : "";
    lines.push(`${span(p)}  ${p.job.name}${note}`);
  }
  if (plan.unplaced.length) {
    lines.push("", "Didn't fit:");
    for (const u of plan.unplaced) lines.push(`- ${u.job.name}: ${u.reason}`);
  }
  return lines.join("\n");
}

const range = (s) => `${toClock(s.start)}–${toClock(s.end)}`;
const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const sameSpans = (a, b) => a.length === b.length && a.every((x, i) => x.start === b[i].start && x.end === b[i].end);

/**
 * What changed between two plans for the same jobs, for when a revised notice arrives.
 * Jobs are matched by name. Each change carries the plain reason.
 * @returns {{changed: boolean, cutsBefore: string, cutsAfter: string, cutsChanged: boolean, items: {job: string, kind: "moved"|"no-longer-fits"|"now-fits"|"backup", from: string|null, to: string|null, reason: string}[]}}
 */
export function diffPlans(before, after) {
  const cutsChanged = !sameSpans(before.off, after.off);
  const items = [];
  const placedBefore = new Map(before.placed.map((p) => [p.job.name, p]));
  const placedAfter = new Map(after.placed.map((p) => [p.job.name, p]));
  const missedAfter = new Map(after.unplaced.map((u) => [u.job.name, u]));
  const missedBefore = new Set(before.unplaced.map((u) => u.job.name));
  for (const [name, a] of placedAfter) {
    const b = placedBefore.get(name);
    const onBackup = (p) => p.onBackup.map(range).join(", ");
    if (!b) {
      // A job that is new to the list was never in the old plan; only one that missed before "now fits".
      if (missedBefore.has(name)) items.push({ job: name, kind: "now-fits", from: null, to: range(a), reason: "It did not fit before. It does now." });
      continue;
    }
    if (a.start !== b.start || a.end !== b.end) {
      const hit = after.off.find((o) => overlaps(o, b));
      let reason;
      if (hit) reason = `Power is now off ${range(hit)}, which covers its old time.`;
      else {
        const taker = after.placed.find((p) => p.job.name !== name && overlaps(p, b));
        reason = taker ? `${taker.job.name} now takes its old time.` : "Other jobs moved and left it a different gap.";
      }
      items.push({ job: name, kind: "moved", from: range(b), to: range(a), reason });
    } else if (onBackup(a) !== onBackup(b)) {
      items.push({ job: name, kind: "backup", from: b.onBackup.length ? `on backup ${onBackup(b)}` : "on mains", to: a.onBackup.length ? `on backup ${onBackup(a)}` : "on mains", reason: "The cut it crosses changed." });
    }
  }
  for (const [name, b] of placedBefore) {
    const miss = missedAfter.get(name);
    if (miss) items.push({ job: name, kind: "no-longer-fits", from: range(b), to: null, reason: miss.reason });
  }
  items.sort((x, y) => x.job.localeCompare(y.job));
  return {
    changed: cutsChanged || items.length > 0,
    cutsChanged,
    cutsBefore: before.off.length ? before.off.map(range).join(", ") : "none",
    cutsAfter: after.off.length ? after.off.map(range).join(", ") : "none",
    items,
  };
}
