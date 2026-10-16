import { planDay, planToText, toClock } from "./planner.js";
import { SAMPLE_NOTICE, SAMPLE_JOBS } from "./sample.js";
import { createJobsEditor } from "./jobs.js";
import { wireCopy } from "./share.js";

const $ = (id) => document.getElementById(id);
const els = {
  notice: $("notice"), useSample: $("use-sample"), read: $("read"), readerNote: $("reader-note"),
  area: $("area"), areaHint: $("area-hint"), offLine: $("off-line"),
  jobs: $("jobs"), plan: $("plan"),
  planArea: $("plan-area"), planEmpty: $("plan-empty"), timeline: $("timeline"), planFoot: $("plan-foot"), misses: $("misses"),
};

const state = { areas: [], lastPlan: null, lastArea: "" };

// ---- Jobs ----
const editor = createJobsEditor(els.jobs, $("add-job"), SAMPLE_JOBS);
const getJobs = () => editor.getJobs();

// ---- Reading the notice ----
function setNote(html, warn = false) {
  els.readerNote.innerHTML = html;
  els.readerNote.classList.toggle("warn", warn);
}

async function readNotice() {
  const text = els.notice.value;
  if (!text.trim()) { setNote("Paste a notice first, or use the sample notice.", true); els.notice.focus(); return; }
  els.read.setAttribute("aria-busy", "true");
  els.read.textContent = "Reading…";
  try {
    const res = await fetch("/api/read-notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const data = await res.json();
    if (!res.ok) { setNote(data.error || "Could not read that notice.", true); return; }
    state.areas = data.areas || [];
    const label = data.reader === "ai" ? "Read by AI" : "Read by built-in rules";
    const extra = data.note ? ` ${escapeHtml(data.note)}` : "";
    if (!state.areas.length) {
      setNote(`<span class="pill">${label}</span>No outage times found. Check the notice has times like 05:00–09:00.`, true);
    } else {
      setNote(`<span class="pill">${label}</span>${state.areas.length} area${state.areas.length === 1 ? "" : "s"} found.${extra}`);
    }
    fillAreas();
  } catch {
    setNote("Could not reach the reader. Is the server running?", true);
  } finally {
    els.read.removeAttribute("aria-busy");
    els.read.textContent = "Read the notice";
  }
}

function fillAreas() {
  const previous = els.area.value;
  els.area.innerHTML = "";
  if (!state.areas.length) {
    els.area.append(new Option("No areas yet", ""));
    els.area.disabled = true;
    els.areaHint.textContent = "Read the notice to see the areas it names.";
    els.offLine.textContent = "";
    return;
  }
  els.area.disabled = false;
  els.area.append(new Option("Choose your area", ""));
  for (const a of state.areas) els.area.append(new Option(a.name, a.name));
  els.areaHint.textContent = "Choose yours, then check its times against the notice.";
  if (state.areas.some((a) => a.name === previous)) els.area.value = previous;
  showOffLine();
}

function selectedArea() { return state.areas.find((a) => a.name === els.area.value) || null; }

function showOffLine() {
  const area = selectedArea();
  if (!area) { els.offLine.textContent = ""; return; }
  els.offLine.innerHTML = area.off.length
    ? `<strong>Off</strong> ${area.off.map((o) => `${o.start}–${o.end}`).join(", ")}`
    : "<strong>No outages listed</strong> for this area.";
}

// ---- Planning and drawing ----
function plan() {
  const area = selectedArea();
  if (!area) {
    setNote(state.areas.length ? "Choose your area first." : "Read a notice first, or use the sample notice.", true);
    (state.areas.length ? els.area : els.notice).focus();
    return;
  }
  const result = planDay({ outages: area.off, jobs: getJobs() });
  state.lastPlan = result;
  state.lastArea = area.name;
  $("copied").textContent = "";
  draw(result, area.name);
  if (window.matchMedia("(max-width: 920px)").matches) $("plan-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function hourPx() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hour")) || 44;
}

function draw(result, areaName) {
  const px = hourPx();
  drawnPx = px;
  const y = (min) => ((min - result.dayStart) / 60) * px;
  const height = y(result.dayEnd);

  els.planArea.textContent = `Your day in ${areaName}`;
  els.planEmpty.hidden = true;
  els.timeline.hidden = false;
  els.timeline.innerHTML = "";

  const hours = document.createElement("div");
  hours.className = "hours";
  hours.style.height = `${height}px`;
  const track = document.createElement("div");
  track.className = "track";
  track.style.height = `${height}px`;

  for (let m = result.dayStart; m <= result.dayEnd; m += 60) {
    const label = document.createElement("span");
    label.style.top = `${y(m)}px`;
    label.textContent = toClock(m);
    hours.append(label);
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.top = `${y(m)}px`;
    track.append(tick);
  }
  for (const p of result.powered) track.append(band("on", p, y));
  for (const o of result.off) {
    const b = band("off", o, y);
    const tag = document.createElement("span");
    tag.className = "band-label";
    tag.textContent = `Power off ${toClock(o.start)}–${toClock(o.end)}`;
    b.append(tag);
    track.append(b);
  }
  result.placed.forEach((p, i) => {
    const block = document.createElement("div");
    block.className = `block${p.job.must ? " must" : ""}`;
    block.style.top = `${y(p.start) + 2}px`;
    const h = Math.max(y(p.end) - y(p.start) - 4, 24);
    block.style.height = `${h}px`;
    if (h < 48) block.classList.add("short");
    block.style.animationDelay = `${i * 70}ms`;
    block.innerHTML = `<span class="name"></span><span class="time"></span>`;
    block.querySelector(".name").textContent = p.job.name;
    block.querySelector(".time").textContent = `${toClock(p.start)}–${toClock(p.end)}`;
    block.title = `${p.job.name}, ${toClock(p.start)} to ${toClock(p.end)}`;
    track.append(block);
  });
  els.timeline.append(hours, track);

  els.planFoot.hidden = false;
  els.misses.innerHTML = "";
  const h3 = document.createElement("h3");
  h3.textContent = "Didn't fit";
  els.misses.append(h3);
  if (!result.unplaced.length && !result.skipped.length) {
    const ok = document.createElement("p");
    ok.className = "ok";
    ok.textContent = "Everything fits today.";
    els.misses.append(ok);
  } else {
    const ul = document.createElement("ul");
    for (const u of [...result.unplaced, ...result.skipped]) {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = u.job.name || "Unnamed job";
      li.append(strong, document.createTextNode(nb(u.reason)));
      ul.append(li);
    }
    els.misses.append(ul);
  }
}

function band(kind, span, y) {
  const b = document.createElement("div");
  b.className = `band ${kind}`;
  b.style.top = `${y(span.start)}px`;
  b.style.height = `${y(span.end) - y(span.start)}px`;
  return b;
}

// Keep "2 h" and "30 min" together when a line wraps.
function nb(s) { return s.replace(/(\d) (h|min)/g, "$1\u00a0$2"); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---- Wiring ----
els.useSample.addEventListener("click", () => {
  els.notice.value = SAMPLE_NOTICE;
  setNote("Sample notice added. The areas and times in it are fictional. Press Read the notice.");
  els.read.focus();
});
els.read.addEventListener("click", readNotice);
els.area.addEventListener("change", () => { showOffLine(); if (state.lastPlan) plan(); });
els.plan.addEventListener("click", plan);
// Redraw only when the hour height changes (phone vs laptop), so blocks don't re-animate on every resize.
let drawnPx = 0;
window.addEventListener("resize", () => {
  if (state.lastPlan && hourPx() !== drawnPx) draw(state.lastPlan, state.lastArea);
});

async function showStatus() {
  try {
    const res = await fetch("/api/status");
    const { ai } = await res.json();
    state.ai = ai;
    setNote(ai ? "AI reader on: loose wording like \u201cfrom 4 in the afternoon\u201d is understood."
               : "AI reader off: built-in rules read times like 05:00\u201309:00.");
  } catch { /* the note stays empty */ }
}

wireCopy($("copy"), $("copied"), $("plan-text"), () => (state.lastPlan ? planToText(state.lastPlan, state.lastArea) : ""));
showStatus();
