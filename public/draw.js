// Drawing: the day chart, the Right now card and the Didn't fit list.
// Everything is built with textContent, so nothing from a notice or a job name is ever read as HTML.
import { toClock, formatDuration } from "./planner.js";
import { nowLines } from "./now.js";

const SVG = "http://www.w3.org/2000/svg";

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style") node.style.cssText = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c) node.append(c);
  return node;
}

export function icon(name) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "ico");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

const pct = (n) => `${(n * 100).toFixed(3)}%`;
const span = (s) => `${toClock(s.start)}–${toClock(s.end)}`;

function axisLabels(plan, now = null) {
  const len = plan.dayEnd - plan.dayStart;
  const axis = el("div", { class: "axis", "aria-hidden": "true" });
  for (let h = Math.ceil(plan.dayStart / 180) * 180; h <= plan.dayEnd; h += 180) {
    if (now !== null && Math.abs(h - now) < 100) continue; // leave room for the clock marker
    axis.append(el("span", { text: toClock(h).slice(0, 2), style: `left:${pct((h - plan.dayStart) / len)}` }));
  }
  if (now !== null) axis.append(el("span", { class: "axis-now", text: toClock(now), style: `left:${pct((now - plan.dayStart) / len)}` }));
  return axis;
}

function track(plan, children = [], now = null) {
  const len = plan.dayEnd - plan.dayStart;
  const t = el("div", { class: "track" });
  for (const o of plan.off) {
    t.append(el("i", { class: "band", style: `left:${pct((o.start - plan.dayStart) / len)};width:${pct((o.end - o.start) / len)}` }));
  }
  t.append(...children);
  if (now !== null) t.append(el("i", { class: "tick-now", style: `left:${pct((now - plan.dayStart) / len)}` }));
  return t;
}

export function legend(withBackup) {
  const items = [
    el("li", {}, el("span", { class: "sw sw-on" }), "Power on"),
    el("li", {}, el("span", { class: "sw sw-off" }), "Power off"),
    el("li", {}, el("span", { class: "sw sw-job" }), "A job"),
  ];
  if (withBackup) items.push(el("li", {}, el("span", { class: "sw sw-backup" }), "On backup"));
  return el("ul", { class: "legend", "aria-label": "Legend" }, items);
}

/** One whole day as a row of tracks. `now` is minutes since midnight or null. */
export function renderChart(root, plan, { now = null, compact = false, animate = true } = {}) {
  root.replaceChildren();
  const len = plan.dayEnd - plan.dayStart;
  const chart = el("div", { class: `chart${compact ? " example" : ""}${animate ? "" : " still"}` });
  const inDay = now !== null && now >= plan.dayStart && now < plan.dayEnd ? now : null;
  chart.append(legend(plan.backup.total > 0 || plan.placed.some((p) => p.onBackup.length)));
  chart.append(axisLabels(plan, inDay));
  const rows = el("ol", { class: "rows", "aria-label": "Your day in order" });
  plan.placed.forEach((p, i) => {
    const bar = el("i", {
      class: "bar",
      style: `left:${pct((p.start - plan.dayStart) / len)};width:${pct((p.end - p.start) / len)}`,
    });
    for (const b of p.onBackup) {
      bar.append(el("i", { class: "bk", style: `left:${pct((b.start - p.start) / (p.end - p.start))};width:${pct((b.end - b.start) / (p.end - p.start))}` }));
    }
    const name = el("span", { class: "row-name" }, p.job.name);
    if (p.job.must) name.append(el("span", { class: "tag", text: "Must do" }));
    if (p.onBackup.length) name.append(el("span", { class: "tag backup", text: `On backup ${p.onBackup.map(span).join(", ")}` }));
    rows.append(el("li", { class: "row-job", style: `--i:${i}` },
      el("div", { class: "row-top" }, name, el("span", { class: "row-time", text: span(p) })),
      track(plan, [bar], inDay)));
  });
  chart.append(rows);
  chart.append(el("p", { class: "chart-off", text: plan.off.length ? `Power off ${plan.off.map(span).join(", ")}` : "No power cuts listed for the day." }));
  root.append(chart);
}

/** A single thin track of the day for one area, so its times can be checked by eye. */
export function renderMini(root, plan) {
  root.replaceChildren();
  const wrap = el("div", { class: "chart mini" });
  wrap.append(axisLabels(plan), track(plan));
  root.append(wrap);
}

export function renderNow(root, plan, status, { clockSet = null } = {}) {
  root.replaceChildren();
  const l = nowLines(status, plan);
  root.className = `now ${l.mode === "backup" ? "backup" : l.mode === "off" ? "off" : ""}`.trim();
  root.append(
    el("div", { class: "now-head" }, el("span", { class: "dot", "aria-hidden": "true" }), el("span", { class: "eyebrow", text: "Right now" })),
    el("p", { class: "now-title", text: l.headline }),
  );
  const rows = el("ul", { class: "now-rows" });
  if (l.doing) rows.append(el("li", { text: l.doing }));
  if (l.next) rows.append(el("li", { text: l.next }));
  root.append(rows);
  if (clockSet) root.append(el("p", { class: "now-note", text: `Clock set to ${clockSet} for the demo.` }));
}

/** Didn't fit: one card per job with its reason, and a shortcut where backup could help. */
export function renderMisses(root, plan, { onTryBackup } = {}) {
  root.replaceChildren();
  root.append(el("h3", { text: "Didn't fit" }));
  const items = [...plan.unplaced, ...plan.skipped];
  if (!items.length) {
    root.append(el("p", { class: "ok" }, icon("check"), "Everything fits today."));
    return;
  }
  const ul = el("ul");
  for (const u of items) {
    const li = el("li", {}, el("strong", { text: u.job.name || "Unnamed job" }), document.createTextNode(nb(u.reason)));
    if (onTryBackup && u.job.backup && plan.backup.total === 0 && plan.unplaced.includes(u)) {
      const b = el("button", { type: "button", class: "btn secondary small" }, icon("bolt"), "Try 1 hour of backup");
      b.addEventListener("click", onTryBackup);
      li.append(b);
    }
    ul.append(li);
  }
  root.append(ul);
}

// Keep "2 h" and "30 min" together when a line wraps.
function nb(s) { return s.replace(/(\d) (h|min)\b/g, "$1 $2"); }

export { formatDuration };
