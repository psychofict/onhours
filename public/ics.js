// The plan as a calendar file: one event per placed job and one per outage, each with a reminder
// ten minutes before. Times are "floating" (no time zone), so they land at the same clock time
// wherever the phone is. Plain text, no library.
import { toClock } from "./planner.js";

const CRLF = "\r\n";
const pad = (n) => String(n).padStart(2, "0");

export function escapeText(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets continue on the next line after a space (RFC 5545, section 3.1).
export function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.map((l, i) => (i ? ` ${l}` : l)).join(CRLF);
}

function local(date, minutes) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

/**
 * @param {object} plan the result of planDay()
 * @param {{areaName: string, date: Date, now?: Date}} opts
 */
export function buildIcs(plan, { areaName, date, now = new Date() }) {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OnHours//Power plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeText(`OnHours: ${areaName}`)}`];
  let n = 0;
  const event = (summary, start, end, description, alarmText, busy) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:onhours-${day}-${++n}@onhours.local`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${local(date, start)}`,
      `DTEND:${local(date, end)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `TRANSP:${busy ? "OPAQUE" : "TRANSPARENT"}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(alarmText)}`,
      "TRIGGER:-PT10M",
      "END:VALARM",
      "END:VEVENT",
    );
  };
  for (const o of plan.off) {
    event(`Power off · ${areaName}`, o.start, o.end, `Planned power cut, ${toClock(o.start)} to ${toClock(o.end)}.`, "Power goes off in 10 minutes", false);
  }
  for (const p of plan.placed) {
    const back = p.onBackup.length ? ` Switch to backup at ${toClock(p.onBackup[0].start)}.` : "";
    event(p.job.name, p.start, p.end, `Planned by OnHours for ${areaName}.${back}`, `Starts in 10 minutes: ${p.job.name}`, true);
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join(CRLF)}${CRLF}`;
}

export function icsFileName(date) {
  return `onhours-plan-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.ics`;
}
