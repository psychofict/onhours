import { planDay, planToText, formatDuration } from "./planner.js";
import { nowStatus } from "./now.js";
import { rulesRead } from "./rules.js";
import { parseJobs } from "./jobtext.js";
import { SAMPLE_NOTICE, SAMPLE_JOBS, SAMPLE_AREA } from "./sample.js";
import { createJobsEditor } from "./jobs.js";
import { wireCopy } from "./share.js";
import { shrinkPhoto } from "./photo.js";
import { el, icon, renderChart, renderMini, renderNow, renderMisses } from "./draw.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  tab: "photo",
  areas: [],
  area: "",
  backupMinutes: 0,
  day: "today",
  ai: false,
  vision: false,
  plan: null,
  planArea: "",
};

// A page address ending in ?now=14:20 sets the clock, for demonstrations and tests.
const clockOverride = (() => {
  const v = new URLSearchParams(location.search).get("now");
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || "");
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${String(m[1]).padStart(2, "0")}:${m[2]}` : null;
})();
function nowMinutes() {
  if (clockOverride) { const [h, m] = clockOverride.split(":").map(Number); return h * 60 + m; }
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ---- Jobs ----
const editor = createJobsEditor($("jobs"), { initialJobs: SAMPLE_JOBS, onChange: () => changed() });
$("add-job").addEventListener("click", () => editor.addEmpty());

$("words-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("words");
  const { jobs, unread } = parseJobs(input.value);
  const note = $("words-note");
  if (!jobs.length) {
    note.className = "words-note warn";
    note.textContent = unread.length ? `I couldn't find a time in: ${unread.join("; ")}. Try "iron 45 min".` : "Type a job and how long it takes, like “iron 45 min”.";
    return;
  }
  editor.addJobs(jobs);
  input.value = "";
  note.className = unread.length ? "words-note warn" : "words-note";
  note.textContent = `Added ${jobs.length} job${jobs.length === 1 ? "" : "s"}.${unread.length ? ` I couldn't find a time in: ${unread.join("; ")}.` : ""}`;
});

// ---- Tabs ----
function setTab(name, focus = false) {
  state.tab = name;
  for (const t of ["photo", "text"]) {
    const tab = $(`tab-${t}`);
    const on = t === name;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    $(`panel-${t}`).hidden = !on;
    if (on && focus) tab.focus();
  }
}
$("tab-photo").addEventListener("click", () => setTab("photo"));
$("tab-text").addEventListener("click", () => setTab("text"));
document.querySelector(".tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  setTab(state.tab === "photo" ? "text" : "photo", true);
});

// ---- The reader's note ----
function setNote(text, { tag = "", kind = "" } = {}) {
  const n = $("reader-note");
  n.className = `reader-note${kind ? ` ${kind}` : ""}`;
  n.replaceChildren(...(tag ? [el("span", { class: "tag", text: tag })] : []), document.createTextNode(text));
}

// ---- Reading a text notice ----
async function readText() {
  const text = $("notice").value;
  if (!text.trim()) { setNote("Paste a notice first, or use the sample text.", { kind: "warn" }); $("notice").focus(); return; }
  const btn = $("read");
  btn.setAttribute("aria-busy", "true");
  btn.disabled = true;
  showSkeleton();
  try {
    let data = null;
    if (state.ai && navigator.onLine) {
      try {
        const res = await fetch("/api/read-notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        if (res.ok) data = await res.json();
        else if (res.status === 413 || res.status === 400) { const j = await res.json().catch(() => ({})); setNote(j.error || "That notice is too long.", { kind: "warn" }); fillAreas(); return; }
      } catch { /* fall through to the rules in the page */ }
    }
    if (!data) data = { areas: rulesRead(text), reader: "rules", note: state.ai && navigator.onLine ? "The AI reader was unavailable, so the built-in rules read it." : "" };
    acceptAreas(data);
  } finally {
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
  }
}

function acceptAreas(data) {
  state.areas = data.areas || [];
  const label = data.reader === "ai" ? (data.from === "photo" ? "Read from the photo by AI" : "Read by AI") : "Read by built-in rules";
  if (!state.areas.length) {
    setNote(`No outage times found. Check the notice has times like 05:00–09:00.${data.from === "photo" && data.note ? ` ${data.note}` : ""}`, { tag: label, kind: "warn" });
  } else {
    const n = state.areas.length;
    setNote(`${n} area${n === 1 ? "" : "s"} found.${data.note ? ` ${data.note}` : ""}`, { tag: label });
  }
  fillAreas();
}

function showSkeleton() {
  const box = $("areas");
  box.replaceChildren(el("legend", { class: "sr-only", text: "Areas in the notice" }), ...[0, 1, 2].map(() => el("span", { class: "chip skeleton" }, el("span", { text: "…" }))));
  $("area-hint").textContent = "Reading the notice…";
}

// ---- Choosing the area ----
function fillAreas() {
  const box = $("areas");
  const keep = state.area;
  box.replaceChildren(el("legend", { class: "sr-only", text: "Areas in the notice" }));
  if (!state.areas.length) {
    box.append(el("p", { class: "chips-empty", id: "areas-empty", text: "No areas yet." }));
    $("area-hint").textContent = "Read the notice to see the areas it names.";
    state.area = "";
    showOff();
    return;
  }
  $("area-hint").textContent = "Choose yours, then check its times against the notice.";
  for (const a of state.areas) {
    const input = el("input", { type: "radio", name: "area", value: a.name });
    input.addEventListener("change", () => { state.area = a.name; showOff(); changed(); });
    box.append(el("label", { class: "chip" }, input, el("span", { text: a.name })));
  }
  if (state.areas.some((a) => a.name === keep)) selectArea(keep, false);
  else { state.area = ""; showOff(); }
}

function selectArea(name, announce = true) {
  state.area = name;
  for (const i of $("areas").querySelectorAll("input")) i.checked = i.value === name;
  showOff();
  if (announce) changed();
}

function selectedArea() { return state.areas.find((a) => a.name === state.area) || null; }

function showOff() {
  const area = selectedArea();
  $("off-block").hidden = !area;
  if (!area) return;
  const line = $("off-line");
  line.replaceChildren();
  if (area.off.length) line.append(el("strong", { text: "Off " }), document.createTextNode(area.off.map((o) => `${o.start}–${o.end}`).join(", ")));
  else line.append(el("strong", { text: "No outages listed" }), document.createTextNode(" for this area."));
  renderMini($("area-chart"), planDay({ outages: area.off, jobs: [] }));
}

// ---- Backup ----
function setBackup(minutes, announce = true) {
  state.backupMinutes = Math.max(0, Math.min(12 * 60, minutes));
  $("backup-value").textContent = state.backupMinutes ? formatDuration(state.backupMinutes) : "None";
  $("backup-minus").disabled = state.backupMinutes === 0;
  $("backup-plus").disabled = state.backupMinutes === 12 * 60;
  if (announce) changed();
}
$("backup-minus").addEventListener("click", () => setBackup(state.backupMinutes - 30));
$("backup-plus").addEventListener("click", () => setBackup(state.backupMinutes + 30));

// ---- Today or tomorrow ----
function dayLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
function setDay(day, announce = true) {
  state.day = day;
  $("day-today").setAttribute("aria-checked", String(day === "today"));
  $("day-tomorrow").setAttribute("aria-checked", String(day === "tomorrow"));
  $("plan-title").textContent = day === "today" ? "Today" : "Tomorrow";
  $("plan-date").textContent = dayLabel(day === "today" ? 0 : 1);
  if (announce) changed();
}
$("day-today").addEventListener("click", () => setDay("today"));
$("day-tomorrow").addEventListener("click", () => setDay("tomorrow"));

// ---- Planning and drawing ----
function planNow({ scroll = false } = {}) {
  const area = selectedArea();
  const note = $("plan-note");
  note.className = "reader-note";
  note.textContent = "";
  if (!area) {
    note.classList.add("warn");
    note.textContent = state.areas.length ? "Choose your area first." : "Read a notice first, or try the sample day.";
    (state.areas.length ? $("areas").querySelector("input") : $("hero-sample"))?.focus();
    return;
  }
  const first = state.plan === null;
  state.plan = planDay({ outages: area.off, jobs: editor.getJobs(), backupMinutes: state.backupMinutes });
  state.planArea = area.name;
  $("copied").textContent = "";
  drawPlan(!first);
  if (scroll && window.matchMedia("(max-width: 979px)").matches) {
    $("plan-card").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
}

function drawPlan(announce = false, animate = true) {
  const plan = state.plan;
  if (!plan) return;
  $("plan-empty").hidden = true;
  $("plan-body").hidden = false;
  $("plan-area").textContent = `Your day in ${state.planArea}`;
  const showNow = state.day === "today";
  const minute = nowMinutes();
  const now = $("now-card");
  now.hidden = !showNow;
  if (showNow) renderNow(now, plan, nowStatus(plan, minute), { clockSet: clockOverride });
  renderChart($("chart"), plan, { now: showNow ? minute : null, animate });
  renderMisses($("misses"), plan, { onTryBackup: () => setBackup(60) });
  $("plan-text").hidden = true;
  if (announce) {
    const missed = plan.unplaced.length + plan.skipped.length;
    $("plan-live").textContent = `Plan updated: ${plan.placed.length} job${plan.placed.length === 1 ? "" : "s"} placed${missed ? `, ${missed} didn't fit` : ""}.`;
  }
}

// Once there is a plan, it follows every change.
function changed() { if (state.plan) planNow(); }

setInterval(() => { if (state.plan && state.day === "today" && !clockOverride) drawPlan(false, false); }, 30000);

$("plan").addEventListener("click", () => planNow({ scroll: true }));

// ---- The notice ----
$("use-sample").addEventListener("click", () => {
  $("notice").value = SAMPLE_NOTICE;
  setNote("Sample text added. The areas and times in it are fictional. Press Read the notice.");
  $("read").focus();
});
$("read").addEventListener("click", readText);

// ---- Reading a photo of the notice ----
function showPhotoAvailability() {
  const off = !state.vision;
  $("photo-choose").disabled = off;
  $("photo-sample").disabled = off;
  const p = document.querySelector("#panel-photo .privacy");
  p.textContent = off
    ? "Photo reading needs the AI reader, which is switched off in this copy. Use the Text tab: it works with no setup."
    : "The photo goes to the AI reader to be read. It is not stored.";
}

const PHOTO_PROBLEMS = {
  "too-big": "That photo is very large. Try a smaller one, or paste the text.",
  "unreadable-format": "This browser can't open that kind of photo. Try a screenshot or a JPEG, or paste the text.",
  "not-an-image": "That file is not a picture. Choose a photo of the notice, or paste the text.",
};

let photoUrl = null;
function showPreview(blob) {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(blob);
  $("photo-img").src = photoUrl;
  $("photo-preview").hidden = false;
  $("photo-choose").hidden = true;
}
function setReading(on) {
  $("photo-preview").classList.toggle("reading", on);
  for (const id of ["photo-choose", "photo-sample", "read"]) { $(id).disabled = on || (id !== "read" && !state.vision); }
  if (on) { showSkeleton(); setNote("Reading the photo…", { kind: "" }); }
}

async function readPhoto(blob) {
  if (!navigator.onLine) { setNote("Photo reading needs a connection. The Text tab works offline.", { kind: "warn" }); return; }
  let dataUrl;
  try {
    dataUrl = await shrinkPhoto(blob);
  } catch (e) {
    setNote(PHOTO_PROBLEMS[e.message] || PHOTO_PROBLEMS["unreadable-format"], { kind: "err" });
    return;
  }
  showPreview(blob);
  setReading(true);
  try {
    const res = await fetch("/api/read-notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNote(data.error || "I couldn't read that photo. Try again, or paste the text.", { kind: "err" });
      state.areas = [];
      fillAreas();
      return;
    }
    if (data.transcript) $("notice").value = data.transcript;
    acceptAreas({ ...data, note: [data.note, data.transcript ? "The text it saw is in the Text tab, in case you want to check it." : ""].filter(Boolean).join(" ") });
  } catch {
    setNote("I couldn't reach the reader. Check your connection, or paste the text.", { kind: "err" });
    state.areas = [];
    fillAreas();
  } finally {
    setReading(false);
    showPhotoAvailability();
  }
}

$("photo-choose").addEventListener("click", () => $("photo-input").click());
$("photo-input").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (file) readPhoto(file);
});
$("photo-img").addEventListener("click", () => { if (state.vision) $("photo-input").click(); });
$("photo-sample").addEventListener("click", async () => {
  try {
    const res = await fetch("/sample-notice.jpg");
    if (!res.ok) throw new Error("missing");
    readPhoto(await res.blob());
  } catch {
    setNote("The sample photo needs a connection. Try the sample text instead.", { kind: "warn" });
  }
});

// ---- The sample day in one tap ----
function loadSampleDay() {
  setTab("text");
  $("notice").value = SAMPLE_NOTICE;
  state.areas = rulesRead(SAMPLE_NOTICE);
  setNote("The areas and times in it are fictional.", { tag: "Sample day" });
  fillAreas();
  selectArea(SAMPLE_AREA, false);
  editor.setJobs(SAMPLE_JOBS);
  planNow({ scroll: true });
}
$("hero-sample").addEventListener("click", loadSampleDay);
$("hero-photo").addEventListener("click", () => {
  setTab("photo");
  $("notice-card").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  ($("photo-choose").disabled ? $("tab-text") : $("photo-choose")).focus({ preventScroll: true });
});

// ---- The hero's example day ----
(function drawExample() {
  const sample = rulesRead(SAMPLE_NOTICE).find((a) => a.name === SAMPLE_AREA);
  const plan = planDay({ outages: sample.off, jobs: SAMPLE_JOBS, backupMinutes: 60 });
  renderChart($("hero-chart"), plan, { compact: true });
})();

// ---- Status ----
async function showStatus() {
  try {
    const res = await fetch("/api/status");
    const s = await res.json();
    state.ai = Boolean(s.ai);
    state.vision = Boolean(s.vision);
  } catch { /* keep the defaults */ }
  const pill = $("ai-pill");
  pill.textContent = state.ai ? "AI reader on" : "Built-in rules only";
  pill.classList.toggle("on", state.ai);
  pill.classList.toggle("soft", !state.ai);
  showPhotoAvailability();
}

// ---- Wiring the rest ----
wireCopy($("copy"), $("copied"), $("plan-text"), () => (state.plan ? planToText(state.plan, state.planArea, dayLabel(state.day === "today" ? 0 : 1)) : ""));
setBackup(0, false);
setDay("today", false);
setTab("photo");
showPhotoAvailability();
showStatus();
