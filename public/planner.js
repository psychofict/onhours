// OnHours planner: places jobs into unbroken powered stretches of one day.
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
      let start = toMinutes(o.start);
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

/**
 * Plan one day.
 * @param {{outages: {start:string,end:string}[], jobs: {id?:string,name:string,minutes:number,must?:boolean}[], dayStart?:string, dayEnd?:string}} input
 * @returns {{dayStart:number, dayEnd:number, off:{start:number,end:number}[], powered:{start:number,end:number}[], placed:{job:object,start:number,end:number}[], unplaced:{job:object,reason:string}[], skipped:{job:object,reason:string}[]}}
 */
export function planDay({ outages = [], jobs = [], dayStart = "05:00", dayEnd = "23:00" }) {
  const start = toMinutes(dayStart);
  const end = toMinutes(dayEnd);
  const off = mergeOutages(outages, start, end);
  const powered = poweredStretches(off, start, end);

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

  // Free gaps start as the powered stretches and shrink as jobs are placed.
  let free = powered.map((p) => ({ ...p }));
  const placed = [];
  const unplaced = [];

  for (const { job } of valid) {
    const gapIndex = free.findIndex((g) => g.end - g.start >= job.minutes);
    if (gapIndex === -1) {
      const longest = free.reduce((max, g) => Math.max(max, g.end - g.start), 0);
      const reason = longest > 0
        ? `Needs ${formatDuration(job.minutes)} in one go; the longest powered stretch left is ${formatDuration(longest)}.`
        : `Needs ${formatDuration(job.minutes)} in one go; no powered time is left today.`;
      unplaced.push({ job, reason });
      continue;
    }
    const gap = free[gapIndex];
    placed.push({ job, start: gap.start, end: gap.start + job.minutes });
    const rest = { start: gap.start + job.minutes, end: gap.end };
    free = [...free.slice(0, gapIndex), ...(rest.end > rest.start ? [rest] : []), ...free.slice(gapIndex + 1)];
  }

  placed.sort((a, b) => a.start - b.start);
  return { dayStart: start, dayEnd: end, off, powered, placed, unplaced, skipped };
}

/** The plan as a plain-text message for a family chat. */
export function planToText(plan, areaName) {
  const lines = [`Power plan for ${areaName}`];
  if (plan.off.length) {
    lines.push(`Power off: ${plan.off.map((o) => `${toClock(o.start)}–${toClock(o.end)}`).join(", ")}`);
  } else {
    lines.push("No power cuts listed for today.");
  }
  lines.push("");
  for (const p of plan.placed) lines.push(`${toClock(p.start)}–${toClock(p.end)}  ${p.job.name}`);
  if (plan.unplaced.length) {
    lines.push("", "Didn't fit today:");
    for (const u of plan.unplaced) lines.push(`- ${u.job.name}: ${u.reason}`);
  }
  return lines.join("\n");
}
