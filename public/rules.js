// Built-in notice reader: finds areas and their outage times in common formats
// (05:00-09:00, 5am to 9am, 17h00–21h00), including table rows read from a photo.
// Used when no AI model is configured, when the model's answer fails the check, and in the
// page itself so a text notice can be read with no network. Shared by server and page.

const TIME = String.raw`(\d{1,2})(?:[:h.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?`;
const RANGE = new RegExp(String.raw`(?<!\d)${TIME}\s*(?:-|–|—|to|until|till)\s*${TIME}`, "gi");

function clock(h, m, meridiem, hadMinutes) {
  let hour = Number(h);
  const minute = m === undefined ? 0 : Number(m);
  const mer = meridiem ? meridiem.toLowerCase().replace(/\./g, "") : "";
  if (!mer && !hadMinutes) return null; // a bare number like "4" is too loose for rules
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  if (hour > 24 || minute > 59) return null;
  return hour * 60 + minute;
}

const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Split one range into same-day pieces; a range that crosses midnight becomes two. */
export function splitRange(start, end) {
  if (end === start) return [];
  if (end > start) return [{ start: fmt(start), end: fmt(end) }];
  const pieces = [];
  if (start < 24 * 60) pieces.push({ start: fmt(start), end: "24:00" });
  if (end > 0) pieces.push({ start: "00:00", end: fmt(end) });
  return pieces;
}

function areaNames(label) {
  const cleaned = label
    .replace(/\u00a0/g, " ")
    .replace(/^\s*\d{1,2}\s*\|/, " ")
    .replace(/\|/g, " ")
    .replace(/[*_`]/g, "")
    .replace(/^\s*[-•·]\s*/, "")
    .replace(/^\s*(group|block|stage|zone|schedule)\s*[\w]{1,3}\s*[–—:-]\s*/i, "")
    .replace(/\b(off|from|between|power|supply|is|will be)\b/gi, " ")
    .replace(/[:–—-]\s*$/, "")
    .trim();
  return cleaned
    .split(/\s*(?:,|&|\band\b|\/|;)\s*/i)
    .map((s) => s.replace(/^[\s:–—-]+|[\s:–—-]+$/g, "").replace(/\s{2,}/g, " "))
    .filter((s) => s.length >= 3 && /[a-z]/i.test(s) && !/^\d/.test(s));
}

/**
 * @param {string} text the pasted notice
 * @returns {{name: string, off: {start: string, end: string}[]}[]}
 */
export function rulesRead(text) {
  const byName = new Map();
  let previous = []; // area names on the last line that had any, for table rows that wrap
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\u00a0/g, " ");
    RANGE.lastIndex = 0;
    const matches = [...line.matchAll(RANGE)];
    if (!matches.length) continue;
    const off = [];
    for (const m of matches) {
      const start = clock(m[1], m[2], m[3], m[2] !== undefined);
      const end = clock(m[4], m[5], m[6], m[5] !== undefined);
      if (start === null || end === null) continue;
      off.push(...splitRange(start, end));
    }
    if (!off.length) continue;
    // The area label ends at the first colon ("Group 4 – Hillside Extension: off from …"),
    // or at the first time when there is no colon.
    let label = line.slice(0, matches[0].index);
    if (label.includes(":")) label = label.slice(0, label.indexOf(":"));
    let names = areaNames(label);
    // A line that holds only times ("13:00 - 15:00", "and again 20:00 - 23:00") continues the row above.
    const leftover = line.replace(RANGE, " ").replace(/\|/g, " ");
    if (!names.length && previous.length && /^[\s,;&/–—-]*(?:(?:and|again|then|also|plus)[\s,;&/–—-]*)*$/i.test(leftover)) names = previous;
    if (names.length) previous = names;
    for (const name of names) {
      const existing = byName.get(name.toLowerCase());
      if (existing) existing.off.push(...off);
      else byName.set(name.toLowerCase(), { name, off: [...off] });
    }
  }
  return [...byName.values()].map((a) => ({ name: a.name, off: a.off.sort((x, y) => x.start.localeCompare(y.start)) }));
}
