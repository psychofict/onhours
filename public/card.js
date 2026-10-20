// The plan as a picture for the family chat: 1,080 x 1,350, drawn on a canvas.
// Light paper, the same colours as the page, type never smaller than 30 px.
import { toClock, formatDuration } from "./planner.js";

export const CARD_W = 1080;
export const CARD_H = 1350;

const C = {
  paper: "#F7F1E8", card: "#FFFFFF", ink: "#1C1B1A", stone: "#4A4741", ash: "#6A665F", hair: "#E1DCD3",
  tint: "#FBF0CF", job: "#E5B54F", off: "#EFEBE3", stripe: "#D9D2C4", olive: "#849671", oliveDeep: "#5C6F5D", sun: "#E5B54F",
};
const SERIF = '"Newsreader", Georgia, serif';
const SANS = '"Geist", system-ui, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:\s]+$/, "")}…`; }
  return lines;
}

function hatch(ctx, x, y, w, h) {
  ctx.save();
  rr(ctx, x, y, w, h, 0); ctx.clip();
  ctx.fillStyle = C.off; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.stripe; ctx.lineWidth = 3;
  for (let i = -h; i < w + h; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
  ctx.restore();
}

/** Make sure the page's fonts are ready before drawing. */
export async function loadCardFonts() {
  if (!document.fonts) return;
  await Promise.all(['600 34px "Geist"', '500 40px "Geist"', '400 32px "Geist"', '300 100px "Newsreader"', '400 52px "Newsreader"'].map((f) => document.fonts.load(f)));
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} plan the result of planDay()
 * @param {{areaName: string, dayLabel: string}} opts
 */
export function drawPlanCard(canvas, plan, { areaName, dayLabel }) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(CARD_W * 0.9, -40, 0, CARD_W * 0.9, -40, 760);
  glow.addColorStop(0, "#FBE9BB"); glow.addColorStop(1, "rgba(251,233,187,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, CARD_W, CARD_H);

  const L = 72, R = CARD_W - 72, W = R - L;
  // masthead
  ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(L + 14, 96, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; ctx.font = `600 36px ${SANS}`; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillText("OnHours", L + 42, 108);
  ctx.textAlign = "right"; ctx.fillStyle = C.ash; ctx.font = `500 32px ${SANS}`;
  ctx.fillText("Power plan", R, 108);
  ctx.textAlign = "left";

  // title
  ctx.fillStyle = C.ink; ctx.font = `300 112px ${SERIF}`;
  let size = 112;
  while (ctx.measureText(areaName).width > W && size > 56) { size -= 4; ctx.font = `300 ${size}px ${SERIF}`; }
  ctx.fillText(areaName, L, 262);
  ctx.fillStyle = C.stone; ctx.font = `400 38px ${SANS}`;
  ctx.fillText(dayLabel, L, 322);
  ctx.fillStyle = C.ash; ctx.font = `400 32px ${SANS}`;
  const offText = plan.off.length ? `Power off ${plan.off.map((o) => `${toClock(o.start)}–${toClock(o.end)}`).join("  ·  ")}` : "No power cuts listed";
  wrapText(ctx, offText, L, 376, W, 2, 44);
  const backupLine = plan.backup.total ? `Backup power: ${formatDuration(plan.backup.total)}` : "";
  const topOfChart = plan.off.length > 2 ? 468 : 440;
  if (backupLine) { ctx.fillStyle = C.oliveDeep; ctx.font = `500 32px ${SANS}`; ctx.fillText(backupLine, L, topOfChart - 8); }

  // chart
  const len = plan.dayEnd - plan.dayStart;
  const x = (m) => L + ((m - plan.dayStart) / len) * W;
  const rows = Math.min(plan.placed.length, 9);
  const misses = [...plan.unplaced, ...plan.skipped];
  const extra = plan.placed.slice(0, 9).filter((p) => p.onBackup.length).length * 34;
  const maxChart = CARD_H - 150 - topOfChart - (misses.length ? 60 + Math.min(misses.length, 2) * 150 : 70);
  const pitch = Math.max(84, Math.min(150, Math.floor((maxChart - extra) / Math.max(rows, 1))));
  let y = topOfChart + 36;
  // axis
  ctx.fillStyle = C.ash; ctx.font = `400 30px ${SANS}`; ctx.textAlign = "center";
  for (let h = Math.ceil(plan.dayStart / 180) * 180; h <= plan.dayEnd; h += 180) ctx.fillText(toClock(h).slice(0, 2), x(h), y);
  ctx.textAlign = "left";
  y += 24;
  for (const p of plan.placed.slice(0, 9)) {
    const timeText = `${toClock(p.start)}–${toClock(p.end)}`;
    ctx.font = `500 34px ${SANS}`;
    const timeW = ctx.measureText(timeText).width;
    ctx.fillStyle = C.ink; ctx.font = `600 38px ${SANS}`;
    ctx.fillText(fit(ctx, p.job.name, W - timeW - 28), L, y + 38);
    ctx.textAlign = "right"; ctx.fillStyle = C.stone; ctx.font = `500 34px ${SANS}`;
    ctx.fillText(timeText, R, y + 38);
    ctx.textAlign = "left";
    let ty = y + 56;
    if (p.onBackup.length) {
      ctx.fillStyle = C.oliveDeep; ctx.font = `500 30px ${SANS}`;
      ctx.fillText(`On backup ${p.onBackup.map((b) => `${toClock(b.start)}–${toClock(b.end)}`).join(", ")}`, L, y + 76);
      ty += 34;
    }
    const th = 30;
    ctx.save(); rr(ctx, L, ty, W, th, 15); ctx.clip();
    ctx.fillStyle = C.tint; ctx.fillRect(L, ty, W, th);
    for (const o of plan.off) hatch(ctx, x(o.start), ty, x(o.end) - x(o.start), th);
    ctx.restore();
    rr(ctx, x(p.start), ty + 4, Math.max(x(p.end) - x(p.start), 14), th - 8, 11); ctx.fillStyle = C.job; ctx.fill();
    for (const b of p.onBackup) {
      ctx.save(); rr(ctx, x(p.start), ty + 4, Math.max(x(p.end) - x(p.start), 14), th - 8, 11); ctx.clip();
      ctx.fillStyle = C.oliveDeep; ctx.fillRect(x(b.start), ty + 4, x(b.end) - x(b.start), th - 8);
      ctx.restore();
    }
    y += pitch + (p.onBackup.length ? 34 : 0);
  }
  if (plan.placed.length > 9) { ctx.fillStyle = C.ash; ctx.font = `400 30px ${SANS}`; ctx.fillText(`and ${plan.placed.length - 9} more`, L, y + 30); y += 56; }

  // didn't fit
  if (!misses.length) {
    ctx.fillStyle = C.oliveDeep; ctx.font = `500 34px ${SANS}`;
    ctx.fillText("Everything fits today.", L, y + 34);
  }
  if (misses.length) {
    y += 10;
    ctx.fillStyle = C.ink; ctx.font = `400 50px ${SERIF}`;
    ctx.fillText("Didn't fit", L, y + 40);
    y += 70;
    for (const m of misses.slice(0, 2)) {
      rr(ctx, L, y, W, 124, 24); ctx.fillStyle = "#FBF6EA"; ctx.fill(); ctx.strokeStyle = "#F0E3C3"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = `600 36px ${SANS}`;
      ctx.fillText(fit(ctx, m.job.name || "Unnamed job", W - 60), L + 30, y + 46);
      ctx.fillStyle = C.stone; ctx.font = `400 30px ${SANS}`;
      const first = m.reason.split(/(?<=[.])\s/)[0];
      ctx.fillText(fit(ctx, first, W - 60), L + 30, y + 92);
      y += 140;
    }
    if (misses.length > 2) { ctx.fillStyle = C.ash; ctx.font = `400 30px ${SANS}`; ctx.fillText(`and ${misses.length - 2} more`, L, y + 24); }
  }

  // footer
  ctx.fillStyle = C.hair; ctx.fillRect(L, CARD_H - 112, W, 2);
  ctx.fillStyle = C.ash; ctx.font = `400 30px ${SANS}`;
  ctx.fillText("Made with OnHours. Works with no power and no network.", L, CARD_H - 56);
}

function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrapText(ctx, text, x, y, maxWidth, maxLines, lineHeight) {
  wrap(ctx, text, maxWidth, maxLines).forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

export function cardBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
