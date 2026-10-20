import { planDay, planToText, formatDuration, diffPlans } from "./planner.js";
import { nowStatus } from "./now.js";
import { rulesRead } from "./rules.js";
import { parseJobs } from "./jobtext.js";
import { SAMPLE_NOTICE, SAMPLE_REVISED_NOTICE, SAMPLE_JOBS, SAMPLE_AREA } from "./sample.js";
import { createJobsEditor } from "./jobs.js";
import { wireCopy, wireShare } from "./share.js";
import { shrinkPhoto } from "./photo.js";
import { loadHousehold, saveHousehold, forgetHousehold } from "./store.js";
import { el, icon, renderChart, renderMini, renderNow, renderMisses, renderChanges } from "./draw.js";

const $ = (id) => document.getElementById(id);
const isOnline = () => navigator.onLine && !state.apiDown;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  tab: "photo",
  areas: [],
  area: "",
  backupMinutes: 0,
  day: "today",
  ai: false,
  vision: false,
  apiDown: false, // the server could not be reached, so photo reading and the AI reader are off for now
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
    if (state.ai && isOnline()) {
      try {
        const res = await fetch("/api/read-notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        if (res.ok) data = await res.json();
        else if (res.status === 413 || res.status === 400) { const j = await res.json().catch(() => ({})); setNote(j.error || "That notice is too long.", { kind: "warn" }); fillAreas(); return; }
      } catch { /* fall through to the rules in the page */ }
    }
    if (!data) data = { areas: rulesRead(text), reader: "rules", note: state.ai && isOnline() ? "The AI reader was unavailable, so the built-in rules read it." : "" };
    acceptAreas(data);
  } finally {
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
  }
}

function acceptAreas(data) {
  const before = state.plan;
  const beforeArea = state.planArea;
  state.areas = data.areas || [];
  const label = data.reader === "ai" ? (data.from === "photo" ? "Read from the photo by AI" : "Read by AI") : "Read by built-in rules";
  if (!state.areas.length) {
    setNote(`No outage times found. Check the notice has times like 05:00–09:00.${data.from === "photo" && data.note ? ` ${data.note}` : ""}`, { tag: label, kind: "warn" });
  } else {
    const n = state.areas.length;
    setNote(`${n} area${n === 1 ? "" : "s"} found.${data.note ? ` ${data.note}` : ""}`, { tag: label });
  }
  fillAreas();
  // A revised notice for the area already planned: plan again at once and say what moved.
  if (before && state.area && state.area === beforeArea) {
    planNow();
    const diff = diffPlans(before, state.plan);
    renderChanges($("changes-card"), diff);
    if (diff.changed) $("plan-live").textContent = `The notice changed. ${diff.items.length} job${diff.items.length === 1 ? "" : "s"} affected.`;
  } else {
    renderChanges($("changes-card"), null);
  }
}

function showSkeleton() {
  const box = $("areas");
  box.replaceChildren(el("legend", { class: "sr-only", text: "Areas in the notice" }), ...[0, 1, 2].map(() => el("span", { class: "chip skeleton" }, el("span", { text: "…" }))));
  $("area-hint").textContent = "Reading the notice…";
}

// A new notice that does not hold the chosen area leaves the old plan with nothing to stand on.
function clearPlan() {
  if (!state.plan) return;
  state.plan = null;
  state.planArea = "";
  $("plan-body").hidden = true;
  $("plan-empty").hidden = false;
  $("plan-area").textContent = "Your day";
  renderChanges($("changes-card"), null);
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
  else { state.area = ""; showOff(); clearPlan(); }
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
function dayDate(day) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (day === "tomorrow") d.setDate(d.getDate() + 1);
  return d;
}
function dayLabel(offset) {
  const d = dayDate(offset === 1 || offset === "tomorrow" ? "tomorrow" : "today");
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
  const newAreaOrDay = first || state.planArea !== area.name || state.planDay !== state.day;
  state.planDay = state.day;
  state.plan = planDay({ outages: area.off, jobs: editor.getJobs(), backupMinutes: state.backupMinutes });
  state.planArea = area.name;
  $("copied").textContent = "";
  drawPlan(!first, newAreaOrDay ? true : "bars");
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

// Once there is a plan, it follows every change, and every change is saved on this device.
function changed() {
  if (state.plan) planNow();
  scheduleSave();
}

let saveTimer = null;
let storageBlocked = false;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ok = saveHousehold({
      notice: $("notice").value,
      areas: state.areas,
      area: state.area,
      backupMinutes: state.backupMinutes,
      day: state.day,
      jobs: editor.getJobs(),
    });
    if (!ok && !storageBlocked) { storageBlocked = true; $("forget-note").textContent = "This browser won't save your household."; }
  }, 250);
}
$("notice").addEventListener("input", scheduleSave);

setInterval(() => { if (state.plan && state.day === "today" && !clockOverride) drawPlan(false, false); }, 30000);

$("plan").addEventListener("click", () => planNow({ scroll: true }));

// ---- The notice ----
$("use-sample").addEventListener("click", () => {
  $("notice").value = SAMPLE_NOTICE;
  setNote("Sample text added. The areas and times in it are fictional. Press Read the notice.");
  $("read").focus();
});
$("use-revised").addEventListener("click", () => {
  $("notice").value = SAMPLE_REVISED_NOTICE;
  setNote("Revised notice added. Press Read the notice to see what moved.");
  $("read").focus();
});
$("read").addEventListener("click", readText);

// ---- Reading a photo of the notice ----
function showPhotoAvailability() {
  const noReader = !state.vision;
  const offline = !isOnline();
  const off = noReader || offline;
  $("photo-choose").disabled = off;
  $("photo-sample").disabled = off;
  $("photo-sample-2").disabled = off;
  const p = document.querySelector("#panel-photo .privacy");
  p.textContent = noReader
    ? "Photo reading needs the AI reader, which is switched off in this copy. Use the Text tab: it works with no setup."
    : offline
      ? "Photo reading needs a connection. The Text tab works offline."
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
  for (const id of ["photo-choose", "photo-sample", "photo-sample-2", "read"]) { $(id).disabled = on || (id !== "read" && (!state.vision || !isOnline())); }
  if (on) { showSkeleton(); setNote("Reading the photo…", { kind: "" }); }
}

async function readPhoto(blob) {
  if (!isOnline()) { setNote("Photo reading needs a connection. The Text tab works offline.", { kind: "warn" }); return; }
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
for (const [id, file] of [["photo-sample", "/sample-notice.jpg"], ["photo-sample-2", "/sample-notice-2.jpg"]]) {
  $(id).addEventListener("click", async () => {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error("missing");
      readPhoto(await res.blob());
    } catch {
      setNote("The sample photo needs a connection. Try the sample text instead.", { kind: "warn" });
    }
  });
}

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
    const st = await res.json();
    state.ai = Boolean(st.ai);
    state.vision = Boolean(st.vision);
    state.apiDown = false;
    try { localStorage.setItem("onhours.status", JSON.stringify({ ai: state.ai, vision: state.vision })); } catch { /* not saved */ }
  } catch {
    // No network, or the server is not running: keep what the last visit learned.
    state.apiDown = true;
    try { const last = JSON.parse(localStorage.getItem("onhours.status") || "{}"); state.ai = Boolean(last.ai); state.vision = Boolean(last.vision); } catch { /* keep the defaults */ }
  }
  showConnection();
}

// ---- Online or not ----
function showConnection() {
  const online = isOnline();
  $("net-pill").hidden = online;
  const pill = $("ai-pill");
  pill.hidden = !online;
  pill.textContent = state.ai ? "AI reader on" : "Built-in rules only";
  pill.classList.toggle("on", state.ai);
  pill.classList.toggle("soft", !state.ai);
  showPhotoAvailability();
}
window.addEventListener("offline", () => { state.apiDown = true; showConnection(); });
window.addEventListener("online", () => { showStatus(); });

// ---- Coming back: restore the household saved on this device ----
function restore() {
  const saved = loadHousehold();
  if (!saved) return false;
  editor.setJobs(saved.jobs);
  $("notice").value = saved.notice;
  state.areas = saved.areas;
  fillAreas();
  setBackup(saved.backupMinutes, false);
  setDay(saved.day, false);
  if (saved.area && state.areas.some((a) => a.name === saved.area)) {
    selectArea(saved.area, false);
    planNow();
  }
  if (state.areas.length) setNote("Welcome back. Your jobs and your last notice are saved on this device.", { tag: "Saved" });
  if (saved.notice && !state.areas.length) setTab("text");
  return true;
}

// ---- Forget this device ----
$("forget").addEventListener("click", () => {
  clearTimeout(saveTimer);
  forgetHousehold();
  state.areas = [];
  state.area = "";
  state.plan = null;
  state.planArea = "";
  $("notice").value = "";
  $("photo-preview").hidden = true;
  $("photo-choose").hidden = false;
  editor.setJobs(SAMPLE_JOBS);
  fillAreas();
  setBackup(0, false);
  setDay("today", false);
  setTab("photo");
  $("plan-body").hidden = true;
  $("plan-empty").hidden = false;
  $("plan-area").textContent = "Your day";
  setNote("");
  $("words-note").textContent = "";
  $("plan-note").textContent = "";
  $("forget-note").textContent = "Done. This device no longer holds your household.";
});

// ---- Wiring the rest ----
wireCopy($("copy"), $("copied"), $("plan-text"), () => (state.plan ? planToText(state.plan, state.planArea, dayLabel(state.day === "today" ? 0 : 1)) : ""));
wireShare({
  pictureBtn: $("btn-picture"), icsBtn: $("btn-ics"), dialog: $("card-dialog"), canvas: $("card-canvas"),
  shareBtn: $("card-share"), downloadBtn: $("card-download"), statusEl: $("copied"),
  get: () => (state.plan ? { plan: state.plan, areaName: state.planArea, dayLabel: dayLabel(state.day), date: dayDate(state.day) } : null),
});
setBackup(0, false);
setDay("today", false);
setTab("photo");
restore();
showConnection();
showStatus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* the page still works online */ }); });
}
