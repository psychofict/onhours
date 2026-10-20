// Jobs typed in plain words: "iron 45 min, pump water 1 h, charge phones 2 hours".
// Plain rules, so it works with no network. Pieces it cannot read are handed back.

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const NUM = String.raw`(\d+(?:[.,]\d+)?|one|two|three|four|five|six|seven|eight)`;
const HOUR = String.raw`(?:h|hr|hrs|hour|hours)`;
const MIN = String.raw`(?:m|min|mins|minute|minutes)`;

const PATTERNS = [
  { re: /\ban\s+hour\s+and\s+a\s+half\b/i, minutes: () => 90 },
  { re: /\bhalf\s+an?\s+hour\b/i, minutes: () => 30 },
  { re: /\bquarter\s+of\s+an\s+hour\b/i, minutes: () => 15 },
  { re: new RegExp(String.raw`\b${NUM}\s*${HOUR}\s*(?:and\s*)?(\d+)\s*${MIN}?\b`, "i"), minutes: (m) => toNum(m[1]) * 60 + Number(m[2]) },
  { re: new RegExp(String.raw`\b${NUM}\s*${HOUR}\b`, "i"), minutes: (m) => Math.round(toNum(m[1]) * 60) },
  { re: new RegExp(String.raw`\b(\d+)\s*${MIN}\b`, "i"), minutes: (m) => Number(m[1]) },
  { re: /\ban?\s+hour\b/i, minutes: () => 60 },
];

function toNum(word) {
  const w = String(word).toLowerCase();
  return WORDS[w] ?? Number(w.replace(",", "."));
}

function findDuration(piece) {
  for (const p of PATTERNS) {
    const m = p.re.exec(piece);
    if (m) return { minutes: p.minutes(m), start: m.index, end: m.index + m[0].length };
  }
  return null;
}

function tidyName(text) {
  const name = text
    .replace(/\b(for|about|around|approximately|roughly|takes?|needs?|needing)\s*$/i, "")
    .replace(/^\s*(for|about|to|and)\s+/i, "")
    .replace(/[\s,;:–—-]+$/g, "")
    .replace(/^[\s,;:–—-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return name ? name[0].toUpperCase() + name.slice(1) : "";
}

// Split "iron 45 min and pump 1 h" into two pieces, but leave "charge phones and the power bank 2 hours" whole.
function splitOnAnd(piece) {
  const parts = piece.split(/\s+and\s+/i);
  if (parts.length < 2) return [piece];
  const out = [];
  let carry = "";
  for (const part of parts) {
    carry = carry ? `${carry} and ${part}` : part;
    if (findDuration(carry)) { out.push(carry); carry = ""; }
  }
  if (carry) {
    if (out.length) out[out.length - 1] += ` and ${carry}`;
    else out.push(carry);
  }
  return out;
}

/**
 * @param {string} text
 * @returns {{jobs: {name: string, minutes: number, must: boolean, backup: boolean}[], unread: string[]}}
 */
export function parseJobs(text) {
  const jobs = [];
  const unread = [];
  const pieces = String(text).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).flatMap(splitOnAnd);
  for (const piece of pieces) {
    const d = findDuration(piece);
    if (!d || d.minutes <= 0 || d.minutes > 18 * 60) { unread.push(piece); continue; }
    const name = tidyName(`${piece.slice(0, d.start)} ${piece.slice(d.end)}`);
    if (!name) { unread.push(piece); continue; }
    jobs.push({ name: name.slice(0, 60), minutes: d.minutes, must: false, backup: false });
  }
  return { jobs, unread };
}
