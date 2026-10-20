#!/usr/bin/env node
// Records every shot of the demo video from the running app (and the drawn scenes), one repeatable script each.
//   node tools/video/record.cjs [shot ...]      shots: chat phone-a desk-b home phone-c audience planfirst closing
// Needs: the app running at APP (default http://localhost:5174, with the AI reader switched on for the photo shots),
// `node tools/video/serve.cjs` running for the drawn scenes (SCENES, default http://localhost:5192), and
// submission/work/timeline.json from `narrate.py assemble`: every action is timed from the narration (segments.cjs).
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const { record, hand } = require("./capture.cjs");
const { rel } = require("./segments.cjs");

const APP = process.env.APP || "http://localhost:5174";
const SCENES = process.env.SCENES || "http://localhost:5192";
const ROOT = path.resolve(__dirname, "..", "..");
const WORK = path.join(ROOT, "submission", "work");
const OUT = path.join(WORK, "shots");
const SAMPLE_PHOTO = path.join(ROOT, "public", "sample-notice.jpg");
const PHONE = { viewport: { width: 390, height: 844 }, scale: 2, mobile: true };
const LAPTOP = { viewport: { width: 1280, height: 720 }, scale: 1.5, mobile: false };
const NOW = "?now=08:00"; // the demo clock: eight in the morning, before the first cut ends

// The phone's quick-settings panel, drawn over the page for the airplane-mode moment (no real brand's panel).
const QUICK_SETTINGS = `(() => {
  const icon = {
    wifi: '<path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.7 7.7 0 0 1 11 0M9.5 16a3.4 3.4 0 0 1 5 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
    data: '<path d="M5 19v-4M10 19V12M15 19V8M20 19V4"/>',
    plane: '<path d="M21 15.5v-1.7l-8-5V4.4a1.4 1.4 0 0 0-2.8 0v4.4l-8 5v1.7l8-2.3v4.1l-2 1.5V21l3.4-.9 3.4.9v-1.7l-2-1.5v-4.1l8 2.3Z"/>',
    quiet: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
  };
  const tile = (id, label, on) => '<div style="display:grid;justify-items:center;gap:7px"><div id="qs-' + id + '" style="width:58px;height:58px;border-radius:20px;display:grid;place-items:center;transition:background .3s,color .3s;background:' + (on ? "#2A72DE" : "#F3EDE0") + ';color:' + (on ? "#fff" : "#6A665F") + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icon[id] + '</svg></div><span>' + label + '</span></div>';
  const q = document.createElement("div");
  q.id = "qs";
  q.style.cssText = "position:fixed;left:10px;right:10px;top:10px;z-index:2147483000;background:#fff;border-radius:30px;padding:18px 14px 14px;box-shadow:0 26px 50px -16px rgba(80,52,8,.45),0 0 0 1px rgba(28,27,26,.07);transform:translateY(-135%);transition:transform .55s cubic-bezier(.32,.72,0,1);font:600 12.5px/1.2 Geist,system-ui,sans-serif;color:#4A4741;";
  q.innerHTML = '<div style="display:flex;justify-content:space-around">' + tile("wifi", "Wi-Fi", true) + tile("data", "Mobile data", true) + tile("plane", "Airplane mode", false) + tile("quiet", "Silent", false) + '</div><div id="qs-note" style="margin-top:12px;text-align:center;font-weight:500;color:#6A665F">Wi-Fi and mobile data are on</div>';
  document.documentElement.append(q);
  requestAnimationFrame(() => requestAnimationFrame(() => { q.style.transform = "none"; }));
})();`;
const AIRPLANE_ON = `(() => {
  const on = (id) => { const e = document.getElementById("qs-" + id); e.style.background = "#2A72DE"; e.style.color = "#fff"; };
  const off = (id) => { const e = document.getElementById("qs-" + id); e.style.background = "#F3EDE0"; e.style.color = "#6A665F"; };
  on("plane"); off("wifi"); off("data");
  document.getElementById("qs-note").textContent = "Airplane mode is on";
})();`;

// The first screen of the app, as it opens from the home-screen icon (the home scene opens into it).
async function prepHero() {
  const browser = await chromium.launch(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {});
  const ctx = await browser.newContext({ viewport: PHONE.viewport, deviceScaleFactor: PHONE.scale, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${APP}/${NOW}`);
  await page.click("#hero-sample");
  await page.waitForSelector("#chart .row-job");
  await page.fill("#words", "charge the radio 30 min");
  await page.click("#words-add");
  await page.click("#backup-plus"); await page.click("#backup-plus");
  await page.waitForTimeout(1500);
  await page.goto(`${APP}/${NOW}`);
  await page.waitForSelector("#chart .row-job");
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1600);
  fs.mkdirSync(WORK, { recursive: true });
  await page.screenshot({ path: path.join(WORK, "hero-phone.png") });
  await browser.close();
}

const A = (id, d = 0) => rel("phone-a", id, d);
const D = (id, d = 0) => rel("desk-b", id, d);
const C = (id, d = 0) => rel("phone-c", id, d);

const SHOTS = {
  // The drawn group chat: the notice arrives as a picture.
  chat: () => record({ name: "chat", outDir: OUT, ...PHONE, fingers: false, start: `${SCENES}/chat.html`, script: async ({ sleep }) => { await sleep(10400); } }),

  // The product on a phone: photo in, area, a job in plain words, plan out; then a messier photo.
  "phone-a": () => record({ name: "phone-a", outDir: OUT, ...PHONE, start: `${APP}/${NOW}`,
    script: async ({ page, mark, at }) => {
      const h = hand(page);
      await h.moveTo(300, 760, 0);
      await at(0.9);
      mark("hero");
      await at(A("s1c", 1.4));
      await h.click("#hero-photo", { ms: 550 });
      await at(A("s2a", -0.7));
      const [chooser] = await Promise.all([page.waitForEvent("filechooser"), h.click("#photo-choose", { ms: 500 })]);
      await chooser.setFiles(SAMPLE_PHOTO);
      mark("photo-chosen");
      await page.waitForSelector("#areas input", { timeout: 25000 });
      mark("areas");
      await at(A("s2a", 5.0));
      await h.scrollToEl("#area-card", { offset: 12, ms: 700 });
      await at(A("s2b", -0.1));
      await h.click("#areas label:has-text('Riverside East')", { ms: 450 });
      mark("area-chosen");
      await at(A("s2b", 0.9));
      await h.scrollToEl("#jobs-card", { offset: 12, ms: 650 });
      await at(A("s2b", 1.5));
      await h.type("#words", "charge the radio 30 min", 25, { ms: 350 });
      await h.click("#words-add", { ms: 300 });
      mark("job-added");
      await at(A("s2b", 3.6));
      await h.scrollToEl("#plan", { offset: 260, ms: 450 });
      await at(A("s2b", 4.3));
      await h.click("#plan", { ms: 350 });
      mark("planned");
      await at(A("s2c", 0.6));
      await h.scrollToEl("#plan-card", { offset: 10, ms: 600 });
      await at(A("s2c", 1.9));
      await h.scrollTo(await page.evaluate(() => scrollY + 330), 1400);
      await at(A("s2c", 4.3));
      await h.scrollTo(await page.evaluate(() => scrollY + 380), 1400);
      mark("miss-visible");
      await at(A("s2d", 0.3));
      await h.scrollToEl("#notice-card", { offset: 10, ms: 1500 });
      await at(A("s2d", 4.6));
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1400 });
      // a messier photo, read live
      await at(A("s2e", -0.9));
      await h.scrollToEl("#notice-card", { offset: 10, ms: 1000 });
      await at(A("s2e", 0.1));
      await h.click("#photo-sample-2", { ms: 600 });
      mark("messy-chosen");
      await page.waitForSelector("#areas label:has-text('Old Quarry')", { timeout: 30000 });
      mark("messy-areas");
      await at(A("s2e", 4.4));
      await h.scrollToEl("#area-card", { offset: 12, ms: 700 });
      await at(A("s2e", 5.4));
      await h.click("#areas label:has-text('Old Quarry')", { ms: 450 });
      mark("messy-area-chosen");
      await at(A("s2e", 12.0));
    } }),

  // The product on a laptop: why a job did not fit, the backup that saves it, then a revised notice.
  "desk-b": () => record({ name: "desk-b", outDir: OUT, ...LAPTOP, start: `${APP}/${NOW}`,
    setup: async ({ page }) => {
      await page.click("#hero-sample");
      await page.waitForSelector("#chart .row-job");
      await page.fill("#words", "charge the radio 30 min");
      await page.click("#words-add");
      await page.waitForTimeout(1200);
      await page.evaluate(() => { document.querySelector("#area-card").scrollIntoView({ behavior: "instant", block: "start" }); window.scrollBy(0, -16); });
      await page.waitForTimeout(800);
    },
    script: async ({ page, mark, at }) => {
      const h = hand(page);
      await h.moveTo(1000, 520, 0);
      await at(D("s3a", -0.03));
      mark("plan");
      await h.moveTo(900, 420, 700);
      await h.scrollEl("#plan-card", 700, 1600);
      await at(D("s3a", 2.57));
      await h.point(".misses li", { ms: 800, scroll: false });
      mark("miss");
      await at(D("s3b", 1.83));
      await h.click(".misses li .btn", { scroll: false, ms: 700 });
      mark("backup-on");
      await at(D("s3b", 4.2));
      // show the whole day, the beans row included
      const end = await page.evaluate(() => { const e = document.querySelector("#plan-card"); return e.scrollHeight - e.clientHeight; });
      await h.scrollEl("#plan-card", end, 1200);
      mark("beans-fit");
      await h.moveTo(1180, 640, 1600);
      await at(D("s3c", -0.2));
      await h.click("#backup-plus", { ms: 900 });
      mark("plus");
      await at(D("s3c", 1.7));
      await h.click("#backup-minus", { ms: 600 });
      mark("minus");
      // the revised notice
      await at(D("s3d", -1.3));
      await h.scrollToEl("#notice-card", { offset: 16, ms: 700 });
      await at(D("s3d", -0.3));
      await h.click("#tab-text", { ms: 450 });
      await at(D("s3d", 0.7));
      await h.click("#use-revised", { ms: 450 });
      mark("revised-text");
      await at(D("s3d", 2.2));
      await h.click("#read", { ms: 450 });
      await page.waitForSelector("#changes-card:not([hidden])", { timeout: 30000 });
      mark("changes");
      await h.scrollEl("#plan-card", 0, 700);
      await at(D("s3d", 10.4));
      await h.scrollEl("#plan-card", 240, 1200);
      mark("new-plan");
      await at(D("s4a", 2.8));
    } }),

  // The phone's home screen: the prompt, the icon, and the app opening from it.
  home: async () => {
    await prepHero();
    return record({ name: "home", outDir: OUT, ...PHONE, fingers: false, start: `${SCENES}/home.html`,
      script: async ({ page, sleep }) => {
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => document.body.classList.add("go"));
        await sleep(4500);
      } });
  },

  // The phone with no power and no network: the plan is still there; then sharing.
  "phone-c": () => record({ name: "phone-c", outDir: OUT, ...PHONE, start: `${APP}/${NOW}`,
    setup: async ({ page }) => {
      await page.click("#hero-sample");
      await page.waitForSelector("#chart .row-job");
      await page.fill("#words", "charge the radio 30 min");
      await page.click("#words-add");
      await page.click("#backup-plus"); await page.click("#backup-plus");
      await page.waitForTimeout(1500);
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.waitForTimeout(1500);
      await page.goto(`${APP}/${NOW}`); // the next visit: opened from the saved household
      await page.waitForSelector("#chart .row-job");
      await page.evaluate(() => scrollTo(0, 0));
    },
    script: async ({ page, context, mark, at }) => {
      const h = hand(page);
      await h.moveTo(300, 700, 0);
      await at(0.4);
      mark("saved-open");
      await at(0.7);
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1300 });
      // airplane mode: the quick-settings panel, a tap on the airplane tile, then the reload with no network
      await at(C("s4c", 0.15));
      await page.evaluate(QUICK_SETTINGS);
      mark("airplane");
      await at(C("s4c", 0.55));
      await h.point("#qs-plane", { ms: 450, scroll: false });
      await page.waitForTimeout(120);
      await page.mouse.down();
      await page.evaluate(AIRPLANE_ON); // the tile turns on as the finger lands
      await page.waitForTimeout(110);
      await page.mouse.up();
      mark("airplane-on");
      await at(C("s4c", 2.4));
      await page.evaluate(() => { document.getElementById("qs").style.transform = "translateY(-135%)"; });
      await context.setOffline(true);
      await at(C("s4c", 2.7));
      await page.reload();
      await page.waitForSelector("#chart .row-job");
      mark("offline-reloaded");
      await at(C("s4c", 3.1));
      await h.scrollTo(0, 500); // the top of the page, where the Offline pill is
      mark("offline-pill");
      await at(C("s4c", 4.4));
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1000 });
      mark("right-now");
      await at(C("s4d", -0.3));
      await h.scrollToEl("#jobs-card", { offset: 12, ms: 1400 });
      mark("saved-jobs");
      await at(C("s4d", 2.3));
      await h.scrollToEl("#forget", { offset: 480, ms: 1500 });
      await at(C("s5a", -0.7));
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1100 });
      await at(C("s5a", 0.1));
      await h.scrollTo(await page.evaluate(() => document.querySelector("#btn-picture").getBoundingClientRect().top + scrollY - 560), 700);
      await at(C("s5a", 1.06));
      await h.click("#btn-picture", { ms: 500 });
      mark("picture");
      await page.waitForSelector("#card-dialog[open]");
      await at(C("s5a", 4.46));
      await page.keyboard.press("Escape");
      await at(C("s5a", 5.06));
      await h.click("#btn-ics", { ms: 500 });
      mark("calendar");
      await at(C("s5a", 7.4));
    } }),

  audience: () => record({ name: "audience", outDir: OUT, ...LAPTOP, fingers: false, start: `${SCENES}/audience.html`, script: async ({ sleep }) => { await sleep(16300); } }),
  planfirst: () => record({ name: "planfirst", outDir: OUT, ...LAPTOP, fingers: false, start: `${SCENES}/planfirst.html`, script: async ({ sleep }) => { await sleep(13400); } }),

  // The close: back to the first screen of the app.
  closing: () => record({ name: "closing", outDir: OUT, ...LAPTOP, fingers: false, start: `${APP}/${NOW}`,
    setup: async ({ page }) => {
      await page.click("#hero-sample");
      await page.waitForSelector("#chart .row-job");
      await page.waitForTimeout(1500);
    },
    script: async ({ page, sleep }) => {
      const h = hand(page);
      await sleep(900);
      await h.scrollTo(0, 3200);
      await sleep(4300);
    } }),
};

(async () => {
  const wanted = process.argv.slice(2);
  const names = wanted.length ? wanted : Object.keys(SHOTS);
  for (const n of names) {
    if (!SHOTS[n]) throw new Error(`no shot called ${n}`);
    const r = await SHOTS[n]();
    console.log(n.padEnd(10), `${r.seconds.toFixed(1)} s`, `${r.width}x${r.height}`, r.events.map((e) => `${e.label}@${e.t.toFixed(1)}`).join(" "));
  }
})().catch((e) => { console.error(e); process.exit(1); });
