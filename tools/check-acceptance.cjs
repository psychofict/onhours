#!/usr/bin/env node
// Checks the acceptance lines of devpost/prd.md against the real page in a headless browser, one line at a time.
//   node tools/check-acceptance.cjs        (the app must be running at APP with the AI reader on; a second copy with no
//                                           AI reader is started here on port 5199 for the "AI off" lines)
// Prints PASS or FAIL for each line, labelled with its line number in prd.md, and exits 1 if any failed.
// A line marked MANUAL needs a person to look at what the script saved.
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");

const APP = process.env.APP || "http://localhost:5174";
const OFF_PORT = process.env.OFF_PORT || "5199";
const OFF = `http://localhost:${OFF_PORT}`;
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_BIN || undefined;
const SAVE = process.env.SAVE_DIR || "/tmp";
let failed = 0;
const check = (line, name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  prd:${line}  ${name}${detail ? `  (${detail})` : ""}`); };
const squash = (s) => String(s).replace(/\s+/g, " ").trim();

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...opts });
  return { ctx, page: await ctx.newPage() };
}
const rows = async (page) => (await page.locator("#chart .row-job").evaluateAll((els) => els.map((e) => [e.querySelector(".row-name").innerText.replace(/\s+/g, " ").replace(/(Must do|Done)/g, "").trim(), e.querySelector(".row-time").innerText.trim()])));
async function sampleDay(page, { backup = 0, now } = {}) {
  await page.goto(`${APP}/${now ? `?now=${now}` : ""}`);
  await page.waitForTimeout(600);
  await page.click("#hero-sample");
  await page.waitForSelector("#chart .row-job");
  for (let i = 0; i < backup * 2; i++) await page.click("#backup-plus");
  await page.waitForTimeout(900);
}

(async () => {
  const off = spawn("node", ["server/index.js"], { cwd: ROOT, env: { PATH: process.env.PATH, PORT: OFF_PORT }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    // ---- Reading the notice, with the AI reader on
    {
      const { ctx, page } = await fresh(browser);
      await page.goto(APP);
      await page.click("#photo-sample");
      await page.waitForSelector("#areas input", { timeout: 40000 });
      const names = await page.locator("#areas label").allInnerTexts();
      await page.click("#areas label:has-text('Riverside East')");
      const offLine = squash(await page.locator("#off-line").innerText());
      check(39, "the sample photo gives the six areas, Riverside East off 05:00–09:00, 13:00–15:00, 20:00–23:00", names.length === 6 && offLine.includes("05:00–09:00, 13:00–15:00, 20:00–23:00"), `${names.length} areas; ${offLine}`);
      check(50, "choosing Riverside East shows its times", offLine.includes("Off 05:00–09:00, 13:00–15:00, 20:00–23:00"), offLine);
      await ctx.close();
    }
    {
      const { ctx, page } = await fresh(browser);
      await page.goto(APP);
      await page.click("#photo-sample-2");
      await page.waitForSelector("#areas input", { timeout: 40000 });
      const names = (await page.locator("#areas label").allInnerTexts()).map(squash);
      const want = { Mapleton: "Off 00:00–02:00, 22:00–24:00", "Ridgeway Estate": "Off 00:00–02:00, 22:00–24:00", "Old Quarry": "Off 00:00–01:00, 16:00–18:30, 23:00–24:00", "Station Road": "Off 00:00–01:00, 16:00–18:30, 23:00–24:00", Lakeview: "Off 06:00–08:30" };
      let ok = names.length === 5 && !names.some((n) => /Hospital/.test(n));
      const got = {};
      for (const [n, t] of Object.entries(want)) { await page.click(`#areas label:has-text('${n}')`); got[n] = squash(await page.locator("#off-line").innerText()); if (!got[n].includes(t)) ok = false; }
      check(40, "the messier photo gives five areas with the right times, and not Hospital Hill", ok, JSON.stringify(got).slice(0, 160));
      await ctx.close();
    }
    // ---- When the AI fails or answers badly
    {
      const { ctx, page } = await fresh(browser);
      await page.route("**/api/read-notice", (r) => r.fulfill({ status: 502, contentType: "application/json", body: "{}" }));
      await page.goto(APP);
      await page.click("#tab-text"); await page.click("#use-sample"); await page.click("#read");
      await page.waitForSelector("#areas input");
      const note = squash(await page.locator("#reader-note").innerText());
      check(43, "when the AI fails, the rules read the text and the line says so", (await page.locator("#areas input").count()) === 6 && /built-in rules/.test(note) && /unavailable/.test(note), note);
      await page.click("#tab-photo");
      await page.click("#photo-sample");
      await page.waitForFunction(() => /couldn't read that photo/.test(document.getElementById("reader-note").innerText), null, { timeout: 15000 });
      const note2 = squash(await page.locator("#reader-note").innerText());
      check(43, "a photo that cannot be read says \"I couldn't read that photo\" and offers to try again or paste the text", /I couldn't read that photo\. Try again, or paste the text\./.test(note2), note2);
      await ctx.close();
    }
    // ---- Offline
    {
      const { ctx, page } = await fresh(browser);
      await sampleDay(page, { backup: 1, now: "13:30" });
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.waitForTimeout(1500);
      await page.goto(`${APP}/?now=13:30`);
      await page.waitForSelector("#chart .row-job");
      await ctx.setOffline(true);
      await page.reload();
      await page.waitForSelector("#chart .row-job");
      const r = await rows(page);
      const now = squash(await page.locator("#now-card").innerText());
      check(99, "offline, reloading shows the same plan and Right now", r.length === 5 && /Power is off until 15:00/.test(now) && /Next: Iron school uniforms at 15:00/.test(now), `${r.length} jobs; ${now.slice(0, 80)}`);
      await page.click("#tab-text"); await page.click("#use-sample"); await page.click("#read");
      await page.waitForSelector("#areas input");
      const note = squash(await page.locator("#reader-note").innerText());
      await page.click("#tab-photo");
      const priv = squash(await page.locator("#panel-photo .privacy").innerText());
      check(44, "offline, text reading still works and photo reading says it needs a connection", (await page.locator("#areas input").count()) === 6 && /built-in rules/.test(note) && /needs a connection/.test(priv) && (await page.locator("#photo-choose").isDisabled()), `${note}; ${priv}`);
      await ctx.setOffline(false);
      await page.click("#forget");
      check(100, "Forget this device returns the page to its first-visit state", !(await page.locator("#plan-body").isVisible()) && (await page.locator("#areas input").count()) === 0 && (await page.evaluate(() => !localStorage.getItem("onhours.v2"))));
      await ctx.close();
    }
    // ---- The backup stepper, by keyboard
    {
      const { ctx, page } = await fresh(browser);
      await page.goto(APP);
      await page.focus("#backup-plus");
      await page.keyboard.press("Enter");
      const v1 = squash(await page.locator("#backup-value").innerText());
      await page.keyboard.press("Space");
      const v2 = squash(await page.locator("#backup-value").innerText());
      const live = await page.locator("#backup-value").getAttribute("aria-live");
      check(51, "the backup stepper works with the keyboard and announces its value", v1 === "30 min" && v2 === "1 h" && live === "polite", `${v1}, ${v2}, aria-live=${live}`);
      await ctx.close();
    }
    // ---- The jobs list
    {
      const { ctx, page } = await fresh(browser);
      await sampleDay(page);
      const before = await rows(page);
      await page.locator("#jobs li.job").first().locator("[name=hours]").fill("0");
      await page.locator("#jobs li.job").first().locator("[name=minutes]").fill("30");
      await page.waitForTimeout(500);
      const afterEdit = await rows(page);
      await page.locator("#jobs li.job").nth(1).locator(".remove").click();
      await page.waitForTimeout(500);
      const afterRemove = await rows(page);
      await page.fill("#words", "charge the radio 30 min"); await page.click("#words-add");
      await page.waitForTimeout(500);
      const afterAdd = await rows(page);
      check(57, "adding, editing and removing a job changes the next plan", JSON.stringify(before) !== JSON.stringify(afterEdit) && afterRemove.length === afterEdit.length - 1 && afterAdd.length === afterRemove.length + 1, `${before.length} -> edit ${afterEdit.length} -> remove ${afterRemove.length} -> add ${afterAdd.length}`);
      await page.fill("#words", "iron 45 min, pump water 1 h, charge phones 2 hours"); await page.click("#words-add");
      const list = await page.locator("#jobs li.job").evaluateAll((els) => els.slice(-3).map((e) => [e.querySelector("[name=name]").value, Number(e.querySelector("[name=hours]").value) * 60 + Number(e.querySelector("[name=minutes]").value)]));
      check(58, "\"iron 45 min, pump water 1 h, charge phones 2 hours\" adds three jobs of 45, 60 and 120 minutes", JSON.stringify(list.map((x) => x[1])) === "[45,60,120]", JSON.stringify(list));
      await page.click("#add-job");
      await page.locator("#jobs li.job").last().locator("[name=minutes]").fill("20");
      await page.click("#add-job");
      await page.locator("#jobs li.job").last().locator("[name=name]").fill("A job with no time");
      await page.waitForTimeout(600);
      const misses = squash(await page.locator("#misses").innerText());
      check(59, "a job with no name or no time is skipped with a short note", /No name, so it was left out/.test(misses) && /No time given, so it was left out/.test(misses), misses.slice(0, 120));
      await ctx.close();
    }
    // ---- Planning the sample day
    {
      const { ctx, page } = await fresh(browser);
      await sampleDay(page);
      const r = await rows(page);
      const misses = squash(await page.locator("#misses").innerText());
      const times = Object.fromEntries(r.map(([n, t]) => [n, t]));
      const ok0 = times["Sew the choir order"] === "09:00–10:30" && times["Pump water to the tank"] === "10:30–11:30" && times["Charge phones and the power bank"] === "11:30–12:30" && times["Iron school uniforms"] === "15:00–15:45" && r.length === 4 && /Slow-cook the beans/.test(misses) && /Needs 5 h in one go; the longest powered stretch left is 4 h 15 min\. This job can run on backup\. Set your backup hours to try it\./.test(misses);
      check(70, "with no backup: four jobs placed, and the beans under Didn't fit with their reason", ok0, JSON.stringify(times));
      await page.click(".misses li .btn");
      await page.waitForTimeout(900);
      const r2 = await rows(page);
      const beans = r2.find(([n]) => /Slow-cook/.test(n));
      const detail = squash(await page.locator("#chart").innerText());
      const m2 = squash(await page.locator("#misses").innerText());
      check(71, "with 1 hour of backup the beans run 15:45–20:45, on backup 20:00–20:45, and nothing is under Didn't fit", r2.length === 5 && beans && beans[1] === "15:45–20:45" && /On backup 20:00–20:45/.test(detail) && /Everything fits today/.test(m2), `${beans}`);
      // the revised notice, with 1 hour of backup
      await page.click("#tab-text"); await page.click("#use-revised"); await page.click("#read");
      await page.waitForSelector("#changes-card:not([hidden])", { timeout: 40000 });
      const card = squash(await page.locator("#changes-card").innerText());
      check(80, "the card shows the old and new cuts", card.includes("Power off was 05:00–09:00, 13:00–15:00, 20:00–23:00. Now 05:00–09:00, 13:00–16:00, 20:00–23:00."), card.slice(0, 140));
      check(81, "the iron moves from 15:00–15:45 to 16:00–16:45 because power is now off 13:00–16:00", /Iron school uniforms 15:00–15:45 → 16:00–16:45 Power is now off 13:00–16:00, which covers its old time\./.test(card), card.slice(140, 300));
      check(82, "the beans no longer fit, with the reason", /Slow-cook the beans No longer fits Needs 5 h in one go\. Even with 1 h of backup left, the longest run you can cover is 4 h 15 min\./.test(card));
      const r3 = await rows(page);
      check(83, "the plan below the card shows the new times", r3.some(([n, t]) => /Iron/.test(n) && t === "16:00–16:45") && !r3.some(([n]) => /Slow-cook/.test(n)), JSON.stringify(r3.map((x) => x[1])));
      await page.click("#read");
      await page.waitForTimeout(2500);
      check(84, "reading the same notice twice shows no card", await page.locator("#changes-card").isHidden());
      await ctx.close();
    }
    {
      const { ctx, page } = await fresh(browser);
      await sampleDay(page);
      await page.click("#tab-text"); await page.click("#use-revised"); await page.click("#read");
      await page.waitForSelector("#changes-card:not([hidden])", { timeout: 40000 });
      const n = await page.locator("#changes-card li").count();
      const card = squash(await page.locator("#changes-card").innerText());
      check(83, "with no backup set, only the iron moves", n === 1 && /Iron school uniforms/.test(card), `${n} item(s)`);
      await ctx.close();
    }
    // ---- Right now
    for (const [now, wants, line] of [["13:30", ["Power is off until 15:00", "Next: Iron school uniforms at 15:00"], 90], ["20:30", ["Power is off until 23:00", "On backup: Slow-cook the beans until 20:45", "Nothing more is planned today"], 91], ["08:00", ["Power is off until 09:00", "Next: Sew the choir order at 09:00"], 92]]) {
      const { ctx, page } = await fresh(browser);
      await sampleDay(page, { backup: 1, now });
      const t = squash(await page.locator("#now-card").innerText());
      check(line, `at ${now} with the sample plan and 1 hour of backup`, wants.every((w) => t.includes(w)), t.slice(0, 120));
      await ctx.close();
    }
    // ---- Sharing, with the AI reader off, as a reviewer with a clean checkout would find it
    {
      const { ctx, page } = await fresh(browser);
      await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: OFF });
      await page.goto(OFF);
      await page.waitForTimeout(800);
      const status = await page.evaluate(() => fetch("/api/status").then((r) => r.json()));
      await page.click("#tab-photo");
      const priv = squash(await page.locator("#panel-photo .privacy").innerText());
      check(42, "with the AI off the Photo tab says photo reading needs the AI reader and points to the Text tab", status.ai === false && /Photo reading needs the AI reader/.test(priv) && /Text tab/.test(priv) && (await page.locator("#photo-choose").isDisabled()), priv);
      await page.click("#tab-text"); await page.click("#use-sample"); await page.click("#read");
      await page.waitForSelector("#areas input");
      const note = squash(await page.locator("#reader-note").innerText());
      check(41, "the sample text gives the six areas with no AI configured, and says \"Read by built-in rules\"", (await page.locator("#areas input").count()) === 6 && /Read by built-in rules/.test(note), note);
      await page.click("#areas label:has-text('Riverside East')");
      await page.click("#plan");
      await page.waitForSelector("#chart .row-job");
      await page.click(".misses li .btn");
      await page.waitForTimeout(800);
      const ok1 = (await rows(page)).length === 5;
      await page.click("#btn-picture");
      await page.waitForSelector("#card-dialog[open]");
      await page.waitForTimeout(700);
      const dim = await page.evaluate(() => { const c = document.getElementById("card-canvas"); return [c.width, c.height]; });
      fs.writeFileSync(path.join(SAVE, "onhours-plan-picture-check.png"), Buffer.from((await page.evaluate(() => document.getElementById("card-canvas").toDataURL("image/png"))).split(",")[1], "base64"));
      await page.keyboard.press("Escape");
      const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#btn-ics")]);
      const ics = fs.readFileSync(await dl.path(), "utf8");
      const starts = [...ics.matchAll(/DTSTART:(\d{8})T(\d{6})/g)].map((m) => [m[1], m[2].slice(0, 4)]);
      const d = new Date(); const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const wantTimes = ["0900", "1030", "1130", "1500", "1545"];
      const jobStarts = starts.map((s) => s[1]);
      check(109, "the calendar file has an event for every job at the plan's time on the chosen day, with a ten-minute reminder", wantTimes.every((t) => jobStarts.includes(t)) && starts.every((s) => s[0] === today) && (ics.match(/TRIGGER:-PT10M/g) || []).length === (ics.match(/BEGIN:VEVENT/g) || []).length, `${starts.length} events on ${today}`);
      await page.click("#copy");
      await page.waitForTimeout(600);
      const copied = squash(await page.locator("#copied").innerText());
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      check(110, "Copy plan shows \"Copied\" and the clipboard holds the plan text", /Copied/.test(copied) && /^Power plan for Riverside East/.test(clip) && /09:00–10:30  Sew the choir order/.test(clip), copied);
      check(101, "with no AI configured the sample day, text reading, plan, backup, picture, calendar and copy all work", ok1 && dim[0] === 1080 && dim[1] === 1350 && starts.length > 0 && clip.length > 50, `${dim.join("x")}`);
      check(108, `MANUAL: the plan picture is 1080 x 1350; open ${path.join(SAVE, "onhours-plan-picture-check.png")} and read it against the plan`, dim[0] === 1080 && dim[1] === 1350, dim.join("x"));
      await ctx.close();
    }
  } finally {
    await browser.close();
    off.kill();
  }
  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
