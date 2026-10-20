#!/usr/bin/env node
// Records every shot of the demo video from the running app (and the drawn scenes), one repeatable script each.
//   node tools/video/record.cjs [shot ...]      shots: chat phone-a desk-b home phone-c audience planfirst closing
// Needs: the app running at APP (default http://localhost:5174, with the AI reader switched on for the photo shot),
// and `node tools/video/serve.cjs` running for the drawn scenes (SCENES, default http://localhost:5192).
const path = require("path");
const { record, hand } = require("./capture.cjs");

const APP = process.env.APP || "http://localhost:5174";
const SCENES = process.env.SCENES || "http://localhost:5192";
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "submission", "work", "shots");
const SAMPLE_PHOTO = path.join(ROOT, "public", "sample-notice.jpg");
const PHONE = { viewport: { width: 390, height: 844 }, scale: 2, mobile: true };
const LAPTOP = { viewport: { width: 1280, height: 720 }, scale: 1.5, mobile: false };
const NOW = "?now=13:30"; // the demo clock: half past one, in the middle of the afternoon cut

const SHOTS = {
  // The drawn group chat: the notice arrives as a picture.
  chat: () => record({ name: "chat", outDir: OUT, ...PHONE, fingers: false, start: `${SCENES}/chat.html`, script: async ({ sleep }) => { await sleep(10400); } }),

  // The product on a phone: photo in, area, a job in plain words, plan out.
  "phone-a": () => record({ name: "phone-a", outDir: OUT, ...PHONE, start: `${APP}/${NOW}`,
    script: async ({ page, sleep, mark, at }) => {
      const h = hand(page);
      await h.moveTo(300, 760, 0);
      await at(0.9);
      mark("hero");
      await h.click("#hero-photo", { ms: 550 });
      await at(3.4);
      const [chooser] = await Promise.all([page.waitForEvent("filechooser"), h.click("#photo-choose", { ms: 500 })]);
      await chooser.setFiles(SAMPLE_PHOTO);
      mark("photo-chosen");
      await page.waitForSelector("#areas input", { timeout: 25000 });
      mark("areas");
      await at(9.5);
      await h.scrollToEl("#area-card", { offset: 12, ms: 700 });
      await at(10.6);
      await h.click("#areas label:has-text('Riverside East')", { ms: 450 });
      mark("area-chosen");
      await at(11.8);
      await h.scrollToEl("#jobs-card", { offset: 12, ms: 650 });
      await at(12.6);
      await h.type("#words", "charge the radio 30 min", 12);
      await h.click("#words-add", { ms: 400 });
      mark("job-added");
      await at(14.5);
      await h.scrollToEl("#plan", { offset: 260, ms: 600 });
      await at(15.3);
      await h.click("#plan", { ms: 450 });
      mark("planned");
      await at(18.2);
      await h.scrollToEl("#plan-card", { offset: 10, ms: 600 });
      await at(19.4);
      await h.scrollTo(await page.evaluate(() => scrollY + 330), 1400);
      await at(21.8);
      await h.scrollTo(await page.evaluate(() => scrollY + 380), 1400);
      mark("miss-visible");
      await at(24.0);
      await h.scrollToEl("#notice-card", { offset: 10, ms: 1500 });
      await at(28.2);
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1400 });
      await at(31.9);
    } }),

  // The product on a laptop: why a job did not fit, then the backup that saves it.
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
    script: async ({ page, sleep, mark, at }) => {
      const h = hand(page);
      await h.moveTo(1000, 520, 0);
      await at(1.0);
      mark("plan");
      await h.moveTo(900, 420, 700);
      await h.scrollEl("#plan-card", 700, 1600);
      await at(3.6);
      await h.point(".misses li", { ms: 800, scroll: false });
      mark("miss");
      await at(12.6);
      await h.click(".misses li .btn", { scroll: false, ms: 700 });
      mark("backup-on");
      await at(15.0);
      await h.scrollEl("#plan-card", 120, 1200);
      mark("beans-fit");
      await h.moveTo(1180, 640, 1600);
      await at(20.4);
      await h.click("#backup-plus", { ms: 1000 });
      mark("plus");
      await at(22.8);
      await h.click("#backup-minus", { ms: 600 });
      mark("minus");
      await at(29.6);
    } }),

  // The phone's home screen: the app opens from its icon.
  home: () => record({ name: "home", outDir: OUT, ...PHONE, fingers: false, start: `${SCENES}/home.html`, script: async ({ sleep }) => { await sleep(3500); } }),

  // The phone with no power and no network: the plan is still there; then sharing.
  "phone-c": () => record({ name: "phone-c", outDir: OUT, ...PHONE, start: `${APP}/${NOW}`,
    setup: async ({ page, context }) => {
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
    script: async ({ page, context, sleep, mark, at }) => {
      const h = hand(page);
      await h.moveTo(300, 700, 0);
      await at(0.8);
      mark("saved-open");
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1500 });
      await at(3.4);
      mark("airplane");
      await context.setOffline(true);
      await at(3.9);
      await page.reload();
      await page.waitForSelector("#chart .row-job");
      mark("offline-reloaded");
      await at(4.5);
      await h.scrollTo(0, 700);
      mark("offline-pill");
      await at(5.7);
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1000 });
      mark("right-now");
      await at(11.6);
      await h.scrollToEl("#jobs-card", { offset: 12, ms: 1400 });
      mark("saved-jobs");
      await at(14.2);
      await h.scrollToEl("#forget", { offset: 480, ms: 1500 });
      await at(17.4);
      await h.scrollToEl("#plan-card", { offset: 10, ms: 1100 });
      await at(18.4);
      await h.scrollTo(await page.evaluate(() => document.querySelector("#btn-picture").getBoundingClientRect().top + scrollY - 560), 700);
      await at(19.2);
      await h.click("#btn-picture", { ms: 500 });
      mark("picture");
      await page.waitForSelector("#card-dialog[open]");
      await at(22.6);
      await page.keyboard.press("Escape");
      await at(23.2);
      await h.click("#btn-ics", { ms: 500 });
      mark("calendar");
      await at(25.3);
    } }),

  audience: () => record({ name: "audience", outDir: OUT, ...LAPTOP, fingers: false, start: `${SCENES}/audience.html`, script: async ({ sleep }) => { await sleep(17800); } }),
  planfirst: () => record({ name: "planfirst", outDir: OUT, ...LAPTOP, fingers: false, start: `${SCENES}/planfirst.html`, script: async ({ sleep }) => { await sleep(13100); } }),

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
