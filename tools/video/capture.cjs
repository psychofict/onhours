// Records a scripted browser session as crisp frames, straight from the page's own screencast.
// (The browser's built-in video recorder keeps only CSS-pixel size; this keeps device pixels, so a phone
// at 2x or a laptop at 1.5x stays sharp.) Used by record.cjs. Needs playwright-core and a Chromium.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PLAYWRIGHT = process.env.PLAYWRIGHT_CORE || "/home/eben/.nvm/versions/node/v22.20.0/lib/node_modules/@playwright/cli/node_modules/playwright-core";
const CHROME = process.env.CHROME_BIN || "/home/eben/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const { chromium } = require(PLAYWRIGHT);

const CURSOR = `(() => {
  const make = () => {
    if (document.getElementById("__finger")) return;
    const c = document.createElement("div");
    c.id = "__finger";
    c.style.cssText = "position:fixed;z-index:2147483647;left:-50px;top:-50px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(28,27,26,.6);box-shadow:0 4px 14px rgba(28,27,26,.25);pointer-events:none;transition:transform .12s ease,background .2s ease;";
    document.documentElement.append(c);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => { c.style.transform = "scale(.72)"; c.style.background = "rgba(42,114,222,.4)"; }, true);
    addEventListener("mouseup", () => { c.style.transform = ""; c.style.background = "rgba(255,255,255,.55)"; }, true);
  };
  if (document.documentElement) make(); else addEventListener("DOMContentLoaded", make);
})();`;

/** Opens a browser, runs `script(ctx)` while capturing, and writes <out>.mp4 at 30 fps. */
async function record({ name, outDir, viewport, scale = 1, mobile = false, fingers = true, script, start = "about:blank", init = [] }) {
  const dir = path.join(outDir, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference", acceptDownloads: true });
  if (fingers) await context.addInitScript(CURSOR);
  for (const s of init) await context.addInitScript(s);
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  const frames = [];
  const events = [];
  let n = 0;
  let t0 = null;
  client.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `f${String(n++).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    if (t0 === null) t0 = metadata.timestamp;
    frames.push({ file, t: metadata.timestamp - t0 });
    client.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  const W = Math.round(viewport.width * scale), H = Math.round(viewport.height * scale);
  await page.goto(start);
  await client.send("Page.startScreencast", { format: "jpeg", quality: 94, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const wall0 = Date.now();
  let wallEnd = 0;
  const mark = (label) => { events.push({ label, t: (Date.now() - wall0) / 1000 }); };
  try {
    await script({ page, context, client, mark, sleep: (ms) => page.waitForTimeout(ms) });
  } finally {
    await page.waitForTimeout(400);
    wallEnd = (Date.now() - wall0) / 1000;
    await client.send("Page.stopScreencast").catch(() => {});
  }
  await context.close();
  await browser.close();
  // frames -> constant 30 fps video. The wall clock of the first frame is time zero.
  const list = [];
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : Math.max(wallEnd, f.t + 0.4);
    list.push(`file '${f.file}'`, `duration ${Math.max(next - f.t, 0.001).toFixed(4)}`);
  });
  list.push(`file '${frames[frames.length - 1].file}'`);
  const listFile = path.join(dir, "frames.txt");
  fs.writeFileSync(listFile, list.join("\n"));
  const out = path.join(outDir, `${name}.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-movflags", "+faststart", out]);
  const total = Math.max(wallEnd, frames.length ? frames[frames.length - 1].t + 0.4 : 0);
  fs.writeFileSync(path.join(outDir, `${name}.events.json`), JSON.stringify({ name, frames: frames.length, seconds: +total.toFixed(2), width: W, height: H, events }, null, 1));
  // the frames are only needed to build the video
  for (const f of frames) fs.rmSync(f.file, { force: true });
  return { out, seconds: total, width: W, height: H, events };
}

/** A pointer that moves like a hand: eased steps, a short pause, then the click or tap. */
function hand(page) {
  let x = 200, y = 200;
  const ease = (t) => t * t * (3 - 2 * t);
  async function moveTo(tx, ty, ms = 600) {
    const steps = Math.max(8, Math.round(ms / 16));
    const sx = x, sy = y;
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      await page.mouse.move(sx + (tx - sx) * k, sy + (ty - sy) * k);
      await page.waitForTimeout(ms / steps);
    }
    x = tx; y = ty;
  }
  async function point(selector, { dx = 0, dy = 0, ms = 650, scroll = true } = {}) {
    const loc = page.locator(selector).first();
    if (scroll) await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    await moveTo(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, ms);
    return b;
  }
  async function click(selector, opts = {}) {
    await point(selector, opts);
    await page.waitForTimeout(120);
    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
  }
  async function type(selector, text, perChar = 55) {
    await click(selector);
    for (const ch of text) { await page.keyboard.type(ch); await page.waitForTimeout(perChar + Math.random() * 25); }
  }
  async function scrollTo(y, ms = 900) {
    await page.evaluate(([top, dur]) => new Promise((resolve) => {
      const from = scrollY, t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
        scrollTo(0, from + (top - from) * e);
        k < 1 ? requestAnimationFrame(step) : resolve();
      };
      requestAnimationFrame(step);
    }), [y, ms]);
  }
  return { moveTo, point, click, type, scrollTo };
}

module.exports = { record, hand };
