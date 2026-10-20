#!/usr/bin/env node
// Walks the whole journey in a headless browser at 1280 and 390 px wide and checks what the PRD promises.
//   node tools/check-journey.cjs        (the app must be running; with the AI reader on, the photo step is checked too)
// Prints PASS or FAIL for each check and exits 1 if any failed.
const path = require("path");
const fs = require("fs");
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");

const APP = process.env.APP || "http://localhost:5174";
const ROOT = path.resolve(__dirname, "..");
const PHOTO = path.join(ROOT, "public", "sample-notice.jpg");
const CHROME = process.env.CHROME_BIN || undefined;
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };

async function journey(browser, label, opts) {
  console.log(`\n== ${label}`);
  const ctx = await browser.newContext({ ...opts, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${APP}/?now=13:30`);
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => fetch("/api/status").then((r) => r.json()));
  const geom = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, bg: getComputedStyle(document.body).backgroundColor }));
  check("no horizontal scrolling", geom.over <= 0, `overflow ${geom.over}px`);
  check("page background is light", /rgb\(24[0-9], 2[34][0-9], 2[0-9][0-9]\)/.test(geom.bg), geom.bg);
  check("the example day shows five jobs", (await page.locator("#hero-chart .row-job").count()) === 5);

  if (st.vision) {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#photo-choose")]);
    await chooser.setFiles(PHOTO);
    await page.waitForSelector("#areas input", { timeout: 30000 });
    check("the photo gives six areas", (await page.locator("#areas input").count()) === 6);
    check("the note says it was read from the photo by AI", /Read from the photo by AI/.test(await page.locator("#reader-note").innerText()));
    check("the photo's text is in the Text tab", (await page.inputValue("#notice")).includes("POWER SUPPLY NOTICE"));
  } else {
    await page.click("#tab-text");
    await page.click("#use-sample");
    await page.click("#read");
    await page.waitForSelector("#areas input");
    check("(no vision model) the sample text gives six areas", (await page.locator("#areas input").count()) === 6);
  }
  await page.click("#areas label:has-text('Riverside East')");
  check("the area's times are shown", (await page.locator("#off-line").innerText()).replace(/\s+/g, " ").includes("05:00–09:00, 13:00–15:00, 20:00–23:00"));

  await page.fill("#words", "charge the radio 30 min");
  await page.click("#words-add");
  check("a job typed in plain words is added", (await page.locator("#jobs li.job").count()) === 6);

  await page.click("#plan");
  await page.waitForSelector("#chart .row-job");
  const rows = await page.locator("#chart .row-name").allInnerTexts();
  const times = await page.locator("#chart .row-time").allInnerTexts();
  check("five jobs are placed without backup", rows.length === 5, rows.join(" | "));
  check("the sewing order sits at 09:00–10:30", times[0] === "09:00–10:30", times.join(", "));
  const miss = await page.locator("#misses").innerText();
  check("the beans miss with the 4 h 15 min reason", /Slow-cook the beans/.test(miss) && /4\s?h\s?15\s?min/.test(miss));
  const now = await page.locator("#now-card").innerText();
  check("Right now says power is off until 15:00 and the iron is next", /Power is off until 15:00/.test(now) && /Iron school uniforms at 15:00/.test(now));

  await page.click(".misses li .btn");
  await page.waitForTimeout(900);
  check("with 1 hour of backup everything fits", /Everything fits today/.test(await page.locator("#misses").innerText()));
  const beans = await page.locator("#chart .row-job").last().innerText();
  check("the beans run 15:45–20:45, on backup 20:00–20:45", /15:45–20:45/.test(beans) && /On backup 20:00–20:45/.test(beans), beans.replace(/\s+/g, " "));

  await page.click("#btn-picture");
  await page.waitForSelector("#card-dialog[open]");
  const dim = await page.evaluate(() => { const c = document.getElementById("card-canvas"); return [c.width, c.height]; });
  check("the plan picture is 1080 x 1350", dim[0] === 1080 && dim[1] === 1350, dim.join("x"));
  await page.keyboard.press("Escape");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#btn-ics")]);
  const ics = fs.readFileSync(await dl.path(), "utf8");
  check("the calendar file has an event for every job and cut", (ics.match(/BEGIN:VEVENT/g) || []).length === 5 + 3 + 1, `${(ics.match(/BEGIN:VEVENT/g) || []).length} events, ${dl.suggestedFilename()}`);

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForTimeout(1500);
  await page.goto(`${APP}/?now=13:30`);
  await page.waitForSelector("#chart .row-job");
  check("coming back restores the plan from the saved household", (await page.locator("#chart .row-job").count()) === 5 || (await page.locator("#chart .row-job").count()) === 6);
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("#chart .row-job");
  check("offline: the plan is still there", (await page.locator("#chart .row-job").count()) >= 5);
  check("offline: the Offline note shows", await page.locator("#net-pill").isVisible());
  check("offline: Right now still answers", /Power is off until 15:00/.test(await page.locator("#now-card").innerText()));
  await ctx.setOffline(false);

  // A revised notice arrives after the household was restored: the page says what moved and why, and the plan follows it.
  await page.click("#tab-text");
  await page.click("#use-revised");
  await page.click("#read");
  await page.waitForSelector("#changes-card:not([hidden])", { timeout: 30000 });
  const changes = (await page.locator("#changes-card").innerText()).replace(/\s+/g, " ");
  check("a revised notice shows the card with the new cuts", /The notice changed/i.test(changes) && /13:00–16:00/.test(changes), changes.slice(0, 120));
  check("the card says the iron moved to 16:00 and why", /Iron school uniforms/.test(changes) && /16:00–16:45/.test(changes) && /covers its old time/.test(changes));
  check("the card says the beans no longer fit", /Slow-cook the beans/.test(changes) && /No longer fits/.test(changes));
  check("the plan follows the revised notice", /16:00–16:45/.test(await page.locator("#chart").innerText()));
  check("the change is announced to screen readers", /The notice changed/.test(await page.locator("#plan-live").innerText()));
  await page.locator("#changes-card .btn").click();
  check("Got it closes the card", await page.locator("#changes-card").isHidden());

  await page.click("#forget");
  check("Forget this device returns to the first visit", !(await page.locator("#plan-body").isVisible()) && (await page.locator("#areas input").count()) === 0);
  check("no errors in the console", errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  await journey(browser, "laptop, 1280 x 720", { viewport: { width: 1280, height: 720 } });
  await journey(browser, "phone, 390 x 844", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
