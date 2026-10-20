// "Right now": what the plan says about this minute of the day. Plain code, tested.
import { toClock } from "./planner.js";

/**
 * @param {object} plan the result of planDay()
 * @param {number} minute minutes since midnight
 */
export function nowStatus(plan, minute) {
  const { dayStart, dayEnd, off, placed } = plan;
  if (minute < dayStart) {
    return { phase: "before", next: placed[0] || null, current: null, power: null, until: null, onBackupNow: false, switchAt: null };
  }
  if (minute >= dayEnd) {
    return { phase: "after", next: null, current: null, power: null, until: null, onBackupNow: false, switchAt: null };
  }
  const inOutage = off.find((o) => minute >= o.start && minute < o.end) || null;
  const power = inOutage ? "off" : "on";
  const nextOutage = off.find((o) => o.start > minute) || null;
  const until = inOutage ? inOutage.end : nextOutage ? nextOutage.start : null;
  const current = placed.find((p) => minute >= p.start && minute < p.end) || null;
  const next = placed.find((p) => p.start > minute) || null;
  const onBackupNow = Boolean(current && current.onBackup.some((b) => minute >= b.start && minute < b.end));
  const upcoming = current ? current.onBackup.find((b) => b.start > minute) : null;
  return { phase: "day", power, until, current, next, onBackupNow, switchAt: upcoming ? upcoming.start : null };
}

/** The words for the Right now card. */
export function nowLines(status, plan) {
  if (status.phase === "before") {
    return {
      mode: "off",
      headline: `The planned day starts at ${toClock(plan.dayStart)}.`,
      doing: null,
      next: status.next ? `Next: ${status.next.job.name} at ${toClock(status.next.start)}.` : "Nothing is planned today.",
    };
  }
  if (status.phase === "after") {
    return { mode: "off", headline: "The planned day is over.", doing: null, next: null };
  }
  const headline = status.power === "off"
    ? `Power is off until ${toClock(status.until)}.`
    : status.until !== null
      ? `Power is on until ${toClock(status.until)}.`
      : "Power is on for the rest of the day.";
  let doing = null;
  if (status.current) {
    const j = status.current.job.name;
    doing = status.onBackupNow
      ? `On backup: ${j} until ${toClock(status.current.end)}.`
      : `Running: ${j} until ${toClock(status.current.end)}.`;
    if (status.switchAt !== null) doing += ` Switch to backup at ${toClock(status.switchAt)}.`;
  }
  const next = status.next ? `Next: ${status.next.job.name} at ${toClock(status.next.start)}.` : "Nothing more is planned today.";
  return { mode: status.onBackupNow ? "backup" : status.power, headline, doing, next };
}
