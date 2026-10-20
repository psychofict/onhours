#!/usr/bin/env node
// Lays out the six gallery images (1800 x 1200, 3:2) from the real screenshots:  node tools/gallery/make.cjs
// Run shoot.cjs first, and `node tools/video/serve.cjs` must be running.
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "submission", "gallery");
const SCENES = process.env.SCENES || "http://localhost:5192";
const CHROME = process.env.CHROME_BIN || undefined;
const NAMES = ["01-cover", "02-photo-in", "03-plan-out", "04-says-why", "05-what-moved", "06-offline"];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await (await browser.newContext({ viewport: { width: 1800, height: 1200 } })).newPage();
  for (let i = 0; i < NAMES.length; i++) {
    await page.goto(`${SCENES}/gallery/gallery.html?n=${i + 1}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${NAMES[i]}.jpg`), type: "jpeg", quality: 92 });
  }
  await browser.close();
  console.log(fs.readdirSync(OUT).map((f) => `${f} ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`).join("\n"));
})().catch((e) => { console.error(e); process.exit(1); });
