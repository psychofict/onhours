#!/usr/bin/env node
// Takes the real screenshots the gallery images are made from, with the running app (AI reader on):
//   node tools/gallery/shoot.cjs      -> submission/work/gallery-src/*.png
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");

const APP = process.env.APP || "http://localhost:5174";
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "submission", "work", "gallery-src");
const CHROME = process.env.CHROME_BIN || undefined;
const PHOTO = path.join(ROOT, "public", "sample-notice.jpg");
const NOW = "?now=13:30";
fs.mkdirSync(OUT, { recursive: true });

async function laptop(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${APP}/${NOW}`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "laptop-hero.png") });
  await page.click("#hero-sample");
  await page.waitForSelector("#chart .row-job");
  await page.fill("#words", "charge the radio 30 min");
  await page.click("#words-add");
  await page.waitForTimeout(1500);
  const lift = async () => { await page.addStyleTag({ content: ".plan{max-height:none!important;position:static!important;overflow:visible!important}" }); await page.waitForTimeout(400); };
  await page.locator(".hero-example").screenshot({ path: path.join(OUT, "hero-example.png") });
  await page.evaluate(() => { document.querySelector("#area-card").scrollIntoView({ behavior: "instant", block: "start" }); window.scrollBy(0, -16); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "laptop-plan-before.png") });
  await lift();
  // no backup: the miss, with its reason and the button
  const region = async (selectors, file, pad = 14) => {
    await page.locator(selectors[0]).first().evaluate((el) => { el.scrollIntoView({ behavior: "instant", block: "start" }); window.scrollBy(0, -40); });
    await page.waitForTimeout(300);
    const boxes = [];
    for (const sel of selectors) boxes.push(await page.locator(sel).last().boundingBox());
    const x0 = Math.min(...boxes.map((b) => b.x)) - pad, y0 = Math.min(...boxes.map((b) => b.y)) - pad;
    const x1 = Math.max(...boxes.map((b) => b.x + b.width)) + pad, y1 = Math.max(...boxes.map((b) => b.y + b.height)) + pad;
    await page.screenshot({ path: file, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
  };
  await region(["#misses"], path.join(OUT, "misses-before.png"));
  await page.locator("#plan-card").screenshot({ path: path.join(OUT, "plan-card-before.png") });
  await page.click(".misses li .btn");
  await page.waitForTimeout(1500);
  await region(["#chart .row-job:last-child", "#misses"], path.join(OUT, "beans-after.png"));
  await page.locator("#plan-card").screenshot({ path: path.join(OUT, "plan-card.png") });
  // the plan picture, from the page's own canvas
  await page.evaluate(() => document.getElementById("btn-picture").click());
  await page.waitForSelector("#card-dialog[open]");
  await page.waitForTimeout(900);
  const data = await page.evaluate(() => document.getElementById("card-canvas").toDataURL("image/png"));
  fs.writeFileSync(path.join(OUT, "plan-picture.png"), Buffer.from(data.split(",")[1], "base64"));
  await ctx.close();
}

async function phone(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${APP}/${NOW}`);
  await page.waitForTimeout(800);
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#photo-choose")]);
  await chooser.setFiles(PHOTO);
  await page.waitForSelector("#areas input", { timeout: 25000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById("notice-card").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "phone-photo.png") });
  await page.click("#areas label:has-text('Riverside East')");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("area-card").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "phone-area.png") });
  await page.fill("#words", "charge the radio 30 min");
  await page.click("#words-add");
  await page.click("#backup-plus"); await page.click("#backup-plus");
  await page.click("#plan");
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById("plan-card").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "phone-plan.png") });
  // offline, from the saved household
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForTimeout(1200);
  await page.goto(`${APP}/${NOW}`);
  await page.waitForSelector("#chart .row-job");
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("#chart .row-job");
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById("plan-card").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "phone-offline.png") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "phone-offline-top.png") });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  await laptop(browser);
  await phone(browser);
  await browser.close();
  console.log(fs.readdirSync(OUT).join("\n"));
})().catch((e) => { console.error(e); process.exit(1); });
